/**
 * Structured Logging for Make API Integration
 * 
 * Logs JSON-formatted entries for all Make API requests.
 * NEVER logs the X-API-Key value.
 */

import { Request } from "express";

interface LogExtra {
  ficheId?: string;
  externalId?: string;
  documentUrl?: string;
  error?: string;
  [key: string]: any;
}

export function logMakeRequest(
  req: Request,
  status: number,
  code: string,
  extra: LogExtra = {}
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: status < 400 ? "info" : "warn",
    route: `${req.method} ${req.path}`,
    authSource: (req as any).user?.authSource || "UNKNOWN",
    userId: (req as any).user?.userId || null,
    role: (req as any).user?.role || null,
    ip: req.ip,
    status,
    code,
    ficheId: extra.ficheId || null,
    externalId: extra.externalId || null,
    ...(extra.documentUrl && { documentUrl: extra.documentUrl }),
    ...(extra.error && { error: extra.error }),
  };
  
  console.log(JSON.stringify(logEntry));
}
