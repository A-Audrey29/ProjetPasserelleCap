// Load environment variables FIRST (before any other imports)
// dotenv-flow will load .env, .env.local, .env.{NODE_ENV}, .env.{NODE_ENV}.local
// in order of priority, with Replit Secrets taking precedence over file-based variables
import dotenvFlow from 'dotenv-flow';
dotenvFlow.config();

import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logError } from "./utils/errorLogger";
import { getErrorMessage, getErrorCode, ErrorCodes } from "./utils/errorCodes";
import { requireAuth } from "./middleware/rbac";
import { protectUploadAccess } from "./middleware/uploadSecurity";

const app = express();

// Trust proxy - necessary for rate limiting to work correctly in proxied environments (Replit, etc.)
app.set('trust proxy', 1);

// Helmet security headers - CSP disabled to allow React/Vite to work
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid blocking React development
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration - flexible for dev and production
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' 
    ? true // Accept all origins in development
    : process.env.CORS_ORIGIN || false, // Use CORS_ORIGIN in production, block if not set
  credentials: true, // Allow cookies/authentication headers
};

app.use(cors(corsOptions));

// Serve uploaded files statically with authentication and RBAC protection
app.use('/uploads', requireAuth, protectUploadAccess, express.static(path.join(process.cwd(), 'uploads')));

// Serve legal documents (markdown files) - public access
app.use('/legal', express.static(path.join(process.cwd(), 'legal')));

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
    const isDevelopment = process.env.NODE_ENV === 'development';
    
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
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // changement du port 5000 pour 3000 pour le faire tourner en local
  const port = parseInt(process.env.PORT || '5000', 10); 
  server.listen({
    port,
    host: "0.0.0.0",// changement d'adresse pour le faire tourner en local
   // host: "127.0.0.1",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
