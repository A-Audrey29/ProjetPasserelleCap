import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from "./storage";
import { 
  authenticateUser, 
  generateToken, 
  setAuthCookie, 
  clearAuthCookie,
  hashPassword 
} from './auth.js';
import { requireAuth, requireRole, requireFicheAccess } from './middleware/rbac.js';
import { auditMiddleware } from './services/auditLogger.js';
import { transitionFicheState, getValidTransitions } from './services/stateTransitions.js';
import { 
  validateRequest, 
  loginSchema, 
  ficheCreationSchema, 
  assignmentSchema,
  commentSchema
} from './utils/validation.js';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

  // Auth routes
  app.post('/api/auth/login', validateRequest(loginSchema), async (req, res) => {
    try {
      const { email, password } = req.validatedData;
      const user = await authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
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

          orgId: user.orgId
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ message: 'Déconnexion réussie' });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
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
          orgId: user.orgId
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Self profile update endpoint
  app.put('/api/auth/profile', requireAuth, auditMiddleware('update', 'UserProfile'), async (req, res) => {
    try {
      const updateData = req.body;
      
      // Only allow updating specific fields
      const allowedFields = {
        structure: updateData.structure,
        phone: updateData.phone
      };

      // If password is provided, hash it
      if (updateData.password) {
        allowedFields.passwordHash = await hashPassword(updateData.password);
      }
      
      const user = await storage.updateUser(req.user.userId, allowedFields);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
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
          orgId: user.orgId
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Fiches routes
  app.get('/api/fiches', requireAuth, requireFicheAccess, async (req, res) => {
    try {
      const { state, assignedOrgId, search } = req.query;
      
      let filters = {
        state: state as string,
        assignedOrgId: assignedOrgId as string,
        search: search as string
      };

      // Apply role-based filtering
      if (req.ficheAccess.role === 'EMETTEUR') {
        filters.emitterId = req.ficheAccess.userId;
      } else if (req.ficheAccess.role === 'EVS_CS') {
        filters.assignedOrgId = req.ficheAccess.orgId;
      }

      const fiches = await storage.getAllFiches(filters);
      
      // Get related data for each fiche
      const fichesWithDetails = await Promise.all(
        fiches.map(async (fiche) => {
          const [emitter, family, assignedOrg, selections] = await Promise.all([
            storage.getUser(fiche.emitterId),
            storage.getFamily(fiche.familyId),
            fiche.assignedOrgId ? storage.getOrganization(fiche.assignedOrgId) : null,
            storage.getFicheSelections(fiche.id)
          ]);

          // Calculate total amount
          let totalAmount = 0;
          if (selections.length > 0) {
            const workshopIds = selections.map(s => s.workshopId);
            const workshops = await Promise.all(workshopIds.map(id => storage.getWorkshop(id)));
            totalAmount = selections.reduce((sum, selection) => {
              const workshop = workshops.find(w => w?.id === selection.workshopId);
              return sum + (workshop?.priceCents || 0) * selection.qty;
            }, 0);
          }

          return {
            ...fiche,
            emitter,
            family,
            assignedOrg,
            totalAmount
          };
        })
      );

      res.json(fichesWithDetails);
    } catch (error) {
      console.error('Get fiches error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.get('/api/fiches/:id', requireAuth, requireFicheAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const fiche = await storage.getFiche(id);
      
      if (!fiche) {
        return res.status(404).json({ message: 'Fiche non trouvée' });
      }

      // Check access rights
      if (req.ficheAccess.role === 'EVS_CS' && fiche.assignedOrgId !== req.ficheAccess.orgId) {
        return res.status(403).json({ message: 'Accès interdit' });
      }

      if (req.ficheAccess.role === 'EMETTEUR' && fiche.emitterId !== req.ficheAccess.userId) {
        return res.status(403).json({ message: 'Accès interdit' });
      }

      // Get related data
      const [emitter, family, assignedOrg, selections, attachments, contract, payments, verification, finalReport, comments, children] = await Promise.all([
        storage.getUser(fiche.emitterId),
        storage.getFamily(fiche.familyId),
        fiche.assignedOrgId ? storage.getOrganization(fiche.assignedOrgId) : null,
        storage.getFicheSelections(fiche.id),
        storage.getAttachments(fiche.id),
        storage.getContract(fiche.id),
        storage.getPayments(fiche.id),
        storage.getFieldVerification(fiche.id),
        storage.getFinalReport(fiche.id),
        storage.getComments(fiche.id),
        storage.getChildrenByFamily(fiche.familyId)
      ]);

      // Get workshop details for selections
      const selectionsWithWorkshops = await Promise.all(
        selections.map(async (selection) => {
          const workshop = await storage.getWorkshop(selection.workshopId);
          const objective = workshop ? await storage.getWorkshopObjective(workshop.objectiveId) : null;
          console.log(`Workshop for selection ${selection.id}:`, {
            workshopId: selection.workshopId,
            workshop: workshop ? { id: workshop.id, name: workshop.name } : null,
            objective: objective ? { code: objective.code, name: objective.name } : null
          });
          return {
            ...selection,
            workshop: workshop ? {
              ...workshop,
              objective
            } : null
          };
        })
      );

      // Get comment authors
      const commentsWithAuthors = await Promise.all(
        comments.map(async (comment) => {
          const author = await storage.getUser(comment.authorId);
          return {
            ...comment,
            author
          };
        })
      );

      const ficheDetails = {
        ...fiche,
        emitter,
        family,
        assignedOrg,
        selections: selectionsWithWorkshops,
        attachments,
        contract,
        payments,
        verification,
        finalReport,
        comments: commentsWithAuthors,
        children,
        validTransitions: getValidTransitions(req.ficheAccess.role, fiche.state)
      };

      res.json(ficheDetails);
    } catch (error) {
      console.error('Get fiche detail error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.post('/api/fiches', requireAuth, requireRole('ADMIN', 'EMETTEUR', 'RELATIONS_EVS'), validateRequest(ficheCreationSchema), auditMiddleware('create', 'FicheNavette'), async (req, res) => {
    try {
      const { 
        familyId, 
        description, 
        workshops, 
        referentData, 
        familyDetailedData, 
        childrenData, 
        workshopPropositions,
        familyConsent 
      } = req.validatedData;


      // Generate reference number
      const year = new Date().getFullYear();
      const existingFiches = await storage.getAllFiches();
      const count = existingFiches.filter(f => f.ref.startsWith(`FN-${year}`)).length + 1;
      const ref = `FN-${year}-${count.toString().padStart(3, '0')}`;

      // Create fiche with all detailed data
      const fiche = await storage.createFiche({
        ref,
        emitterId: req.user.userId,
        familyId,
        description,
        state: 'DRAFT',
        referentData: referentData || null,
        familyDetailedData: familyDetailedData || null,
        childrenData: childrenData || null,
        workshopPropositions: workshopPropositions || null,
        familyConsent: familyConsent || false
      });

      // Create workshop selections
      for (const workshopSelection of workshops) {
        await storage.createFicheSelection({
          ficheId: fiche.id,
          workshopId: workshopSelection.workshopId,
          qty: workshopSelection.qty
        });
      }

      res.status(201).json(fiche);
    } catch (error) {
      console.error('Create fiche error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.patch('/api/fiches/:id', requireAuth, requireFicheAccess, auditMiddleware('update', 'FicheNavette'), async (req, res) => {
    try {
      const { id } = req.params;
      const fiche = await storage.getFiche(id);
      
      if (!fiche) {
        return res.status(404).json({ message: 'Fiche non trouvée' });
      }

      // Check edit permissions
      if (req.ficheAccess.role === 'EMETTEUR' && fiche.emitterId !== req.ficheAccess.userId) {
        return res.status(403).json({ message: 'Accès interdit' });
      }

      if (req.ficheAccess.role === 'EMETTEUR' && fiche.state !== 'DRAFT') {
        return res.status(403).json({ message: 'Modification interdite - Fiche déjà envoyée' });
      }

      // Extract the detailed form data from request body
      const { 
        description, 
        referentData, 
        familyDetailedData, 
        childrenData, 
        workshopPropositions,
        familyConsent,
        ...otherFields 
      } = req.body;

      const updateData = {
        ...otherFields,
        description,
        referentData: referentData || null,
        familyDetailedData: familyDetailedData || null,
        childrenData: childrenData || null,
        workshopPropositions: workshopPropositions || null,
        familyConsent: familyConsent || false
      };

      const updatedFiche = await storage.updateFiche(id, updateData);
      res.json(updatedFiche);
    } catch (error) {
      console.error('Update fiche error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.post('/api/fiches/:id/transition', requireAuth, requireRole('ADMIN', 'EMETTEUR', 'RELATIONS_EVS', 'CD'), requireFicheAccess, auditMiddleware('transition', 'FicheNavette'), async (req, res) => {
    try {
      const { id } = req.params;
      const { newState, metadata } = req.body;

      const updatedFiche = await transitionFicheState(id, newState, req.user.userId, metadata);
      res.json(updatedFiche);
    } catch (error) {
      console.error('Transition error:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/fiches/:id/assign', requireAuth, requireRole('RELATIONS_EVS'), validateRequest(assignmentSchema), auditMiddleware('assign', 'FicheNavette'), async (req, res) => {
    try {
      const { id } = req.params;
      const { assignedOrgId } = req.validatedData;

      const fiche = await storage.getFiche(id);
      if (!fiche) {
        return res.status(404).json({ message: 'Fiche non trouvée' });
      }

      if (fiche.state !== 'SUBMITTED_TO_FEVES') {
        return res.status(400).json({ message: 'Impossible d\'affecter cette fiche dans son état actuel' });
      }

      const updatedFiche = await storage.updateFiche(id, { assignedOrgId });
      await transitionFicheState(id, 'ASSIGNED_TO_EVS', req.user.userId, { assignedOrgId });

      res.json(updatedFiche);
    } catch (error) {
      console.error('Assignment error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Delete fiche (admin only)
  app.delete('/api/fiches/:id', requireAuth, requireRole('ADMIN'), auditMiddleware('delete', 'FicheNavette'), async (req, res) => {
    try {
      const { id } = req.params;
      
      const fiche = await storage.getFiche(id);
      if (!fiche) {
        return res.status(404).json({ message: 'Fiche non trouvée' });
      }

      await storage.deleteFiche(id);
      res.json({ message: 'Fiche supprimée avec succès' });
    } catch (error) {
      console.error('Delete fiche error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Comments
  app.get('/api/fiches/:id/comments', requireAuth, requireFicheAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const comments = await storage.getComments(id);
      
      // Get authors
      const commentsWithAuthors = await Promise.all(
        comments.map(async (comment) => {
          const author = await storage.getUser(comment.authorId);
          return { ...comment, author };
        })
      );

      res.json(commentsWithAuthors);
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.post('/api/fiches/:id/comments', requireAuth, requireFicheAccess, validateRequest(commentSchema), auditMiddleware('comment', 'FicheNavette'), async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.validatedData;

      const comment = await storage.createComment({
        ficheId: id,
        authorId: req.user.userId,
        content
      });

      const author = await storage.getUser(comment.authorId);
      res.status(201).json({ ...comment, author });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // File uploads
  app.post('/api/uploads', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier fourni' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        url: fileUrl,
        name: req.file.originalname,
        mime: req.file.mimetype,
        size: req.file.size
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Erreur lors du téléchargement' });
    }
  });

  // Serve uploaded files
  app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    res.sendFile(filePath);
  });

  // Attachments
  app.post('/api/fiches/:id/attachments', requireAuth, requireFicheAccess, auditMiddleware('attach', 'FicheNavette'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, url, mime } = req.body;

      const attachment = await storage.createAttachment({
        ficheId: id,
        name,
        url,
        mime,
        uploadedBy: req.user.userId
      });

      res.status(201).json(attachment);
    } catch (error) {
      console.error('Create attachment error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Reference data routes

  app.get('/api/organizations', requireAuth, async (req, res) => {
    try {
      const organizations = await storage.getAllOrganizations();

      res.json(organizations);
    } catch (error) {
      console.error('Get organizations error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.get('/api/workshops', requireAuth, async (req, res) => {
    try {
      const { objectiveId } = req.query;
      let workshops;
      
      if (objectiveId) {
        workshops = await storage.getWorkshopsByObjective(objectiveId as string);
      } else {
        workshops = await storage.getAllWorkshops();
      }

      // Get objectives for each workshop
      const workshopsWithObjectives = await Promise.all(
        workshops.map(async (workshop) => {
          const objective = await storage.getWorkshopObjective(workshop.objectiveId);
          return { ...workshop, objective };
        })
      );

      res.json(workshopsWithObjectives);
    } catch (error) {
      console.error('Get workshops error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.get('/api/objectives', requireAuth, async (req, res) => {
    try {
      const objectives = await storage.getAllWorkshopObjectives();
      res.json(objectives);
    } catch (error) {
      console.error('Get objectives error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.get('/api/families', requireAuth, async (req, res) => {
    try {
      const families = await storage.getAllFamilies();
      res.json(families);
    } catch (error) {
      console.error('Get families error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Create new family
  app.post('/api/families', requireAuth, requireRole('EMETTEUR'), async (req, res) => {
    try {
      const family = await storage.createFamily(req.body);
      res.status(201).json(family);
    } catch (error) {
      console.error('Create family error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  app.post('/api/admin/users', requireAuth, requireRole('ADMIN'), auditMiddleware('create', 'User'), async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      const passwordHash = await hashPassword(password);
      
      const user = await storage.createUser({
        ...userData,
        passwordHash
      });

      res.status(201).json(user);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Update user
  app.put('/api/admin/users/:id', requireAuth, requireRole('ADMIN'), auditMiddleware('update', 'User'), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // If password is provided, hash it
      if (updateData.password) {
        updateData.passwordHash = await hashPassword(updateData.password);
        delete updateData.password;
      }
      
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.json(user);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Toggle user activation
  app.patch('/api/admin/users/:id/activate', requireAuth, requireRole('ADMIN'), auditMiddleware('activate', 'User'), async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      const user = await storage.updateUser(id, { isActive });
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.json({ message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`, user });
    } catch (error) {
      console.error('Toggle user activation error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Get user by ID
  app.get('/api/admin/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Reset user password
  app.post('/api/admin/users/:id/reset-password', requireAuth, requireRole('ADMIN'), auditMiddleware('reset_password', 'User'), async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword) {
        return res.status(400).json({ message: 'Nouveau mot de passe requis' });
      }
      
      const passwordHash = await hashPassword(newPassword);
      const user = await storage.updateUser(id, { passwordHash });
      
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Audit logs
  app.get('/api/audit', requireAuth, async (req, res) => {
    try {
      const { entity, entityId } = req.query;
      const logs = await storage.getAuditLogs(entityId as string, entity as string);
      
      // Get actors
      const logsWithActors = await Promise.all(
        logs.map(async (log) => {
          const actor = log.actorId ? await storage.getUser(log.actorId) : null;
          return { ...log, actor };
        })
      );

      res.json(logsWithActors);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const allFiches = await storage.getAllFiches();
      
      // Calculate basic stats
      const activeFiches = allFiches.filter(f => !['CLOSED', 'ARCHIVED'].includes(f.state)).length;
      const pendingAssignment = allFiches.filter(f => f.state === 'SUBMITTED_TO_FEVES').length;
      const uniqueFamilies = new Set(allFiches.map(f => f.familyId));
      
      // Calculate total budget from workshop selections
      let totalBudget = 0;
      for (const fiche of allFiches) {
        const selections = await storage.getFicheSelections(fiche.id);
        for (const selection of selections) {
          const workshop = await storage.getWorkshop(selection.workshopId);
          if (workshop) {
            totalBudget += workshop.priceCents * selection.qty;
          }
        }
      }
      
      const stats = {
        activeFiches,
        pendingAssignment,
        familiesHelped: uniqueFamilies.size,
        totalBudget
      };

      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
