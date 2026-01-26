import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { ErrorCodes } from '../utils/errorCodes';

/**
 * Normalize URL to relative pathname format for consistent comparison
 * Handles both absolute URLs (legacy DB entries) and relative URLs (new entries)
 *
 * @param url - URL string (absolute or relative)
 * @returns Normalized relative pathname (e.g., "/uploads/navettes/uuid.pdf")
 *
 * @example
 * normalizeUrl("https://domain.com/uploads/navettes/uuid.pdf") → "/uploads/navettes/uuid.pdf"
 * normalizeUrl("/uploads/navettes/uuid.pdf") → "/uploads/navettes/uuid.pdf"
 */
function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';

  // If URL is absolute (starts with http:// or https://), extract pathname
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      return parsed.pathname; // Extract path only: "/uploads/navettes/uuid.pdf"
    } catch (error) {
      // If URL parsing fails, return as-is (defensive programming)
      console.warn(`[uploadSecurity] Failed to parse absolute URL: ${url}`);
      return url;
    }
  }

  // Already relative, return as-is
  return url;
}

/**
 * Middleware to protect uploaded files with RBAC
 * Checks if the authenticated user has access to the fiche associated with the requested file
 *
 * BACKWARD COMPATIBLE: Handles both absolute URLs (legacy DB) and relative URLs (new standard)
 */
export async function protectUploadAccess(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract subfolder and filename from route params
    const { subfolder, filename } = req.params;
    const user = (req as any).user;

    if (!user) {
      const error: any = new Error('Non authentifié');
      error.status = 401;
      error.code = ErrorCodes.AUTHENTICATION_ERROR;
      throw error;
    }

    // Construct RELATIVE URL for comparison (normalized format)
    const requestedFileUrl = `/uploads/${subfolder}/${filename}`;

    // Find which fiche this file belongs to by checking database directly
    // BACKWARD COMPATIBLE: Normalize DB URLs to handle both absolute (legacy) and relative (new) formats
    const allFiches = await storage.getAllFiches();

    let ownerFiche = null;
    for (const fiche of allFiches) {
      // Get full fiche details to check all fields
      const fullFiche = await storage.getFiche(fiche.id);
      if (!fullFiche) continue;

      // Check contractCommunePdfUrl (normalize for comparison)
      const contractUrl = normalizeUrl((fullFiche as any).contractCommunePdfUrl);
      if (contractUrl && contractUrl === requestedFileUrl) {
        ownerFiche = fullFiche;
        break;
      }

      // Check capDocuments (JSON array)
      if ((fullFiche as any).capDocuments) {
        const docs = Array.isArray((fullFiche as any).capDocuments) ? (fullFiche as any).capDocuments : [];
        for (const doc of docs) {
          const docUrl = normalizeUrl(doc?.url);
          if (docUrl && docUrl === requestedFileUrl) {
            ownerFiche = fullFiche;
            break;
          }
        }
        if (ownerFiche) break;
      }
    }

    // If not found in fiches, check workshop enrollments (report PDFs)
    if (!ownerFiche) {
      const enrollments = await storage.getWorkshopEnrollments({});
      for (const enrollment of enrollments) {
        const reportUrl = normalizeUrl((enrollment as any).reportUrl);
        if (reportUrl && reportUrl === requestedFileUrl) {
          // Get the fiche associated with this enrollment
          const fiche = await storage.getFiche(enrollment.ficheId);
          if (fiche) {
            ownerFiche = fiche;
            break;
          }
        }
      }
    }

    if (!ownerFiche) {
      // File doesn't belong to any fiche - could be orphaned or doesn't exist
      const error: any = new Error('Fichier non trouvé');
      error.status = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }

    // Check if user has access to this fiche based on RBAC rules
    const hasAccess = await checkFicheAccess(user, ownerFiche);
    
    if (!hasAccess) {
      const error: any = new Error('Accès refusé à ce fichier');
      error.status = 403;
      error.code = ErrorCodes.AUTHORIZATION_ERROR;
      throw error;
    }

    // User has access, proceed to file delivery
    next();
    
  } catch (error) {
    next(error);
  }
}

/**
 * Check if user has access to a fiche based on RBAC rules
 */
async function checkFicheAccess(user: any, fiche: any): Promise<boolean> {
  const role = user.role;

  // ADMIN has access to everything
  if (role === 'ADMIN') {
    return true;
  }

  // SUIVI_PROJETS has access to everything
  if (role === 'SUIVI_PROJETS') {
    return true;
  }

  // EMETTEUR can access fiches they created
  if (role === 'EMETTEUR') {
    return fiche.createdById === user.userId;
  }

  // RELATIONS_EVS can access fiches assigned to their organization
  if (role === 'RELATIONS_EVS') {
    if (!user.orgId) {
      return false;
    }
    return fiche.assignedToOrganisationId === user.orgId;
  }

  // EVS_CS can access fiches for families they manage
  if (role === 'EVS_CS') {
    if (!user.orgId) {
      return false;
    }
    // Check if fiche is assigned to user's organization AND user is assigned to the fiche
    if (fiche.assignedToOrganisationId === user.orgId) {
      return fiche.assignedToUserId === user.userId || fiche.assignedToUserId === null;
    }
    return false;
  }

  return false;
}
