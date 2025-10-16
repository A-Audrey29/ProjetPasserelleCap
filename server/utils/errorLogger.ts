import { Request } from "express";

interface ErrorLog {
  timestamp: string;
  errorCode: string;
  message: string;
  statusCode: number;
  path?: string;
  method?: string;
  userId?: number;
  stack?: string;
  details?: any;
}

/**
 * Logs errors to the console with structured formatting
 * In production, this could be extended to write to a file or external logging service
 */
export function logError(
  error: Error,
  errorCode: string,
  statusCode: number,
  req?: Request,
  details?: any
): void {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    errorCode,
    message: error.message,
    statusCode,
    path: req?.path,
    method: req?.method,
    userId: (req as any)?.user?.id,
    stack: error.stack,
    details,
  };

  // In production, you might want to write this to a file or send to a logging service
  console.error('[ERROR]', JSON.stringify(errorLog, null, 2));
}
