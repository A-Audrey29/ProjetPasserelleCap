import { z } from 'zod';
import path from 'path';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
});

// === Preprocess helpers ===

// Convert empty strings to undefined for optional string fields
const emptyStringToUndefined = (val) => (val === "" || val === null) ? undefined : val;

// Preprocess for optional strings (email, phone, text fields)
const optionalString = z.preprocess(emptyStringToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyStringToUndefined, z.string().email('Email invalide').optional());
const optionalPhone = z.preprocess(emptyStringToUndefined, z.string().optional());

// Preprocess for optional number (birthYear)
const optionalBirthYear = z.preprocess(
  (val) => (val === "" || val === null || val === undefined) ? undefined : val,
  z.coerce.number().int('Année de naissance doit être un entier').min(1900, 'Année minimum: 1900').max(2030, 'Année maximum: 2030').optional()
);

// === Sub-schemas ===

// Enum for autorité parentale
const autoriteParentaleEnum = z.enum(['mere', 'pere', 'tiers'], {
  errorMap: () => ({ message: "Valeur autorisée: 'mere', 'pere', ou 'tiers'" })
});

// referentData - .passthrough() for flexibility
const referentDataSchema = z.object({
  lastName: optionalString,
  firstName: optionalString,
  structure: optionalString,
  phone: optionalPhone,
  email: optionalEmail,
  requestDate: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date: YYYY-MM-DD').optional()
  )
}).passthrough().optional();

// familyDetailedData - .passthrough() for flexibility
const familyDetailedDataSchema = z.object({
  mother: optionalString,
  father: optionalString,
  tiers: optionalString,
  lienAvecEnfants: optionalString,
  autoriteParentale: z.array(autoriteParentaleEnum).min(1, 'Au moins une autorité parentale requise').optional(),
  situationFamiliale: optionalString,
  situationSocioProfessionnelle: optionalString,
  adresse: optionalString,
  email: optionalEmail,
  telephonePortable: optionalPhone,
  telephoneFixe: optionalPhone,
  code: optionalString
}).passthrough().optional();

// childData - .strict() for control
const childDataSchema = z.object({
  name: z.preprocess(emptyStringToUndefined, z.string().min(1, 'Nom enfant requis')),
  birthYear: optionalBirthYear,
  niveauScolaire: optionalString
}).strict();

// childrenData - array with anti-abuse limit
const childrenDataSchema = z.array(childDataSchema)
  .max(15, 'Maximum 15 enfants autorisés')
  .optional();

// selectedWorkshops - record with anti-abuse limit (max 50 keys, boolean values)
const selectedWorkshopsSchema = z.record(z.string(), z.boolean())
  .refine(
    (obj) => Object.keys(obj).length <= 50,
    { message: 'Maximum 50 ateliers autorisés' }
  )
  .optional();

// workshopPropositions - record with anti-abuse limit (max 50 keys, string values max 500 chars)
const workshopPropositionsSchema = z.record(
  z.string(),
  z.string().max(500, 'Proposition trop longue (max 500 caractères)')
).refine(
  (obj) => Object.keys(obj).length <= 50,
  { message: 'Maximum 50 propositions autorisées' }
).optional();

// capDocument - individual document
const capDocumentSchema = z.object({
  url: z.string().min(1, 'URL requise').trim().refine(
    (url) => {
      if (url.startsWith('/uploads/')) {
        try {
          const decoded = decodeURIComponent(url);
          const normalized = path.posix.normalize(decoded);
          if (!normalized.startsWith('/uploads/')) return false;
          return !decoded.includes('..');
        } catch { return false; }
      }
      try {
        const parsed = new URL(url);
        return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !!parsed.hostname;
      } catch { return false; }
    },
    { message: "URL doit être /uploads/... ou HTTP(S) valide" }
  ),
  name: z.string().min(1, 'Nom fichier requis'),
  size: z.number().min(0, 'Taille invalide'),
  mime: z.string().min(1, 'Type MIME requis')
}).strict();

// externalId - safe string max 255 (no prefix constraint)
const externalIdSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().max(255, 'externalId trop long (max 255)').optional()
);

// === Main schema ===
export const ficheCreationSchema = z.object({
  // Required field
  participantsCount: z.coerce.number()
    .int('Doit être un entier')
    .min(1, 'Minimum 1 participant')
    .max(10, 'Maximum 10 participants'),
  
  // Typed optional fields
  description: z.preprocess(emptyStringToUndefined, z.string().max(5000, 'Description trop longue').optional()),
  referentData: referentDataSchema,
  familyDetailedData: familyDetailedDataSchema,
  childrenData: childrenDataSchema,
  selectedWorkshops: selectedWorkshopsSchema,
  workshopPropositions: workshopPropositionsSchema,
  capDocuments: z.array(capDocumentSchema).max(10, 'Maximum 10 documents').optional(),
  familyConsent: z.boolean().optional(),
  
  // New fields
  referentValidation: z.boolean().default(false),
  externalId: externalIdSchema
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
