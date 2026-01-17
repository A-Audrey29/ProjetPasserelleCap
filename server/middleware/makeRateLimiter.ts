/**
 * Rate Limiter for Make API Integration
 * 
 * Only applies when X-API-Key header is present.
 * Does not affect frontend users with cookie authentication.
 * 
 * Configuration:
 * - 100 requests per 15 minutes per IP
 * - Works behind reverse proxy (Render) with trust proxy
 */

import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

const apiKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator which properly handles IPv6 addresses
  // trust proxy is already configured in app, so req.ip will be correct
  validate: { xForwardedForHeader: false }, // Disable warning, we handle proxy trust in app
  handler: (req: Request, res: Response): void => {
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfter = resetTime 
      ? Math.ceil((resetTime - Date.now()) / 1000) 
      : 300;
    
    res.set("Retry-After", String(retryAfter));
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "warn",
      route: `${req.method} ${req.path}`,
      ip: req.ip,
      code: "RATE_LIMIT_EXCEEDED",
    }));
    
    res.status(429).json({
      message: "Trop de requêtes - Réessayez plus tard",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter,
    });
  },
});

/**
 * Conditional rate limiter that only applies when X-API-Key is present.
 * Must be placed BEFORE requireAuthOrApiKey in the middleware chain.
 */
export function makeRateLimiter(req: Request, res: Response, next: NextFunction): void {
  if (req.headers["x-api-key"]) {
    return apiKeyLimiter(req, res, next);
  }
  next();
}
