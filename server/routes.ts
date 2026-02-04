// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import {
  authenticateUser,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  hashPassword,
} from "./auth.js";
import {
  requireAuth,
  requireRole,
  requireFicheAccess,
} from "./middleware/rbac.js";
import { requireAuthOrApiKey } from "./middleware/requireAuthOrApiKey.js";
import { makeRateLimiter } from "./middleware/makeRateLimiter.js";
import { logMakeRequest } from "./utils/makeLogger.js";
import { auditMiddleware } from "./services/auditLogger.js";
import crypto from "crypto";
import os from "os";
import { promises as fsPromises } from "fs";
import {
  transitionFicheState,
  getValidTransitions,
} from "./services/stateTransitions.js";
import emailService from "./services/emailService.js";
import notificationService from "./services/notificationService.js";
import { uploadNavette, uploadBilan, uploadFile, healthCheck } from "./utils/ftpsUpload.js";

// Configuration des chemins de stockage pour les uploads
const uploadsRoot = path.resolve("uploads");
const uploadsNavettes = path.join(uploadsRoot, "navettes");
const uploadsBilans = path.join(uploadsRoot, "bilans");

// CSV parsing utility functions (inspired from seed.ts)
function parseCsv(content: string): string[][] {
  // Auto-detect delimiter by checking first line
  const firstLine = content.split("\n")[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ";" : ",";

  console.log(
    `CSV delimiter detected: "${delimiter}" (commas: ${commaCount}, semicolons: ${semicolonCount})`,
  );

  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push(current);
        current = "";
      } else if (char === "\n") {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      } else if (char === "\r") {
        // ignore
      } else {
        current += char;
      }
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

interface CsvRow {
  [key: string]: string;
}

import {
  validateRequest,
  loginSchema,
  ficheCreationSchema,
  assignmentSchema,
  commentSchema,
} from "./utils/validation.js";
import { getFileExtension } from "./utils/fileValidation.js";
import { validateUploadedFileMimeType } from "./middleware/validateMimeType.js";

// Add validation schema for contract updates
const contractUpdateSchema = z.object({
  contractSignedByEVS: z.boolean().optional(),
  contractSignedByCommune: z.boolean().optional(),
  contractCommunePdfUrl: z.string().nullable().optional(),
});

// Ensure uploads directories exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories for navettes and bilans
if (!fs.existsSync(uploadsNavettes)) {
  fs.mkdirSync(uploadsNavettes, { recursive: true });
}
if (!fs.existsSync(uploadsBilans)) {
  fs.mkdirSync(uploadsBilans, { recursive: true });
}

// Configure multer for file uploads (CAP documents) → uploads/navettes
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsNavettes);
    },
    filename: (req, file, cb) => {
      // Generate UUID-based filename with original extension
      const ext = getFileExtension(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé"), false);
    }
  },
});

// Configure multer for CSV uploads
const uploadCSV = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["text/csv", "application/csv", "text/plain"];
    if (
      allowedMimes.includes(file.mimetype) ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers CSV sont autorisés"), false);
    }
  },
});

// Configure multer for PDF contract uploads → uploads/navettes
const uploadContractPDF = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsNavettes);
    },
    filename: (req, file, cb) => {
      // Generate UUID-based filename with original extension
      const ext = getFileExtension(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers PDF sont autorisés"), false);
    }
  },
});

// Configure multer for workshop report PDF uploads (bilans d'ateliers) → uploads/bilans
const uploadReportPDF = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsBilans);
    },
    filename: (req, file, cb) => {
      // Generate UUID-based filename with original extension
      const ext = getFileExtension(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers PDF sont autorisés"), false);
    }
  },
});

