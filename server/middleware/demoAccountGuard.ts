/**
 * Middleware de protection des comptes de démonstration
 * 
 * En production (ALLOW_DEMO_ACTIONS=false), ce middleware bloque les actions critiques
 * sur les comptes démo (emails se terminant par @demo.passerelle.cap).
 * 
 * En développement (ALLOW_DEMO_ACTIONS=true), toutes les actions sont autorisées.
 * 
 * Ce système permet de :
 * - Garder des comptes démo accessibles en production pour les démonstrations
 * - Empêcher toute modification/suppression de données par ces comptes
 * - Protéger l'intégrité de la base de données
 */

import { Request, Response, NextFunction } from 'express';

// Liste des domaines considérés comme "démo"
const DEMO_EMAIL_PATTERNS = [
  '@demo.passerelle.cap',
  '@demo.cap',
  '@demo.test'
];

/**
 * Vérifie si un email correspond à un compte de démonstration
 */
function isDemoAccount(email: string | undefined): boolean {
  if (!email) return false;
  
  const lowerEmail = email.toLowerCase();
  return DEMO_EMAIL_PATTERNS.some(pattern => 
    lowerEmail.endsWith(pattern)
  );
}

/**
 * Middleware qui bloque les actions critiques sur les comptes démo en production
 * 
 * @param action - Description de l'action pour le message d'erreur (ex: "suppression de fiche")
 */
export function blockDemoAccountActions(action: string = 'cette action') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Récupérer l'utilisateur authentifié depuis la requête
    const user = (req as any).user;
    
    if (!user) {
      // Si pas d'utilisateur, laisser passer (l'auth middleware bloquera)
      return next();
    }
    
    // Vérifier si c'est un compte démo
    if (!isDemoAccount(user.email)) {
      // Pas un compte démo, autoriser l'action
      return next();
    }
    
    // C'est un compte démo - vérifier si les actions démo sont autorisées
    const allowDemoActions = process.env.ALLOW_DEMO_ACTIONS === 'true';
    
    if (allowDemoActions) {
      // En développement, autoriser les actions démo
      console.log(`✅ Demo account action allowed (dev mode): ${action} by ${user.email}`);
      return next();
    }
    
    // En production, bloquer l'action
    console.warn(`🚫 Demo account action blocked: ${action} by ${user.email}`);
    
    return res.status(403).json({
      message: `Action interdite pour les comptes de démonstration`,
      detail: `Les comptes de démonstration sont en lecture seule en production. ${action} n'est pas autorisée.`,
      isDemoAccount: true,
      allowDemoActions: false
    });
  };
}

/**
 * Middleware global qui ajoute des informations sur le compte démo à la requête
 * Utile pour les routes qui veulent adapter leur comportement
 */
export function enrichWithDemoAccountInfo(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (user) {
    (req as any).isDemoAccount = isDemoAccount(user.email);
    (req as any).allowDemoActions = process.env.ALLOW_DEMO_ACTIONS === 'true';
  }
  
  next();
}

/**
 * Fonction utilitaire pour vérifier dans les routes si l'action est autorisée
 * 
 * @example
 * if (!canPerformAction(req)) {
 *   return res.status(403).json({ message: "Action interdite pour les comptes démo" });
 * }
 */
export function canPerformAction(req: Request): boolean {
  const user = (req as any).user;
  if (!user) return true; // Pas d'utilisateur = laisser l'auth middleware gérer
  
  if (!isDemoAccount(user.email)) return true; // Pas un compte démo
  
  return process.env.ALLOW_DEMO_ACTIONS === 'true'; // Autoriser si flag activé
}

/**
 * Export des utilitaires
 */
export {
  isDemoAccount,
  DEMO_EMAIL_PATTERNS
};
