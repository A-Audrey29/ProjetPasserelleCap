import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy - necessary for rate limiting to work correctly in proxied environments (Replit, etc.)
app.set('trust proxy', 1);

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

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve legal documents (markdown files)
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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
