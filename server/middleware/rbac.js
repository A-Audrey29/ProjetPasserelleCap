import { verifyToken, extractTokenFromCookies } from '../auth.js';

export function requireAuth(req, res, next) {
  const token = extractTokenFromCookies(req);
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé - Token manquant' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Non autorisé - Token invalide' });
  }

  req.user = payload;
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    console.log('[DEBUG] Role check - User role:', req.user.role, 'Allowed roles:', allowedRoles);
    if (!allowedRoles.includes(req.user.role)) {
      console.log('[DEBUG] Role check failed - Role not allowed');
      return res.status(403).json({ message: 'Accès interdit - Rôle insuffisant' });
    }

    next();
  };
}

export function requireOrgAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  // ADMIN and SUIVI_PROJETS have global access
  if (['ADMIN', 'SUIVI_PROJETS'].includes(req.user.role)) {
    return next();
  }

  // EVS_CS can only see their own organization's fiches
  if (req.user.role === 'EVS_CS' && req.user.orgId) {
    req.userOrgId = req.user.orgId;
    return next();
  }

  // EMETTEUR and RELATIONS_EVS have broader access
  if (['EMETTEUR', 'RELATIONS_EVS'].includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({ message: 'Accès interdit' });
}

export function requireFicheAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  // Store user info for fiche access filtering
  req.ficheAccess = {
    role: req.user.role,
    userId: req.user.userId,
    orgId: req.user.orgId,
    epsiId: req.user.epsiId
  };

  next();
}
