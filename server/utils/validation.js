import { z } from 'zod';
import path from 'path';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
});

// === Preprocess helpers ===

// Robust sanitizer for ALL strings (handles Make.com placeholders: null, n/a, -, etc.)
const sanitizeString = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'string') return undefined;
  
  const trimmed = val.trim();
  if (trimmed === '') return undefined;
  
  // Treat common "empty" placeholders as undefined
  const lowerVal = trimmed.toLowerCase();
  if (['null', 'n/a', 'na', 'none', '-', 'undefined', ''].includes(lowerVal)) return undefined;
  
  return trimmed;
};

// Convert invalid emails to undefined (robust for Make.com integration)
const sanitizeEmail = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'string') return undefined;
  
  const trimmed = val.trim();
  if (trimmed === '') return undefined;
  
  // Treat common "empty" placeholders as undefined
  const lowerVal = trimmed.toLowerCase();
  if (['null', 'n/a', 'na', 'none', '-', 'undefined'].includes(lowerVal)) return undefined;
  
  // Basic email validation regex - invalid emails become undefined (no error)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return undefined;
  
  return trimmed;
};

// Sanitize phone numbers - keep only valid formats
const sanitizePhone = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'string') return undefined;
  
  const trimmed = val.trim();
  if (trimmed === '') return undefined;
  
  const lowerVal = trimmed.toLowerCase();
  if (['null', 'n/a', 'na', 'none', '-', 'undefined'].includes(lowerVal)) return undefined;
  
  return trimmed;
};

// Sanitize dates - return undefined if invalid format
const sanitizeDate = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'string') return undefined;
  
  const trimmed = val.trim();
  if (trimmed === '') return undefined;
  
  const lowerVal = trimmed.toLowerCase();
  if (['null', 'n/a', 'na', 'none', '-', 'undefined'].includes(lowerVal)) return undefined;
  
  // Check YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  
  return trimmed;
};

// Sanitize number with default fallback
const sanitizeNumber = (val, defaultVal = undefined) => {
  if (val === null || val === undefined || val === '') return defaultVal;
  if (typeof val === 'string') {
    const lowerVal = val.trim().toLowerCase();
    if (['null', 'n/a', 'na', 'none', '-', 'undefined', ''].includes(lowerVal)) return defaultVal;
  }
  const num = Number(val);
  if (isNaN(num)) return defaultVal;
  return num;
};

// Sanitize and truncate long strings
const sanitizeAndTruncate = (val, maxLen = 5000) => {
  const sanitized = sanitizeString(val);
  if (!sanitized) return undefined;
  return sanitized.substring(0, maxLen);
};

// === Permissive field types (all become optional with sanitization) ===
const permissiveString = z.preprocess(sanitizeString, z.string().optional());
const permissiveEmail = z.preprocess(sanitizeEmail, z.string().optional());
const permissivePhone = z.preprocess(sanitizePhone, z.string().optional());
const permissiveDate = z.preprocess(sanitizeDate, z.string().optional());

// Permissive birthYear (1900-2030 or undefined)
const permissiveBirthYear = z.preprocess(
  (val) => {
    const num = sanitizeNumber(val);
    if (num === undefined) return undefined;
    if (num < 1900 || num > 2030) return undefined;
    return num;
  },
  z.number().optional()
);

// === Sub-schemas ===

// Sanitize autoriteParentale array - filter + normalize to lowercase
const sanitizeAutoriteParentale = (val) => {
  if (!Array.isArray(val)) return undefined;
  const validValues = ['mere', 'pere', 'tiers'];
  const normalized = val
    .filter(v => typeof v === 'string' && validValues.includes(v.toLowerCase()))
    .map(v => v.toLowerCase()); // Normalize to lowercase for enum validation
  return normalized.length > 0 ? normalized : undefined;
};

// referentData - all fields permissive
const referentDataSchema = z.object({
  lastName: permissiveString,
  firstName: permissiveString,
  structure: permissiveString,
  phone: permissivePhone,
  email: permissiveEmail,
  requestDate: permissiveDate
}).passthrough().optional();