// Rate limiter for login attempts
// - Production: 5 attempts max per 15 minutes to prevent brute force attacks
// - Development: Unlimited (9999) to facilitate testing with different user roles
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 5 : 9999, // Unlimited in dev
  message: {
    message:
      "Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

  // Auth routes
  app.post(
    "/api/auth/login",
    loginLimiter,
    validateRequest(loginSchema),
    async (req, res) => {
      try {
        const { email, password } = req.validatedData;
        const user = await authenticateUser(email, password);

        if (!user) {
          return res
            .status(401)
            .json({ message: "Email ou mot de passe incorrect" });
        }

        const token = generateToken(user);
        setAuthCookie(res, token);

        res.json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,

            orgId: user.orgId,
          },
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.post("/api/auth/logout", (req, res) => {
    clearAuthCookie(res);
    res.json({ message: "Déconnexion réussie" });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(401).json({ message: "Utilisateur non trouvé" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          structure: user.structure,
          phone: user.phone,
          orgId: user.orgId,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // Self profile update endpoint
  app.put(
    "/api/auth/profile",
    requireAuth,
    auditMiddleware("update", "UserProfile"),
    async (req, res) => {
      try {
        const updateData = req.body;

        // Only allow updating specific fields
        const allowedFields = {
          structure: updateData.structure,
          phone: updateData.phone,
        };

        // If password is provided, hash it
        if (updateData.password) {
          allowedFields.passwordHash = await hashPassword(updateData.password);
        }

        const user = await storage.updateUser(req.user.userId, allowedFields);
        if (!user) {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            structure: user.structure,
            phone: user.phone,
            orgId: user.orgId,
          },
        });
      } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Fiches routes
  app.get("/api/fiches", requireAuth, requireFicheAccess, async (req, res) => {
    try {
      const { state, assignedOrgId, search } = req.query;

      let filters = {
        state: state as string,
        assignedOrgId: assignedOrgId as string,
        search: search as string,
      };

      // Apply role-based filtering
      if (req.ficheAccess.role === "EMETTEUR") {
        filters.emitterId = req.ficheAccess.userId;
      } else if (req.ficheAccess.role === "EVS_CS") {
        // EVS users should only see fiches assigned to their organization
        filters.assignedOrgId = req.ficheAccess.orgId;
      }

      const fiches = await storage.getAllFiches(filters);

      // Get related data for each fiche
      const fichesWithDetails = await Promise.all(
        fiches.map(async (fiche) => {
          const [emitter, assignedOrg] = await Promise.all([
            storage.getUser(fiche.emitterId),
            fiche.assignedOrgId
              ? storage.getOrganization(fiche.assignedOrgId)
              : null,
          ]);

          const totalAmount = 0;

          return {
            ...fiche,
            emitter,
            assignedOrg,
            totalAmount,
            // Ensure JSON fields are properly parsed with safe parsing
            referentData:
              fiche.referentData && typeof fiche.referentData === "string"
                ? (() => {
                    try {
                      return JSON.parse(fiche.referentData);
                    } catch {
                      return null;
                    }
                  })()
                : fiche.referentData,
            familyDetailedData:
              fiche.familyDetailedData &&
              typeof fiche.familyDetailedData === "string"
                ? (() => {
                    try {
                      return JSON.parse(fiche.familyDetailedData);
                    } catch {
                      return null;
                    }
                  })()
                : fiche.familyDetailedData,
            childrenData:
              fiche.childrenData && typeof fiche.childrenData === "string"
                ? (() => {
                    try {
                      return JSON.parse(fiche.childrenData);
                    } catch {
                      return null;
                    }
                  })()
                : fiche.childrenData,
            workshopPropositions:
              fiche.workshopPropositions &&
              typeof fiche.workshopPropositions === "string"
                ? (() => {
                    try {
                      return JSON.parse(fiche.workshopPropositions);
                    } catch {
                      return null;
                    }
                  })()
                : fiche.workshopPropositions,
          };
        }),
      );

      res.json(fichesWithDetails);
    } catch (error) {
      console.error("Get fiches error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  app.get(
    "/api/fiches/:id",
    requireAuth,
    requireFicheAccess,
    async (req, res) => {
      try {
        const { id } = req.params;
        const fiche = await storage.getFiche(id);

        if (!fiche) {
          return res.status(404).json({ message: "Fiche non trouvée" });
        }

        // Check access rights for EVS users
        if (req.ficheAccess.role === "EVS_CS") {
          // EVS users can access fiches assigned to their organization
          if (fiche.assignedOrgId !== req.ficheAccess.orgId) {
            return res.status(403).json({ message: "Accès interdit" });
          }
        }

        if (
          req.ficheAccess.role === "EMETTEUR" &&
          fiche.emitterId !== req.ficheAccess.userId
        ) {
          return res.status(403).json({ message: "Accès interdit" });
        }

        // Get related data
        const [emitter, assignedOrg, comments] = await Promise.all([
          storage.getUser(fiche.emitterId),
          fiche.assignedOrgId
            ? storage.getOrganization(fiche.assignedOrgId)
            : null,
          storage.getComments(fiche.id),
        ]);

        // Get comment authors
        const commentsWithAuthors = await Promise.all(
          comments.map(async (comment) => {
            const author = await storage.getUser(comment.authorId);
            return {
              ...comment,
              author,
            };
          }),
        );

        const ficheDetails = {
          ...fiche,
          emitter,
          assignedOrg,
          comments: commentsWithAuthors,
          // Ensure JSON fields are properly parsed with safe parsing
          referentData:
            fiche.referentData && typeof fiche.referentData === "string"
              ? (() => {
                  try {
                    return JSON.parse(fiche.referentData);
                  } catch {
                    return null;
                  }
                })()
              : fiche.referentData,
          familyDetailedData:
            fiche.familyDetailedData &&
            typeof fiche.familyDetailedData === "string"
              ? (() => {
                  try {
                    return JSON.parse(fiche.familyDetailedData);
                  } catch {
                    return null;
                  }
                })()
              : fiche.familyDetailedData,
          childrenData:
            fiche.childrenData && typeof fiche.childrenData === "string"
              ? (() => {
                  try {
                    return JSON.parse(fiche.childrenData);
                  } catch {
                    return null;
                  }
                })()
              : fiche.childrenData,
          workshopPropositions:
            fiche.workshopPropositions &&
            typeof fiche.workshopPropositions === "string"
              ? (() => {
                  try {
                    return JSON.parse(fiche.workshopPropositions);
                  } catch {
                    return null;
                  }
                })()
              : fiche.workshopPropositions,
          selectedWorkshops:
            fiche.selectedWorkshops &&
            typeof fiche.selectedWorkshops === "string"
              ? (() => {
                  try {
                    return JSON.parse(fiche.selectedWorkshops);
                  } catch {
                    return null;
                  }
                })()
              : fiche.selectedWorkshops,
          validTransitions: getValidTransitions(
            req.ficheAccess.role,
            fiche.state,
          ),
        };

        res.json(ficheDetails);
      } catch (error) {
        console.error("Get fiche detail error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.post(
    "/api/fiches",
    makeRateLimiter,
    requireAuthOrApiKey,
    requireRole("ADMIN", "EMETTEUR", "RELATIONS_EVS", "INTEGRATION_MAKE"),
    validateRequest(ficheCreationSchema),
    auditMiddleware("create", "FicheNavette"),
    async (req, res) => {
      try {
        const {
          description,
          commentaires,
          referentData,
          familyDetailedData,
          childrenData,
          workshopPropositions,
          selectedWorkshops,
          participantsCount,
          capDocuments,
          familyConsent,
          referentValidation,
          externalId,
        } = req.validatedData;

        // Security: capDocuments is forbidden for API_KEY requests
        // Documents must be uploaded via POST /api/fiches/:id/documents
        if (req.user.authSource === "API_KEY" && capDocuments !== undefined) {
          logMakeRequest(req, 400, "CAPDOCUMENTS_NOT_ALLOWED", { externalId: externalId || null });
          return res.status(400).json({
            message: "capDocuments interdit via API key. Utiliser POST /api/fiches/:id/documents.",
            code: "CAPDOCUMENTS_NOT_ALLOWED",
          });
        }

        // externalId is required for Make API integration
        if (req.user.authSource === "API_KEY" && !externalId) {
          logMakeRequest(req, 400, "EXTERNAL_ID_REQUIRED", {});
          return res.status(400).json({
            message: "externalId obligatoire pour intégration Make",
            code: "EXTERNAL_ID_REQUIRED",
          });
        }

        // Check for duplicate externalId if provided
        if (externalId) {
          const existingFiches = await storage.getAllFiches();
          const duplicate = existingFiches.find(
            (f) => f.externalId === externalId,
          );
          if (duplicate) {
            logMakeRequest(req, 409, "DUPLICATE_EXTERNAL_ID", { externalId });
            return res.status(409).json({
              message: "Fiche avec cet externalId existe déjà",
              code: "DUPLICATE_EXTERNAL_ID",
              existingFicheId: duplicate.id,
              existingFicheRef: duplicate.ref,
            });
          }
        }

        // Generate reference number with year-month-counter format
        // Support X-Test-Mode header for test fiches (prefix TEST- instead of FN-)
        const isTestMode = req.headers['x-test-mode'] === 'true';
        const prefix = isTestMode ? 'TEST' : 'FN';
        
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-indexed, pad to 2 digits
        const monthPrefix = `${prefix}-${year}-${month}`;

        const existingFiches = await storage.getAllFiches();
        // Find MAX number from existing refs with same prefix (not count, to avoid conflicts after deletion)
        const refRegex = new RegExp(`^${prefix}-${year}-${month}-(\\d{3})$`);
        const maxNumber = existingFiches
          .filter((f) => typeof f.ref === "string" && refRegex.test(f.ref))
          .map((f) => {
            const match = f.ref.match(refRegex);
            return match ? parseInt(match[1], 10) : 0;
          })
          .reduce((max, n) => Math.max(max, n), 0);
        const ref = `${monthPrefix}-${(maxNumber + 1).toString().padStart(3, "0")}`;

        // Create fiche with all detailed data (always DRAFT for INTEGRATION_MAKE)
        const fiche = await storage.createFiche({
          ref,
          emitterId: req.user.userId,
          description,
          state: "DRAFT",
          referentData: referentData || null,
          familyDetailedData: familyDetailedData || null,
          childrenData: childrenData || null,
          workshopPropositions: workshopPropositions || null,
          selectedWorkshops: selectedWorkshops || null,
          participantsCount: participantsCount,
          capDocuments: capDocuments || null,
          familyConsent: familyConsent || false,
          referentValidation: referentValidation ?? false,
          externalId: externalId || null,
        });

        // If commentaires is provided, create an internal comment
        if (commentaires && commentaires.trim()) {
          await storage.createComment({
            ficheId: fiche.id,
            authorId: req.user.userId,
            content: commentaires.trim(),
          });
        }

        // Log success for Make API
        if (req.user.authSource === "API_KEY") {
          logMakeRequest(req, 201, "SUCCESS", { ficheId: fiche.id, externalId: fiche.externalId });
        }

        // Ensure referentValidation is always returned as boolean
        res.status(201).json({
          ...fiche,
          referentValidation: fiche.referentValidation ?? false,
        });
      } catch (error) {
        console.error("Create fiche error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // ===== Make API: Upload document to fiche =====
  const multerMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  }).single("file");

  app.post(
    "/api/fiches/:id/documents",
    makeRateLimiter,
    requireAuthOrApiKey,
    requireRole("ADMIN", "EMETTEUR", "RELATIONS_EVS", "INTEGRATION_MAKE"),
    (req, res, next) => {
      multerMemory(req, res, (err) => {
        if (err?.code === "LIMIT_FILE_SIZE") {
          logMakeRequest(req, 413, "FILE_TOO_LARGE", { ficheId: req.params.id });
          return res.status(413).json({
            message: "Fichier trop volumineux (max 10 MB)",
            code: "FILE_TOO_LARGE",
          });
        }
        if (err) {
          console.error("Multer error:", err);
          return res.status(500).json({ message: "Erreur upload", code: "UPLOAD_ERROR" });
        }
        next();
      });
    },
    async (req, res) => {
      const { id } = req.params;

      try {
        // 0. Check file is present
        if (!req.file) {
          logMakeRequest(req, 400, "FILE_REQUIRED", { ficheId: id });
          return res.status(400).json({ message: "Fichier requis", code: "FILE_REQUIRED" });
        }

        // 1. Check fiche exists and is DRAFT
        const fiche = await storage.getFiche(id);
        if (!fiche) {
          logMakeRequest(req, 404, "FICHE_NOT_FOUND", { ficheId: id });
          return res.status(404).json({ message: "Fiche non trouvée", code: "FICHE_NOT_FOUND" });
        }
        if (fiche.state !== "DRAFT") {
          logMakeRequest(req, 403, "FICHE_NOT_DRAFT", { ficheId: id });
          return res.status(403).json({
            message: "Action interdite - La fiche n'est pas en état DRAFT",
            code: "FICHE_NOT_DRAFT",
          });
        }

        // 2. Validate X-Idempotency-Key header
        const rawIdempotencyKey = req.headers["x-idempotency-key"];
        let idempotencyKey: string | undefined;

        if (rawIdempotencyKey) {
          if (typeof rawIdempotencyKey !== "string") {
            return res.status(400).json({
              message: "X-Idempotency-Key doit être une chaîne unique",
              code: "INVALID_IDEMPOTENCY_KEY",
            });
          }
          const trimmed = rawIdempotencyKey.trim();
          if (trimmed.length === 0) {
            return res.status(400).json({
              message: "X-Idempotency-Key ne peut pas être vide",
              code: "INVALID_IDEMPOTENCY_KEY",
            });
          }
          if (trimmed.length > 255) {
            return res.status(400).json({
              message: "X-Idempotency-Key trop long (max 255 caractères)",
              code: "INVALID_IDEMPOTENCY_KEY",
            });
          }
          idempotencyKey = trimmed;
        }

        // 3. Verify PDF magic bytes (%PDF-)
        const buffer = req.file.buffer;
        const magicBytes = buffer.slice(0, 5).toString("ascii");
        if (magicBytes !== "%PDF-") {
          logMakeRequest(req, 400, "INVALID_MIME_TYPE", { ficheId: id });
          return res.status(400).json({
            message: "Seuls les fichiers PDF sont acceptés",
            code: "INVALID_MIME_TYPE",
          });
        }

        // 4. Calculate SHA256 hash (once)
        const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

        // 5. Check idempotency
        if (idempotencyKey) {
          const existing = await storage.getIdempotencyKey(idempotencyKey, id);
          if (existing) {
            if (existing.fileHash === fileHash) {
              logMakeRequest(req, 200, "IDEMPOTENT_RETRY", { ficheId: id });
              return res.status(200).json(existing.responseJson);
            }
            return res.status(409).json({
              message: "Clé idempotence déjà utilisée avec fichier différent",
              code: "IDEMPOTENCY_KEY_MISMATCH",
            });
          }
        }

        // 6. Write temp file and upload via FTPS
        const fileUuid = uuidv4();
        const filename = `${fileUuid}.pdf`;
        const tempPath = path.join(os.tmpdir(), filename);

        try {
          await fsPromises.writeFile(tempPath, buffer);

          const result = await uploadNavette(tempPath, filename);
          await fsPromises.unlink(tempPath);

          if (!result.success) {
            logMakeRequest(req, 500, "FTPS_ERROR", { ficheId: id, error: result.message });
            return res.status(500).json({
              message: "Erreur transfert fichier",
              code: "FTPS_ERROR",
            });
          }

          // 7. Build response
          const documentUrl = `/uploads/navettes/${filename}`;
          const response = {
            documentUrl,
            ficheId: id,
            filename: req.file.originalname,
            size: req.file.size,
          };

          // 8. Attach document to fiche (with dedup by URL)
          await storage.attachDocumentToFiche(id, {
            url: documentUrl,
            name: req.file.originalname,
            size: req.file.size,
            mime: "application/pdf",
          });

          // 9. Store idempotency key
          if (idempotencyKey) {
            await storage.createIdempotencyKey({
              key: idempotencyKey,
              ficheId: id,
              fileHash,
              responseJson: response,
            });
          }

          logMakeRequest(req, 201, "SUCCESS", { ficheId: id, documentUrl });
          res.status(201).json(response);
        } catch (err) {
          try {
            await fsPromises.unlink(tempPath);
          } catch {}
          throw err;
        }
      } catch (error) {
        console.error("Upload document error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.patch(
    "/api/fiches/:id",
    requireAuth,
    requireFicheAccess,
    auditMiddleware("update", "FicheNavette"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const fiche = await storage.getFiche(id);

        if (!fiche) {
          return res.status(404).json({ message: "Fiche non trouvée" });
        }

        // Check edit permissions
        const userRole = req.ficheAccess.role;
        const userId = req.ficheAccess.userId;
        
        // EMETTEUR can only edit their own fiches in DRAFT state
        if (userRole === "EMETTEUR") {
          if (fiche.emitterId !== userId) {
            return res.status(403).json({ message: "Accès interdit" });
          }
          if (fiche.state !== "DRAFT") {
            return res
              .status(403)
              .json({ message: "Modification interdite - Fiche déjà envoyée" });
          }
        }
        
        // RELATIONS_EVS can edit fiches in DRAFT or SUBMITTED_TO_FEVES states
        // (they can modify draft fiches and fiches waiting for FEVES assignment)
        if (userRole === "RELATIONS_EVS" &&
            !["DRAFT", "SUBMITTED_TO_FEVES"].includes(fiche.state)) {
          return res
            .status(403)
            .json({ message: "Modification interdite - La fiche doit être en brouillon ou en attente FEVES" });
        }
        
        // Other roles (except ADMIN) cannot edit
        if (!["ADMIN", "EMETTEUR", "RELATIONS_EVS"].includes(userRole)) {
          return res.status(403).json({ message: "Modification non autorisée pour ce rôle" });
        }

        // Extract the detailed form data from request body
        const {
          description,
          referentData,
          familyDetailedData,
          childrenData,
          workshopPropositions,
          capDocuments,
          familyConsent,
          ...otherFields
        } = req.body;

        // Build update data
        const updateData: Record<string, any> = {
          ...otherFields,
          description,
          familyConsent: familyConsent || false,
        };
        
        // Only update referentData if explicitly provided (preserve existing data otherwise)
        if (referentData !== undefined) {
          updateData.referentData = referentData || null;
        }
        
        // Only update familyDetailedData if explicitly provided (preserve existing data otherwise)
        if (familyDetailedData !== undefined) {
          updateData.familyDetailedData = familyDetailedData || null;
        }
        
        // Only update childrenData if explicitly provided (preserve existing data including birth dates)
        if (childrenData !== undefined) {
          updateData.childrenData = childrenData || null;
        }
        
        // Only update workshopPropositions if explicitly provided (preserve existing data otherwise)
        if (workshopPropositions !== undefined) {
          updateData.workshopPropositions = workshopPropositions || null;
        }
        
        // Only update capDocuments if explicitly provided (preserve existing documents otherwise)
        if (capDocuments !== undefined) {
          updateData.capDocuments = capDocuments || null;
        }
        
        // Track modification for RELATIONS_EVS and ADMIN only
        if (userRole === "RELATIONS_EVS" || userRole === "ADMIN") {
          const user = await storage.getUser(userId);
          const modifierName = user?.email || user?.username || userId;
          updateData.lastModifiedBy = modifierName;
          updateData.lastModifiedAt = new Date();
        }

        const updatedFiche = await storage.updateFiche(id, updateData);
        res.json(updatedFiche);
      } catch (error) {
        console.error("Update fiche error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.post(
    "/api/fiches/:id/transition",
    requireAuth,
    requireRole("ADMIN", "EMETTEUR", "RELATIONS_EVS", "CD", "EVS_CS"),
    requireFicheAccess,
    auditMiddleware("transition", "FicheNavette"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { newState, metadata } = req.body;

        const updatedFiche = await transitionFicheState(
          id,
          newState,
          req.user.userId,
          metadata,
        );
        res.json(updatedFiche);
      } catch (error) {
        console.error("Transition error:", error);
        res.status(400).json({ message: error.message });
      }
    },
  );

  app.post(
    "/api/fiches/:id/assign",
    requireAuth,
    requireRole("ADMIN", "RELATIONS_EVS"),
    validateRequest(assignmentSchema),
    auditMiddleware("assign", "FicheNavette"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { assignedOrgId } = req.validatedData;

        const fiche = await storage.getFiche(id);
        if (!fiche) {
          return res.status(404).json({ message: "Fiche non trouvée" });
        }

        if (fiche.state !== "SUBMITTED_TO_FEVES") {
          return res.status(400).json({
            message: "Impossible d'affecter cette fiche dans son état actuel",
          });
        }

        const updatedFiche = await storage.updateFiche(id, { assignedOrgId });
        await transitionFicheState(id, "ASSIGNED_EVS", req.user.userId, {
          assignedOrgId,
        });

        res.json(updatedFiche);
      } catch (error) {
        console.error("Assignment error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Delete fiche (admin only)
  app.delete(
    "/api/fiches/:id",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("delete", "FicheNavette"),
    async (req, res) => {
      try {
        const { id } = req.params;

        const fiche = await storage.getFiche(id);
        if (!fiche) {
          return res.status(404).json({ message: "Fiche non trouvée" });
        }

        await storage.deleteFiche(id);
        res.json({ message: "Fiche supprimée avec succès" });
      } catch (error) {
        console.error("Delete fiche error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Close fiche - all workshops completed (EVS_CS and ADMIN only)
  app.post(
    "/api/fiches/:id/close-all-workshops",
    requireAuth,
    requireRole("ADMIN", "EVS_CS"),
    auditMiddleware("close_all_workshops", "FicheNavette"),
    async (req, res) => {
      try {
        const { id } = req.params;

        // Get the fiche
        const fiche = await storage.getFiche(id);
        if (!fiche) {
          return res.status(404).json({ message: "Fiche non trouvée" });
        }

        // Check if already closed
        if (fiche.state === "CLOSED") {
          return res
            .status(400)
            .json({ message: "La fiche est déjà clôturée" });
        }

        // Check permissions: EVS_CS must be from the assigned organization
        if (req.user.role === "EVS_CS") {
          if (!fiche.assignedOrgId || req.user.orgId !== fiche.assignedOrgId) {
            return res.status(403).json({
              message: "Vous n'êtes pas autorisé à clôturer cette fiche",
            });
          }
        }

        // Use state transition service to ensure proper validation and audit logging
        const updatedFiche = await transitionFicheState(
          id,
          "CLOSED",
          req.user.userId,
          {
            action: "close_all_workshops",
            closedBy: req.user.email,
          },
        );

        // Send notifications to RELATIONS_EVS and CD
        try {
          await notificationService.notifyFicheAllWorkshopsCompleted(
            updatedFiche,
          );
        } catch (notifError) {
          console.error("Failed to send notifications:", notifError);
          // Don't fail the request if notifications fail
        }

        res.json({
          success: true,
          message: "Fiche clôturée avec succès",
          fiche: updatedFiche,
        });
      } catch (error) {
        console.error("Close all workshops error:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de la clôture de la fiche" });
      }
    },
  );

  // Comments
  app.get(
    "/api/fiches/:id/comments",
    requireAuth,
    requireFicheAccess,
    async (req, res) => {
      try {
        const { id } = req.params;
        const comments = await storage.getComments(id);

        // Get authors
        const commentsWithAuthors = await Promise.all(
          comments.map(async (comment) => {
            const author = await storage.getUser(comment.authorId);
            return { ...comment, author };
          }),
        );

        res.json(commentsWithAuthors);
      } catch (error) {
        console.error("Get comments error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.post(
    "/api/fiches/:id/comments",
    requireAuth,
    requireFicheAccess,
    validateRequest(commentSchema),
    auditMiddleware("comment", "FicheNavette"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { content } = req.validatedData;

        const comment = await storage.createComment({
          ficheId: id,
          authorId: req.user.userId,
          content,
        });

        const author = await storage.getUser(comment.authorId);
        res.status(201).json({ ...comment, author });
      } catch (error) {
        console.error("Create comment error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // File uploads (CAP documents) → uploads/navettes
  app.post(
    "/api/uploads",
    requireAuth,
    upload.single("file"),
    validateUploadedFileMimeType,
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        // URL RELATIVE for DB consistency (backward-compatible with middleware)
        const fileUrl = `/uploads/navettes/${req.file.filename}`;

        // --- Envoi FTPS vers O2Switch (fiches navettes) ---
        const localPath = path.join(uploadsNavettes, req.file.filename);
        const result = await uploadNavette(localPath, req.file.filename);
        const ftpsOk = result.success;

        // Log FTPS upload status for monitoring
        if (!ftpsOk && process.env.NODE_ENV === "production") {
          console.warn(`⚠️ [FTPS] Upload failed for ${req.file.filename} - file available locally as fallback`);
        }

        res.json({
          url: fileUrl,
          name: req.file.originalname,
          mime: req.file.mimetype,
          size: req.file.size,
        });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Erreur lors du téléchargement" });
      }
    },
  );

  // Upload final report for a fiche and transition to FINAL_REPORT_RECEIVED
  app.post(
    "/api/fiches/:id/upload-final-report",
    requireAuth,
    requireFicheAccess,
    upload.single("file"),
    validateUploadedFileMimeType,
    async (req, res) => {
      try {
        const { id } = req.params;

        if (!req.file) {
          return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        // Only accept PDF files for final report
        if (req.file.mimetype !== "application/pdf") {
          return res.status(400).json({
            message:
              "Seuls les fichiers PDF sont autorisés pour le rapport final",
          });
        }

        // Get fiche to verify state
        const fiche = await storage.getFiche(id);
        if (!fiche) {
          return res.status(404).json({ message: "Fiche non trouvée" });
        }

        // Rename uploaded file to conventional name: final-report-{ficheId}.pdf
        const oldPath = path.join(uploadsNavettes, req.file.filename);
        const newFilename = `final-report-${id}.pdf`;
        const newPath = path.join(uploadsNavettes, newFilename);

        // Remove old file if exists
        if (fs.existsSync(newPath)) {
          fs.unlinkSync(newPath);
        }

        // Rename to conventional name
        fs.renameSync(oldPath, newPath);

        const fileUrl = `/uploads/navettes/${newFilename}`;

        // Transition fiche to FINAL_REPORT_RECEIVED
        await transitionFicheState(
          id,
          "FINAL_REPORT_RECEIVED",
          req.user.userId,
          {
            finalReportUrl: fileUrl,
            finalReportUploadedAt: new Date().toISOString(),
          },
        );

        res.json({
          url: fileUrl,
          name: req.file.originalname,
          mime: req.file.mimetype,
          size: req.file.size,
          message: "Rapport final uploadé avec succès",
        });
      } catch (error) {
        console.error("Upload final report error:", error);
        res
          .status(500)
          .json({ message: error.message || "Erreur lors du téléchargement" });
      }
    },
  );

  // NOTE: /uploads routes have been moved to server/index.ts as FTPS proxy
  // Files are served via streaming from o2switch FTPS server, not local filesystem

  // Reference data routes

  // EPCIs routes
  app.get("/api/epcis", requireAuth, async (req, res) => {
    try {
      const epcis = await storage.getAllEpcis();
      res.json(epcis);
    } catch (error) {
      console.error("Get EPCIs error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  app.get("/api/epcis/:id/organizations", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const organizations = await storage.getOrganizationsByEpci(id);
      res.json(organizations);
    } catch (error) {
      console.error("Get organizations by EPCI error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  app.get("/api/organizations", requireAuth, async (req, res) => {
    try {
      const organizations = await storage.getAllOrganizations();

      res.json(organizations);
    } catch (error) {
      console.error("Get organizations error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // Update organization
  app.put(
    "/api/organizations/:id",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updatedOrganization = await storage.updateOrganization(
          id,
          req.body,
        );
        res.json(updatedOrganization);
      } catch (error) {
        console.error("Update organization error:", error);
        res.status(500).json({
          message: "Erreur lors de la modification de l'organisation",
        });
      }
    },
  );

  // Delete organization
  app.delete(
    "/api/organizations/:id",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteOrganization(id);
        res.status(200).end();
      } catch (error) {
        console.error("Delete organization error:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de la suppression de l'organisation" });
      }
    },
  );

  // Import organizations from CSV
  app.post(
    "/api/organizations/import",
    requireAuth,
    requireRole("ADMIN"),
    uploadCSV.single("csvFile"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "Aucun fichier fourni",
          });
        }

        const csvContent = fs.readFileSync(req.file.path, "utf8");
        const rows = parseCsv(csvContent);

        if (rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Le fichier CSV est vide",
          });
        }

        const headers = rows[0].map((h) => h.trim());
        const dataRows = rows.slice(1);

        // Debug: Log headers to understand what we're receiving
        console.log("Headers received:", headers);
        console.log("Headers JSON:", JSON.stringify(headers));

        // Validate required columns
        const requiredColumns = ["Nom", "EPCI"];
        const missingColumns = requiredColumns.filter(
          (col) => !headers.includes(col),
        );
        if (missingColumns.length > 0) {
          console.log("Missing columns check:", {
            headers,
            requiredColumns,
            missingColumns,
            headersExact: headers.map((h) => `"${h}" (length: ${h.length})`),
          });
          return res.status(400).json({
            success: false,
            message: `Colonnes obligatoires manquantes : ${missingColumns.join(", ")}. Headers reçus : ${headers.join(", ")}`,
          });
        }

        const results = {
          success: true,
          processed: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [] as string[],
        };

        const organizations: any[] = [];
        const epciNames = new Set<string>();

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const orgData: CsvRow = {};

          headers.forEach((header, index) => {
            orgData[header] = (row[index] || "").trim();
          });

          results.processed++;
          const lineNum = i + 2; // +2 for header and 0-based index

          // Skip empty rows
          if (!orgData["Nom"] && !orgData["EPCI"]) {
            results.skipped++;
            continue;
          }

          // Validate required fields
          if (!orgData["Nom"]) {
            results.errors.push(
              `Ligne ${lineNum} : Le nom de la structure est obligatoire`,
            );
            continue;
          }

          if (!orgData["EPCI"]) {
            results.errors.push(`Ligne ${lineNum} : L'EPCI est obligatoire`);
            continue;
          }

          // Validate email if provided
          if (orgData["Contacts"] && !validateEmail(orgData["Contacts"])) {
            results.errors.push(
              `Ligne ${lineNum} : Format email invalide (${orgData["Contacts"]})`,
            );
            continue;
          }

          // Check if organization already exists (simplified check - will catch duplicates during insert)
          // Note: We'll rely on database uniqueness constraints for duplicate detection

          epciNames.add(orgData["EPCI"]);
          organizations.push({
            name: orgData["Nom"],
            contactName: orgData["Nom prénom de la Directrice"] || null,
            contactEmail: orgData["Contacts"] || null,
            contactPhone: orgData["Téléphone"] || null,
            contact:
              [orgData["Adresse"], orgData["Ville"]]
                .filter(Boolean)
                .join(", ") || null,
            epci: orgData["EPCI"],
            lineNumber: lineNum,
          });
        }

        if (organizations.length === 0) {
          return res.json({
            ...results,
            message: "Aucune structure valide à importer",
          });
        }

        // Get or create EPCIs
        const existingEpcis = await storage.getAllEpcis();
        const existingEpciNames = new Set(existingEpcis.map((e) => e.name));
        const newEpciNames = Array.from(epciNames).filter(
          (name) => !existingEpciNames.has(name),
        );

        let epcisInserted: any[] = [];
        if (newEpciNames.length > 0) {
          // Create EPCIs one by one
          for (const epciName of newEpciNames) {
            try {
              const newEpci = await storage.createEpci({ name: epciName });
              epcisInserted.push(newEpci);
            } catch (error: any) {
              console.error(`Failed to create EPCI ${epciName}:`, error);
            }
          }
        }

        // Build EPCI map
        const allEpcis = [...existingEpcis, ...epcisInserted];
        const epciMap = new Map(allEpcis.map((e) => [e.name, e.id]));

        // Insert or update organizations
        for (const org of organizations) {
          const epciId = epciMap.get(org.epci);
          if (!epciId) {
            results.errors.push(
              `Ligne ${org.lineNumber} : EPCI '${org.epci}' non trouvé`,
            );
            continue;
          }

          try {
            const result = await storage.upsertOrganization({
              name: org.name,
              contactName: org.contactName,
              contactEmail: org.contactEmail,
              contactPhone: org.contactPhone,
              contact: org.contact,
              epci: org.epci,
              epciId: epciId,
            });

            if (result.isNew) {
              results.imported++;
            } else {
              results.updated++;
            }
          } catch (error: any) {
            results.errors.push(
              `Ligne ${org.lineNumber} : Erreur lors de l'opération - ${error.message}`,
            );
          }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          ...results,
          message: `Import terminé : ${results.imported} nouvelles structures, ${results.updated} mises à jour, ${results.errors.length} erreurs`,
        });
      } catch (error: any) {
        console.error("CSV import error:", error);

        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
          success: false,
          message: "Erreur lors de l'import : " + error.message,
        });
      }
    },
  );

  app.get("/api/workshops", requireAuth, async (req, res) => {
    try {
      const { objectiveId } = req.query;
      let workshops;

      if (objectiveId) {
        workshops = await storage.getWorkshopsByObjective(
          objectiveId as string,
        );
      } else {
        workshops = await storage.getAllWorkshops();
      }

      // Get objectives for each workshop
      const workshopsWithObjectives = await Promise.all(
        workshops.map(async (workshop) => {
          const objective = await storage.getWorkshopObjective(
            workshop.objectiveId,
          );
          return { ...workshop, objective };
        }),
      );

      res.json(workshopsWithObjectives);
    } catch (error) {
      console.error("Get workshops error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  app.get("/api/objectives", requireAuth, async (req, res) => {
    try {
      const objectives = await storage.getAllWorkshopObjectives();
      res.json(objectives);
    } catch (error) {
      console.error("Get objectives error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // Admin routes
  app.get(
    "/api/admin/users",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const users = await storage.getAllUsers();
        res.json(users);
      } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.post(
    "/api/admin/users",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("create", "User"),
    async (req, res) => {
      try {
        const { password, ...userData } = req.body;

        // Pre-check: Verify email uniqueness
        if (userData.email) {
          const existingUser = await storage.getUserByEmail(userData.email);
          if (existingUser) {
            return res.status(409).json({
              message:
                "Cette adresse email est déjà utilisée par un autre utilisateur",
            });
          }
        }

        if (userData.role === "EVS_CS") {
          if (!userData.orgId) {
            return res.status(400).json({
              message: "L'organisation est requise pour le rôle EVS/CS",
            });
          }
          const org = await storage.getOrganization(userData.orgId);
          if (!org) {
            return res.status(400).json({ message: "Organisation invalide" });
          }
        }

        const passwordHash = await hashPassword(password);

        const user = await storage.createUser({
          ...userData,
          passwordHash,
        });

        res.status(201).json(user);
      } catch (error) {
        console.error("Create user error:", error);

        // Robust check for unique constraint violations across different DB engines
        const isUniqueViolation =
          error?.code === "23505" || // Postgres
          error?.code === "SQLITE_CONSTRAINT" ||
          error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
          error?.code === "ER_DUP_ENTRY" ||
          error?.errno === 1062 || // MySQL
          /duplicate|unique constraint|constraint failed|users?_email/i.test(
            error?.message || "",
          );

        if (isUniqueViolation) {
          return res.status(409).json({
            message:
              "Cette adresse email est déjà utilisée par un autre utilisateur",
          });
        }

        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Update user
  app.put(
    "/api/admin/users/:id",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("update", "User"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        const existing = await storage.getUser(id);
        if (!existing) {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Pre-check: Verify email uniqueness if email is being changed
        if (updateData.email && updateData.email !== existing.email) {
          const existingUser = await storage.getUserByEmail(updateData.email);
          if (existingUser) {
            return res.status(409).json({
              message:
                "Cette adresse email est déjà utilisée par un autre utilisateur",
            });
          }
        }

        // If password is provided, hash it
        if (updateData.password) {
          updateData.passwordHash = await hashPassword(updateData.password);
          delete updateData.password;
        }

        const finalRole = updateData.role || existing.role;
        const finalOrgId =
          updateData.orgId !== undefined ? updateData.orgId : existing.orgId;

        if (finalRole === "EVS_CS") {
          if (!finalOrgId) {
            return res.status(400).json({
              message: "L'organisation est requise pour le rôle EVS/CS",
            });
          }
          const org = await storage.getOrganization(finalOrgId);
          if (!org) {
            return res.status(400).json({ message: "Organisation invalide" });
          }
          updateData.orgId = finalOrgId;
        } else if (updateData.role && updateData.role !== "EVS_CS") {
          updateData.orgId = null;
        }

        const user = await storage.updateUser(id, updateData);

        res.json(user);
      } catch (error) {
        console.error("Update user error:", error);

        // Robust check for unique constraint violations across different DB engines
        const isUniqueViolation =
          error?.code === "23505" || // Postgres
          error?.code === "SQLITE_CONSTRAINT" ||
          error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
          error?.code === "ER_DUP_ENTRY" ||
          error?.errno === 1062 || // MySQL
          /duplicate|unique constraint|constraint failed|users?_email/i.test(
            error?.message || "",
          );

        if (isUniqueViolation) {
          return res.status(409).json({
            message:
              "Cette adresse email est déjà utilisée par un autre utilisateur",
          });
        }

        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Toggle user activation
  app.patch(
    "/api/admin/users/:id/activate",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("activate", "User"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { isActive } = req.body;

        const user = await storage.updateUser(id, { isActive });
        if (!user) {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json({
          message: `Utilisateur ${isActive ? "activé" : "désactivé"} avec succès`,
          user,
        });
      } catch (error) {
        console.error("Toggle user activation error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Get user by ID
  app.get(
    "/api/admin/users/:id",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const user = await storage.getUser(id);

        if (!user) {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json(user);
      } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Reset user password
  app.post(
    "/api/admin/users/:id/reset-password",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("reset_password", "User"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) {
          return res
            .status(400)
            .json({ message: "Nouveau mot de passe requis" });
        }

        const passwordHash = await hashPassword(newPassword);
        const user = await storage.updateUser(id, { passwordHash });

        if (!user) {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.json({ message: "Mot de passe réinitialisé avec succès" });
      } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Audit logs - Legacy endpoint for fiche detail view
  app.get("/api/audit", requireAuth, async (req, res) => {
    try {
      const { entity, entityId } = req.query;
      const logs = await storage.getAuditLogs(
        entityId as string,
        entity as string,
      );

      // Get actors
      const logsWithActors = await Promise.all(
        logs.map(async (log) => {
          const actor = log.actorId ? await storage.getUser(log.actorId) : null;
          return { ...log, actor };
        }),
      );

      res.json(logsWithActors);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // Admin endpoint - All audit logs with pagination and filters
  app.get(
    "/api/admin/audit-logs",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const { actorId, action, entity, search, page, limit } = req.query;

        // Récupération des logs avec pagination
        const result = await storage.getAllAuditLogs({
          actorId: actorId as string,
          action: action as string,
          entity: entity as string,
          search: search as string,
          page: page ? parseInt(page as string) : undefined,
          size: limit ? parseInt(limit as string) : undefined,
        });

        // Enrichir avec les informations des acteurs ET les références de fiches
        const logsWithEnrichedData = await Promise.all(
          result.logs.map(async (log) => {
            // Enrichir avec l'acteur
            const actor = log.actorId
              ? await storage.getUser(log.actorId)
              : null;

            // Si l'entité est une FicheNavette, enrichir avec la référence formatée
            let ficheReference = null;
            if (log.entity === "FicheNavette" && log.entityId) {
              try {
                const fiche = await storage.getFiche(log.entityId);
                if (fiche && fiche.ref) {
                  ficheReference = fiche.ref;
                }
              } catch (error) {
                // Si la fiche n'existe plus ou erreur, on garde null
                console.warn(
                  `Cannot fetch fiche reference for ${log.entityId}:`,
                  error,
                );
              }
            }

            return { ...log, actor, ficheReference };
          }),
        );

        res.json({
          logs: logsWithEnrichedData,
          total: result.total,
        });
      } catch (error) {
        console.error("Get all audit logs error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Notification endpoints for EPCI workflow
  app.post(
    "/api/notifications/evs-assignment",
    requireAuth,
    requireRole("ADMIN", "RELATIONS_EVS"),
    async (req, res) => {
      try {
        const { ficheId, orgId, orgName, contactEmail, contactName } = req.body;

        // Load fiche to get reference
        const fiche = await storage.getFiche(ficheId);
        if (!fiche) {
          return res.status(404).json({ message: "Fiche non trouvée" });
        }

        // Log notification details
        console.log("EVS Assignment Notification:", {
          ficheId,
          ficheRef: fiche.ref,
          orgId,
          orgName,
          contactEmail,
          contactName,
        });

        // Send actual email with ficheRef
        const emailResult = await emailService.sendEvsAssignmentNotification({
          contactEmail,
          contactName,
          orgName,
          ficheId,
          ficheRef: fiche.ref,
        });

        // Create audit log for notification
        await storage.createAuditLog({
          action: "email_notification",
          entity: "FicheNavette",
          entityId: ficheId,
          actorId: req.user.userId,
          meta: {
            notificationType: "evs_assignment",
            recipientEmail: contactEmail,
            recipientName: contactName,
            orgId,
            orgName,
            emailSuccess: emailResult.success,
            messageId: emailResult.messageId,
          },
        });

        if (emailResult.success) {
          res.json({
            success: true,
            message: "Notification envoyée par email",
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Erreur lors de l'envoi de l'email",
            error: emailResult.error,
          });
        }
      } catch (error) {
        console.error("EVS assignment notification error:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de l'envoi de la notification" });
      }
    },
  );

  app.post(
    "/api/notifications/emitter-return",
    requireAuth,
    requireRole("ADMIN", "RELATIONS_EVS"),
    async (req, res) => {
      try {
        const { ficheId, emitterEmail, emitterName, reason } = req.body;

        // Log notification details
        console.log("Emitter Return Notification:", {
          ficheId,
          emitterEmail,
          emitterName,
          reason,
        });

        // Send actual email
        const emailResult = await emailService.sendEmitterReturnNotification({
          emitterEmail,
          emitterName,
          ficheId,
          reason,
        });

        // Create audit log for notification
        await storage.createAuditLog({
          action: "email_notification",
          entity: "FicheNavette",
          entityId: ficheId,
          actorId: req.user.userId,
          meta: {
            notificationType: "emitter_return",
            recipientEmail: emitterEmail,
            recipientName: emitterName,
            reason,
            emailSuccess: emailResult.success,
            messageId: emailResult.messageId,
          },
        });

        if (emailResult.success) {
          res.json({
            success: true,
            message: "Notification envoyée par email",
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Erreur lors de l'envoi de l'email",
            error: emailResult.error,
          });
        }
      } catch (error) {
        console.error("Emitter return notification error:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de l'envoi de la notification" });
      }
    },
  );

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const allFiches = await storage.getAllFiches();

      // Calculate basic stats
      const activeFiches = allFiches.filter(
        (f) => !["CLOSED", "ARCHIVED"].includes(f.state),
      ).length;
      const pendingAssignment = allFiches.filter(
        (f) => f.state === "SUBMITTED_TO_FEVES",
      ).length;

      // Calculate total budget from workshops (not implemented, default 0)
      let totalBudget = 0;

      const stats = {
        activeFiches,
        pendingAssignment,
        familiesHelped: allFiches.length,
        totalBudget,
      };

      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // Admin Email Logs routes
  app.get(
    "/api/admin/email-logs",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const {
          status,
          search,
          page = "1",
          size = "50",
          sort = "createdAt:desc",
        } = req.query;
        const filters = {
          status: status as string,
          search: search as string,
          page: parseInt(page as string),
          size: parseInt(size as string),
          sort: sort as string,
        };

        const result = await storage.getEmailLogs(filters);
        res.json(result);
      } catch (error) {
        console.error("Get email logs error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.get(
    "/api/admin/email-logs/:id",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const emailLog = await storage.getEmailLog(id);

        if (!emailLog) {
          return res.status(404).json({ message: "Email log introuvable" });
        }

        res.json(emailLog);
      } catch (error) {
        console.error("Get email log error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.patch(
    "/api/admin/email-logs/:id",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("update", "EmailLog"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (
          !["intercepted", "sent", "viewed", "archived", "error"].includes(
            status,
          )
        ) {
          return res.status(400).json({ message: "Statut invalide" });
        }

        const updates: any = { status };
        if (status === "viewed" && !req.body.viewedAt) {
          updates.viewedAt = new Date();
        }

        const updatedLog = await storage.updateEmailLog(id, updates);
        res.json(updatedLog);
      } catch (error) {
        console.error("Update email log error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.post(
    "/api/admin/email-logs/:id/mark-viewed",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("mark_viewed", "EmailLog"),
    async (req, res) => {
      try {
        const { id } = req.params;

        const updatedLog = await storage.updateEmailLog(id, {
          status: "viewed",
          viewedAt: new Date(),
        });

        res.json(updatedLog);
      } catch (error) {
        console.error("Mark email viewed error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.delete(
    "/api/admin/email-logs/:id",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("delete", "EmailLog"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteEmailLog(id);
        res.json({ message: "Email log supprimé avec succès" });
      } catch (error) {
        console.error("Delete email log error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  app.delete(
    "/api/admin/email-logs",
    requireAuth,
    requireRole("ADMIN"),
    auditMiddleware("delete_all", "EmailLog"),
    async (req, res) => {
      try {
        await storage.deleteAllEmailLogs();
        res.json({ message: "Tous les email logs supprimés avec succès" });
      } catch (error) {
        console.error("Delete all email logs error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Workshop Sessions - Role-based access
  app.get(
    "/api/workshop-sessions",
    requireAuth,
    requireRole("ADMIN", "RELATIONS_EVS", "EVS_CS", "CD"),
    async (req, res) => {
      try {
        const userRole = req.user.role;
        const userOrgId = req.user.orgId;

        const sessions = await storage.getWorkshopSessions(userRole, userOrgId);
        res.json(sessions);
      } catch (error) {
        console.error("Get workshop sessions error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Upload commune contract PDF
  app.post(
    "/api/workshop-sessions/:sessionId/upload-contract",
    requireAuth,
    requireRole("ADMIN", "RELATIONS_EVS", "EVS_CS", "CD"),
    uploadContractPDF.single("contractFile"),
    validateUploadedFileMimeType,
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        const { sessionId } = req.params;

        // Check ownership for EVS_CS
        const enrollment = await storage.getWorkshopEnrollment(sessionId);
        if (!enrollment) {
          return res.status(404).json({ message: "Session non trouvée" });
        }

        if (req.user.role === "EVS_CS" && req.user.orgId !== enrollment.evsId) {
          return res.status(403).json({
            message: "Vous n'êtes pas autorisé à uploader pour cette session",
          });
        }

        const filename = req.file.filename;
        // URL RELATIVE for DB consistency (backward-compatible with middleware)
        const fileUrl = `/uploads/navettes/${filename}`;
        const localFilePath = path.join(uploadsNavettes, filename);

        // Upload vers o2switch via FTPS (uniquement en production)
        const result = await uploadNavette(localFilePath, filename);
        const ftpsSuccess = result.success;

        // En production, logger les échecs FTPS pour monitoring
        if (!ftpsSuccess && process.env.NODE_ENV === "production") {
          console.warn(
            `⚠️ [FTPS] Upload failed for ${filename} - file available locally as fallback`,
          );
        }

        res.json({
          success: true,
          filename,
          url: fileUrl,
          message: "Fichier uploadé avec succès",
          warning:
            !ftpsSuccess && process.env.NODE_ENV === "production"
              ? "Fichier disponible localement seulement (échec synchronisation FTPS)"
              : undefined,
        });
      } catch (error) {
        console.error("Error uploading contract:", error);
        res.status(500).json({ message: "Erreur lors de l'upload du contrat" });
      }
    },
  );

  // Update workshop session contracts
  app.patch(
    "/api/workshop-sessions/:sessionId/contracts",
    requireAuth,
    requireRole("ADMIN", "RELATIONS_EVS", "EVS_CS", "CD"),
    validateRequest(contractUpdateSchema),
    async (req, res) => {
      try {
        const { sessionId } = req.params;
        const {
          contractSignedByEVS,
          contractSignedByCommune,
          contractCommunePdfUrl,
        } = req.validatedData;

        console.log("Update contracts request:", {
          sessionId,
          contractSignedByEVS,
          contractSignedByCommune,
          contractCommunePdfUrl,
        });

        // Get current enrollment to check if contractSignedAt already exists
        const enrollment = await storage.getWorkshopEnrollment(sessionId);
        if (!enrollment) {
          return res.status(404).json({ message: "Session non trouvée" });
        }

        // Check if user is EVS_CS of this enrollment's organization
        if (req.user.role === "EVS_CS" && req.user.orgId !== enrollment.evsId) {
          return res.status(403).json({
            message: "Vous n'êtes pas autorisé à modifier cette session",
          });
        }

        // SERVER-SIDE VALIDATION: Enforce mutual exclusion between EVS and Commune contracts
        // Check if the update would result in both contracts being signed
        const finalEvsState =
          contractSignedByEVS !== undefined
            ? contractSignedByEVS
            : enrollment.contractSignedByEVS;
        const finalCommuneState =
          contractSignedByCommune !== undefined
            ? contractSignedByCommune
            : enrollment.contractSignedByCommune;

        if (finalEvsState === true && finalCommuneState === true) {
          return res.status(400).json({
            message:
              "Un seul type de contrat peut être signé (EVS/CS ou Commune, pas les deux). Veuillez décocher l'autre contrat avant de continuer.",
          });
        }

        // Detect if a contract is being newly signed (transition from false to true)
        const evsContractNewlySigned =
          contractSignedByEVS === true && !enrollment.contractSignedByEVS;
        const communeContractNewlySigned =
          contractSignedByCommune === true &&
          !enrollment.contractSignedByCommune;

        console.log("Contract signing detection:", {
          evsContractNewlySigned,
          communeContractNewlySigned,
          contractSignedByEVS,
          enrollmentContractSignedByEVS: enrollment.contractSignedByEVS,
          contractSignedByCommune,
          enrollmentContractSignedByCommune: enrollment.contractSignedByCommune,
        });

        // Build partial update object only with present fields
        const updates = {};
        if (contractSignedByEVS !== undefined)
          updates.contractSignedByEVS = contractSignedByEVS;
        if (contractSignedByCommune !== undefined)
          updates.contractSignedByCommune = contractSignedByCommune;
        if (contractCommunePdfUrl !== undefined)
          updates.contractCommunePdfUrl = contractCommunePdfUrl;

        // Add timestamp only if no date exists yet AND a contract is being signed
        if (
          !enrollment.contractSignedAt &&
          (contractSignedByEVS || contractSignedByCommune)
        ) {
          updates.contractSignedAt = new Date();
        }

        console.log("Updates to apply:", updates);

        await storage.updateSessionContracts(sessionId, updates);

        console.log("Contracts updated successfully");

        // Send notifications if a contract was newly signed
        if (evsContractNewlySigned || communeContractNewlySigned) {
          // Get workshop and org details for notification
          const workshop = await storage.getWorkshop(enrollment.workshopId);
          const org = await storage.getOrganization(enrollment.evsId);

          // Prepare session data for notification
          const sessionData = {
            id: sessionId,
            sessionNumber: enrollment.sessionNumber,
            workshopId: enrollment.workshopId,
            evsId: enrollment.evsId,
            workshop: workshop ? { name: workshop.name } : { name: "Atelier" },
            evs: org ? { name: org.name } : { name: "Organisation" },
          };

          // Send appropriate notification based on contract type
          if (evsContractNewlySigned) {
            console.log("🔔 Sending EVS contract subsidy notification...");
            await notificationService
              .notifyWorkshopContractEvsSignedForSubvention(sessionData)
              .catch((err) => {
                console.error("Failed to send EVS contract notification:", err);
                // Don't fail the request if notification fails
              });
          }

          if (communeContractNewlySigned) {
            console.log("🔔 Sending Commune contract start notification...");
            await notificationService
              .notifyWorkshopContractCommuneSignedForStart(sessionData)
              .catch((err) => {
                console.error(
                  "Failed to send Commune contract notification:",
                  err,
                );
                // Don't fail the request if notification fails
              });
          }
        }

        res.json({
          success: true,
          message: "Contrats mis à jour avec succès",
        });
      } catch (error) {
        console.error("Error updating session contracts:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de la mise à jour des contrats" });
      }
    },
  );

  // Mark workshop session as activity done
  app.post(
    "/api/workshop-sessions/:enrollmentId/mark-activity-done",
    requireAuth,
    requireRole("ADMIN", "EVS_CS"),
    async (req, res) => {
      try {
        const { enrollmentId } = req.params;
        const userId = req.user.userId;

        // Get the enrollment to check ownership
        const enrollment = await storage.getWorkshopEnrollment(enrollmentId);
        if (!enrollment) {
          return res.status(404).json({ message: "Inscription non trouvée" });
        }

        // Check if user is EVS_CS of this enrollment
        if (req.user.role === "EVS_CS" && req.user.orgId !== enrollment.evsId) {
          return res.status(403).json({
            message: "Vous n'êtes pas autorisé à modifier cette session",
          });
        }

        // Mark all enrollments of this session as activity done
        const result = await storage.markSessionActivityDone(
          enrollmentId,
          userId,
        );

        // Get workshop and org details for notification
        const workshop = await storage.getWorkshop(enrollment.workshopId);
        const org = await storage.getOrganization(enrollment.evsId);

        // Prepare session data for notification
        const sessionData = {
          id: enrollmentId,
          sessionNumber: enrollment.sessionNumber,
          participantCount: enrollment.participantCount,
          workshop: workshop ? { name: workshop.name } : { name: "Atelier" },
          evs: org ? { name: org.name } : { name: "Organisation" },
        };

        // Send notification to all RELATIONS_EVS users
        await notificationService
          .notifyWorkshopActivityCompleted(sessionData, result.enrollments)
          .catch((err) => {
            console.error("Failed to send notification:", err);
            // Don't fail the request if notification fails
          });

        res.json({
          success: true,
          message: `Activité marquée comme terminée pour ${result.updatedCount} inscription(s)`,
          updatedCount: result.updatedCount,
        });
      } catch (error) {
        console.error("Error marking activity done:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de la mise à jour de l'activité" });
      }
    },
  );

  // Schedule control for workshop session
  app.post(
    "/api/workshop-sessions/:enrollmentId/schedule-control",
    requireAuth,
    requireRole("ADMIN", "RELATIONS_EVS"),
    async (req, res) => {
      try {
        const { enrollmentId } = req.params;

        // Get the enrollment to check conditions
        const enrollment = await storage.getWorkshopEnrollment(enrollmentId);
        if (!enrollment) {
          return res.status(404).json({ message: "Inscription non trouvée" });
        }

        // Check if activity is done
        if (!enrollment.activityDone) {
          return res.status(400).json({
            message:
              "L'activité doit être marquée comme terminée avant de programmer le contrôle",
          });
        }

        // Check if already scheduled
        if (enrollment.controlScheduled) {
          return res.status(400).json({
            message: "Le contrôle est déjà programmé pour cette session",
          });
        }

        // Schedule control for all enrollments of this session
        const result = await storage.scheduleSessionControl(enrollmentId);

        res.json({
          success: true,
          message: `Contrôle programmé pour ${result.updatedCount} inscription(s)`,
          updatedCount: result.updatedCount,
        });
      } catch (error) {
        console.error("Error scheduling control:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de la programmation du contrôle" });
      }
    },
  );

  // Validate control for workshop session
  app.post(
    "/api/workshop-sessions/:enrollmentId/validate-control",
    requireAuth,
    requireRole("ADMIN", "RELATIONS_EVS"),
    async (req, res) => {
      try {
        const { enrollmentId } = req.params;

        // Get the enrollment to check conditions
        const enrollment = await storage.getWorkshopEnrollment(enrollmentId);
        if (!enrollment) {
          return res.status(404).json({ message: "Inscription non trouvée" });
        }

        // Check if control is scheduled
        if (!enrollment.controlScheduled) {
          return res.status(400).json({
            message: "Le contrôle doit être programmé avant d'être validé",
          });
        }

        // Check if already validated
        if (enrollment.controlValidatedAt) {
          return res.status(400).json({
            message: "Le contrôle est déjà validé pour cette session",
          });
        }

        // Validate control for all enrollments of this session
        const result = await storage.validateSessionControl(enrollmentId);

        res.json({
          success: true,
          message: `Contrôle validé pour ${result.updatedCount} inscription(s)`,
          updatedCount: result.updatedCount,
        });
      } catch (error) {
        console.error("Error validating control:", error);
        res
          .status(500)
          .json({ message: "Erreur lors de la validation du contrôle" });
      }
    },
  );

  // Get enrollments for a specific fiche
  app.get("/api/enrollments/fiche/:ficheId", requireAuth, async (req, res) => {
    try {
      const { ficheId } = req.params;

      // Get enrollments for this fiche
      const enrollments = await storage.getWorkshopEnrollments({ ficheId });

      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments for fiche:", error);
      res
        .status(500)
        .json({ message: "Erreur lors de la récupération des inscriptions" });
    }
  });

  // Upload workshop report for an enrollment
  app.post(
    "/api/enrollments/:enrollmentId/upload-report",
    requireAuth,
    requireRole("ADMIN", "EVS_CS"),
    uploadReportPDF.single("reportFile"),
    validateUploadedFileMimeType,
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        const { enrollmentId } = req.params;
        const userId = req.user.userId;

        // Check if enrollment exists and activity is done
        const enrollment = await storage.getWorkshopEnrollment(enrollmentId);
        if (!enrollment) {
          return res.status(404).json({ message: "Inscription non trouvée" });
        }

        if (!enrollment.activityDone) {
          return res.status(400).json({
            message:
              "L'activité doit être marquée comme terminée avant d'uploader le bilan",
          });
        }

        // Check if user is EVS_CS of this enrollment
        if (req.user.role === "EVS_CS" && req.user.orgId !== enrollment.evsId) {
          return res.status(403).json({
            message:
              "Vous n'êtes pas autorisé à uploader le bilan pour cette inscription",
          });
        }

        const filename = req.file.filename;
        // URL RELATIVE for DB consistency (backward-compatible with middleware)
        const fileUrl = `/uploads/bilans/${filename}`;
        const localFilePath = path.join(uploadsBilans, filename);

        // Upload vers o2switch via FTPS (uniquement en production)
        const result = await uploadBilan(localFilePath, filename);
        const ftpsSuccess = result.success;

        // En production, logger les échecs FTPS pour monitoring
        if (!ftpsSuccess && process.env.NODE_ENV === "production") {
          console.warn(
            `⚠️ [FTPS] Upload failed for ${filename} - file available locally as fallback`,
          );
        }

        // Store RELATIVE URL in database (consistent with middleware expectations)
        const updatedEnrollment = await storage.uploadEnrollmentReport(
          enrollmentId,
          fileUrl,
          userId,
        );

        // Cleanup local file after successful FTPS upload in production
        if (process.env.NODE_ENV === "production" && ftpsSuccess) {
          try {
            fs.unlinkSync(localFilePath);
          } catch (e) {
            console.warn(`⚠️ Unable to delete local file after upload: ${e.message}`);
          }
        }

        res.json({
          success: true,
          message: "Bilan uploadé avec succès",
          reportUrl: fileUrl,
          enrollment: updatedEnrollment,
          warning:
            !ftpsSuccess && process.env.NODE_ENV === "production"
              ? "Fichier disponible localement seulement (échec synchronisation FTPS)"
              : undefined,
        });
      } catch (error) {
        console.error("Error uploading report:", error);
        res.status(500).json({ message: "Erreur lors de l'upload du bilan" });
      }
    },
  );

  // Admin Dashboard stats (including email logs count)
  app.get(
    "/api/admin/stats",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const allFiches = await storage.getAllFiches();
        const allUsers = await storage.getAllUsers();
        const emailLogsResult = await storage.getEmailLogs({
          page: 1,
          size: 1,
        });

        const stats = {
          totalFiches: allFiches.length,
          activeFiches: allFiches.filter(
            (f) => !["CLOSED", "ARCHIVED"].includes(f.state),
          ).length,
          totalUsers: allUsers.length,
          totalEmailLogs: emailLogsResult.total,
          interceptedEmails: emailLogsResult.total, // In dev, all emails are intercepted
        };

        res.json(stats);
      } catch (error) {
        console.error("Get admin stats error:", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    },
  );

  // Test endpoint FTPS (ADMIN uniquement) - Pour diagnostiquer la connexion o2switch
  app.get(
    "/api/admin/test-ftp",
    requireAuth,
    requireRole("ADMIN"),
    async (req, res) => {
      try {
        const { testFTPSConnection } = await import("./utils/ftpsUpload.js");
        const result = await testFTPSConnection();

        res.json(result);
      } catch (error: any) {
        console.error("Test FTPS error: ", error);
        res.status(500).json({
          success: false,
          message: "Erreur lors du test FTPS",
          error: error.message,
        });
      }
    },
  );


  const httpServer = createServer(app);
  return httpServer;
}
