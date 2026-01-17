/**
 * Hybrid Authentication Middleware
 * 
 * Supports both:
 * - Cookie JWT authentication (frontend, priority)
 * - X-API-Key header authentication (Make integration)
 * 
 * Priority: Cookie JWT if present, otherwise X-API-Key
 */

import { Request, Response, NextFunction } from "express";
// @ts-ignore - auth.js is a JavaScript file without type declarations
import { verifyToken } from "../auth.js";
import { apiKeyAuth } from "./apiKeyAuth.js";
import { logMakeRequest } from "../utils/makeLogger.js";

export function requireAuthOrApiKey(req: Request, res: Response, next: NextFunction): void {
  // Priority 1: Cookie auth_token (frontend)
  const token = req.cookies?.auth_token;
  
  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = { 
          ...decoded, 
          authSource: "COOKIE_JWT" 
        };
        return next();
      }
    } catch (e) {
      // Cookie invalid, try API Key
    }
  }
  
  // Priority 2: X-API-Key header (Make)
  if (req.headers["x-api-key"]) {
    return apiKeyAuth(req, res, next);
  }
  
  // No valid authentication
  logMakeRequest(req, 401, "AUTH_REQUIRED", {});
  res.status(401).json({ 
    message: "Non autorisé", 
    code: "AUTH_REQUIRED" 
  });
}