// familyDetailedData - all fields permissive
const familyDetailedDataSchema = z.object({
  mother: permissiveString,
  father: permissiveString,
  tiers: permissiveString,
  lienAvecEnfants: permissiveString,
  autoriteParentale: z.preprocess(sanitizeAutoriteParentale, z.array(z.enum(['mere', 'pere', 'tiers'])).optional()),
  situationFamiliale: permissiveString,
  situationSocioProfessionnelle: permissiveString,
  adresse: permissiveString,
  email: permissiveEmail,
  telephonePortable: permissivePhone,
  telephoneFixe: permissivePhone,
  code: permissiveString
}).passthrough().optional();

// childData - permissive (name becomes optional too)
const childDataSchema = z.object({
  name: permissiveString,
  birthYear: permissiveBirthYear,
  niveauScolaire: permissiveString
}).passthrough();

// Helper: filter out children with empty/null/placeholder name before validation
const filterEmptyChildren = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.filter((child) => {
    if (!child || typeof child !== 'object') return false;
    const name = child.name;
    // Check if name is valid (not empty, not placeholder)
    if (name === undefined || name === null) return false;
    if (typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (trimmed === '') return false;
    // Also filter out placeholder values
    const lowerName = trimmed.toLowerCase();
    if (['null', 'n/a', 'na', 'none', '-', 'undefined'].includes(lowerName)) return false;
    return true;
  });
};

// childrenData - preprocess to filter empty children, then validate with anti-abuse limit
const childrenDataSchema = z.preprocess(
  filterEmptyChildren,
  z.array(childDataSchema)
    .max(15, 'Maximum 15 enfants autorisés')
    .optional()
);

// Sanitize selectedWorkshops - filter invalid entries, limit to 50 keys (anti-abuse)
const sanitizeSelectedWorkshops = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'object' || Array.isArray(val)) return undefined;
  const result = {};
  let count = 0;
  for (const [key, value] of Object.entries(val)) {
    if (count >= 50) break; // Anti-abuse limit
    if (typeof key === 'string' && typeof value === 'boolean') {
      result[key] = value;
      count++;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

// selectedWorkshops - permissive with anti-abuse limit
const selectedWorkshopsSchema = z.preprocess(
  sanitizeSelectedWorkshops,
  z.record(z.string(), z.boolean()).optional()
);

// Sanitize workshopPropositions - filter invalid entries, limit to 50 keys, truncate long values
const sanitizeWorkshopPropositions = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val !== 'object' || Array.isArray(val)) return undefined;
  const result = {};
  let count = 0;
  for (const [key, value] of Object.entries(val)) {
    if (count >= 50) break; // Anti-abuse limit
    if (typeof key === 'string' && typeof value === 'string') {
      const sanitized = sanitizeString(value);
      if (sanitized) {
        // Truncate to 500 chars instead of rejecting
        result[key] = sanitized.substring(0, 500);
        count++;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

// workshopPropositions - permissive with anti-abuse limits
const workshopPropositionsSchema = z.preprocess(
  sanitizeWorkshopPropositions,
  z.record(z.string(), z.string()).optional()
);

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
  sanitizeString,
  z.string().max(255, 'externalId trop long (max 255)').optional()
);

// Permissive participantsCount - defaults to 1 if invalid
const permissiveParticipantsCount = z.preprocess(
  (val) => {
    const num = sanitizeNumber(val, 1);
    if (num < 1) return 1;
    if (num > 10) return 10;
    return Math.floor(num);
  },
  z.number().int().min(1).max(10)
);

// === Main schema ===
export const ficheCreationSchema = z.object({
  // Permissive - defaults to 1 if invalid/missing
  participantsCount: permissiveParticipantsCount,
  
  // All fields permissive
  description: z.preprocess((val) => sanitizeAndTruncate(val, 5000), z.string().optional()),
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
