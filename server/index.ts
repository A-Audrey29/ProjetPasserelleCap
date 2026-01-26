// Load environment variables FIRST (before any other imports)
// dotenv-flow will load .env, .env.local, .env.{NODE_ENV}, .env.{NODE_ENV}.local
// in order of priority, with Replit Secrets taking precedence over file-based variables
import 'dotenv/config'; // Cette ligne charge le fichier .env dans process.env
import fetch from 'node-fetch';
globalThis.fetch = fetch;

import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logError } from "./utils/errorLogger";
import { getErrorMessage, getErrorCode, ErrorCodes } from "./utils/errorCodes";
import { requireAuth } from "./middleware/rbac";
import { protectUploadAccess } from "./middleware/uploadSecurity";
import { storage } from "./storage";
import { downloadFile, type UploadKind } from "./utils/ftpsUpload";

const app = express();

// Trust proxy - necessary for rate limiting to work correctly in proxied environments (Replit, etc.)
app.set("trust proxy", 1);

// Helmet security headers - CSP enabled in production for better security
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production", // Enable CSP in production only
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration - flexible for dev and production
// En dev: accepte toutes les origines
// En prod: vérifie les origines exactes listées dans CORS_ORIGIN (séparées par virgules)
// Autorise aussi Origin absent pour les appels serveur-à-serveur (Make, webhooks, etc.)
const corsOptions: cors.CorsOptions = {
  origin:
    process.env.NODE_ENV === "development"
      ? true
      : (origin, callback) => {
          // Autoriser les appels sans Origin (serveur-à-serveur: Make, cron, webhooks)
          if (!origin) return callback(null, true);

          const allowedOrigins = (process.env.CORS_ORIGIN || "")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean);

          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`Origine non autorisée par CORS: ${origin}`));
          }
        },
  credentials: true,
};

app.use(cors(corsOptions));

// Cookie parser - MUST be before any route that uses req.cookies
app.use(cookieParser());

// FTPS Proxy for uploaded files - streams files from o2switch via FTPS
// Regex to validate filename: UUID.pdf or similar safe patterns
const SAFE_FILENAME_REGEX = /^[a-f0-9-]{8,64}\.pdf$/i;

app.get("/uploads/:subfolder/:filename", requireAuth, protectUploadAccess, async (req: Request, res: Response) => {
  const { subfolder, filename } = req.params;

  // Validate subfolder (only navettes or bilans allowed)
  if (subfolder !== "navettes" && subfolder !== "bilans") {
    return res.status(400).json({ message: "Dossier invalide" });
  }

  // Validate filename against path traversal and accept only safe patterns
  if (!filename || !SAFE_FILENAME_REGEX.test(filename)) {
    return res.status(400).json({ message: "Nom de fichier invalide" });
  }

  try {
    // Log FTP configuration for debugging
    const ftpBaseDir = process.env.FTP_BASE_DIR || '/uploads';
    const expectedRemotePath = `${ftpBaseDir}/${subfolder}/${filename}`.replace(/\/{2,}/g, '/');
    log(`[FTPS] FTP_BASE_DIR: ${ftpBaseDir}`);
    log(`[FTPS] Expected remote path: ${expectedRemotePath}`);
    log(`[FTPS] Attempting download: ${subfolder}/${filename}`);

    const result = await downloadFile(subfolder as UploadKind, filename);

    if (!result.success) {
      // Handle specific error codes
      if (result.errorCode === "NOT_FOUND") {
        log(`[FTPS] File not found on remote server: ${subfolder}/${filename}`);
        return res.status(404).json({ message: "Fichier introuvable" });
      }
      if (result.errorCode === "TIMEOUT") {
        log(`[FTPS] Timeout downloading: ${subfolder}/${filename}`);
        return res.status(504).json({ message: "Timeout serveur de fichiers" });
      }
      if (result.errorCode === "CONNECTION_ERROR") {
        log(`[FTPS] Connection error: ${subfolder}/${filename}`);
        return res.status(503).json({ message: "Serveur de fichiers indisponible" });
      }
      log(`[FTPS] Unknown error downloading: ${subfolder}/${filename}`);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    // Set headers for PDF streaming
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    if (result.size) {
      res.setHeader("Content-Length", result.size);
    }

    // Handle client disconnect to cleanup FTPS connection
    // Only destroy stream on abnormal termination (client abort), not on normal completion
    let streamEnded = false;
    let pipeFinished = false;
    
    const cleanup = (reason: string) => {
      if (streamEnded) return;
      streamEnded = true;
      log(`FTPS cleanup for ${filename}: ${reason}`);
      if (!pipeFinished && result.stream?.destroy) {
        result.stream.destroy();
      }
    };

    // Only cleanup on client abort (before stream completes)
    req.on("aborted", () => cleanup("client aborted"));
    
    // Track normal pipe completion
    result.stream!.on("end", () => {
      pipeFinished = true;
    });

    // Pipe the stream to response
    result.stream!.pipe(res);

    result.stream!.on("error", (err) => {
      log(`FTPS stream error for ${filename}: ${err.message}`);
      cleanup("stream error");
      if (!res.headersSent) {
        res.status(500).json({ message: "Erreur de transfert" });
      }
    });

  } catch (error: any) {
    log(`FTPS proxy error for ${filename}: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
});

// Serve legal documents (markdown files) - public access
app.use("/legal", express.static(path.join(process.cwd(), "legal")));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling middleware - differentiate between dev and prod
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === "development";

    // Determine error code - use custom code if provided, otherwise infer from status
    const errorCode = err.code || getErrorCode(status);

    // Log error with full details (always logged server-side)
    logError(err, errorCode, status, req, err.details);

    // Prepare response based on environment
    if (isDevelopment) {
      // Development: Full details for debugging
      res.status(status).json({
        error: err.message || getErrorMessage(status),
        code: errorCode,
        statusCode: status,
        details: err.details || err.message,
        stack: err.stack,
      });
    } else {
      // Production: Sanitized response, no technical details
      res.status(status).json({
        error: getErrorMessage(status),
        code: errorCode,
        statusCode: status,
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 3000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // changement du port 3000 pour 3000 pour le faire tourner en local
  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0", // changement d'adresse pour le faire tourner en local
      // host: "127.0.0.1",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  // Purge idempotency keys older than 24 hours - run every hour
  const PURGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  const PURGE_HOURS_OLD = 24;
  
  setInterval(async () => {
    try {
      const purgedCount = await storage.purgeOldIdempotencyKeys(PURGE_HOURS_OLD);
      if (purgedCount > 0) {
        log(`[IdempotencyKeys] Purged ${purgedCount} expired keys (older than ${PURGE_HOURS_OLD}h)`);
      }
    } catch (err) {
      console.error("[IdempotencyKeys] Purge error:", err);
    }
  }, PURGE_INTERVAL_MS);
  
  log(`[IdempotencyKeys] Purge scheduled every ${PURGE_INTERVAL_MS / 1000 / 60}min (keys older than ${PURGE_HOURS_OLD}h)`);
})();
