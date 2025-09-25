import { z } from 'zod';

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
  participantsCount: z.coerce.number().int().min(1, 'Le nombre de participants doit être au minimum 1').max(10, 'Le nombre de participants ne peut dépasser 10'),
  capDocuments: z.array(z.object({
    url: z.string().url(),
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
