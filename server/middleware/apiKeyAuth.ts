/**
 * API Key Authentication Middleware for Make Integration
 * 
 * Validates X-API-Key header against MAKE_API_KEYS environment variable.
 * Supports multiple keys (comma-separated) for key rotation.
 * NEVER logs the API key value.
 */

import { Request, Response, NextFunction } from "express";
import { logMakeRequest } from "../utils/makeLogger.js";

export interface MakeAuthUser {
  userId: string;
  role: "INTEGRATION_MAKE";
  authSource: "API_KEY";
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"];
  
  if (!apiKey || typeof apiKey !== "string") {
    logMakeRequest(req, 401, "AUTH_REQUIRED", {});
    res.status(401).json({ 
      message: "Non autorisé", 
      code: "AUTH_REQUIRED" 
    });
    return;
  }
  
  const validKeys = (process.env.MAKE_API_KEYS || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);
  
  if (validKeys.length === 0) {
    console.error("MAKE_API_KEYS environment variable is not configured");
    logMakeRequest(req, 401, "API_KEY_NOT_CONFIGURED", {});
    res.status(401).json({ 
      message: "Non autorisé - Configuration manquante", 
      code: "API_KEY_NOT_CONFIGURED" 
    });
    return;
  }
  
  if (!validKeys.includes(apiKey)) {
    logMakeRequest(req, 401, "INVALID_API_KEY", {});
    res.status(401).json({ 
      message: "Non autorisé - Clé API invalide", 
      code: "INVALID_API_KEY" 
    });
    return;
  }
  
  // Inject pseudo-user for Make integration
  req.user = {
    userId: "make-integration",
    role: "INTEGRATION_MAKE",
    authSource: "API_KEY",
  } as MakeAuthUser;
  
  next();
}
