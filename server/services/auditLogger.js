import { storage } from '../storage.ts';

export async function logAction(actorId, action, entity, entityId, metadata = null) {
  try {
    await storage.createAuditLog({
      actorId,
      action,
      entity,
      entityId,
      meta: metadata
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

export function auditMiddleware(action, entity) {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful actions
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || req.body?.id || 'unknown';
        logAction(req.user?.userId, action, entity, entityId, {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      }
      return originalSend.call(this, data);
    };

    next();
  };
}
