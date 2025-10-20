import { z } from 'zod';
import path from 'path';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
});

export const ficheCreationSchema = z.object({
  description: z.string().optional(),
  // JSON form data fields
  referentData: z.any().optional(),
  familyDetailedData: z.any().optional(),
  childrenData: z.any().optional(),
  workshopPropositions: z.any().optional(),
  selectedWorkshops: z.any().optional(),
  participantsCount: z.coerce.number().int().min(1, 'Le nombre de participants doit être au minimum 1').max(10, 'Le nombre de participants ne peut dépasser 10'),
  capDocuments: z.array(z.object({
    url: z.string().min(1, 'URL requise').trim().refine(
      (url) => {
        // Accept relative paths to local uploads directory
        if (url.startsWith('/uploads/')) {
          try {
            // Decode URL encoding to prevent %2e%2e attacks
            const decoded = decodeURIComponent(url);
            
            // Normalize the path to resolve .. and . segments
            const normalized = path.posix.normalize(decoded);
            
            // Ensure normalized path still starts with /uploads/ and doesn't escape
            if (!normalized.startsWith('/uploads/')) {
              return false;
            }
            
            // Additional safety: reject any path containing .. even after normalization
            return !decoded.includes('..');
          } catch {
            // Malformed percent-encoding
            return false;
          }
        }
        
        // For absolute URLs, validate full syntax
        try {
          const parsed = new URL(url);
          // Require http/https protocol AND a valid hostname
          return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !!parsed.hostname;
        } catch {
          return false;
        }
      },
      { message: 'L\'URL doit être un chemin /uploads/ valide ou une URL HTTP(S) complète avec nom d\'hôte' }
    ),
    name: z.string(),
    size: z.number().min(0),
    mime: z.string()
  })).optional(),
  familyConsent: z.boolean().optional()
});

export const assignmentSchema = z.object({
  assignedOrgId: z.string().min(1, 'Organisation requise')
});

export const contractSignSchema = z.object({
  signedAt: z.string().datetime().optional()
});

export const paymentSchema = z.object({
  kind: z.enum(['ADVANCE_70', 'REMAINING_30']),
  amountCents: z.number().min(1)
});

export const commentSchema = z.object({
  content: z.string().min(1, 'Contenu requis')
});

export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation failed:', error.errors);
        return res.status(400).json({
          message: 'Données invalides',
          errors: error.errors
        });
      }
      next(error);
    }
  };
}
