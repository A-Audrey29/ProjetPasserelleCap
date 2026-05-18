import { Request, Response, NextFunction } from "express";
import * as fs from "fs";
import * as path from "path";

/**
 * Maintenance mode middleware
 *
 * Blocks all requests when MAINTENANCE_MODE=true
 * - API routes (/api/*) return 503 JSON
 * - All other routes return maintenance HTML page
 *
 * Bypass: Add ?bypass=TOKEN where TOKEN matches MAINTENANCE_BYPASS_TOKEN env var
 * This sets a cookie so subsequent requests don't need the query param.
 */

const BYPASS_COOKIE_NAME = "maintenance_bypass";
const BYPASS_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Cache the HTML content to avoid reading file on every request
let maintenanceHtmlCache: string | null = null;

function getMaintenanceHtml(): string {
  if (!maintenanceHtmlCache) {
    const htmlPath = path.resolve(import.meta.dirname, "..", "maintenance.html");
    try {
      maintenanceHtmlCache = fs.readFileSync(htmlPath, "utf-8");
    } catch (err) {
      // Fallback if file not found
      maintenanceHtmlCache = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maintenance en cours - Passerelle CAP</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f6f7; }
    .container { text-align: center; padding: 2rem; }
    h1 { color: #3B4B61; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Maintenance en cours</h1>
    <p>Revenez dans quelques instants.</p>
  </div>
</body>
</html>`;
    }
  }
  return maintenanceHtmlCache;
}

export function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check if maintenance mode is enabled
  const maintenanceMode = process.env.MAINTENANCE_MODE === "true";

  if (!maintenanceMode) {
    return next();
  }

  // Check bypass via query param or cookie
  const bypassToken = process.env.MAINTENANCE_BYPASS_TOKEN;

  if (bypassToken) {
    // Check query param first
    if (req.query.bypass === bypassToken) {
      // Set cookie for future requests
      res.cookie(BYPASS_COOKIE_NAME, bypassToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: BYPASS_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
      return next();
    }

    // Check cookie
    if (req.cookies?.[BYPASS_COOKIE_NAME] === bypassToken) {
      return next();
    }
  }

  // Maintenance mode active, block request

  // API routes return 503 JSON
  if (req.path.startsWith("/api")) {
    return res.status(503).json({
      error: "Service en maintenance",
      message: "Le service est temporairement indisponible pour maintenance. Veuillez réessayer ultérieurement.",
      code: "MAINTENANCE",
    });
  }

  // All other routes return maintenance HTML page
  res.status(503)
    .set("Content-Type", "text/html")
    .set("Retry-After", "3600") // Suggest retry in 1 hour
    .send(getMaintenanceHtml());
}
