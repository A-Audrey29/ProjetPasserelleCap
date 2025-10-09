import {
  epcis, users, organizations, workshopObjectives, workshops,
  ficheNavettes, auditLogs, comments, emailLogs, workshopEnrollments,
  type Epci, type InsertEpci, type User, type InsertUser, type Organization,
  type InsertOrganization, type WorkshopObjective, type InsertWorkshopObjective, type Workshop, type InsertWorkshop,
  type FicheNavette, type InsertFicheNavette,
  type AuditLog, type InsertAuditLog, type Comment, type InsertComment,
  type EmailLog, type InsertEmailLog, type WorkshopEnrollment, type InsertWorkshopEnrollment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, ilike, count, sql } from "drizzle-orm";

export interface IStorage {
  // EPCIs
  getAllEpcis(): Promise<Epci[]>;
  getEpci(id: string): Promise<Epci | undefined>;
  createEpci(epci: InsertEpci): Promise<Epci>;
  updateEpci(id: string, epci: Partial<InsertEpci>): Promise<Epci>;
  deleteEpci(id: string): Promise<void>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Organizations
  getAllOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsByEpci(epciId: string): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;
  findOrganizationByNameAndEpci(name: string, epciId: string): Promise<Organization | undefined>;
  upsertOrganization(org: InsertOrganization): Promise<{ organization: Organization, isNew: boolean }>;

  // Workshop Objectives
  getAllWorkshopObjectives(): Promise<WorkshopObjective[]>;
  getWorkshopObjective(id: string): Promise<WorkshopObjective | undefined>;
  createWorkshopObjective(objective: InsertWorkshopObjective): Promise<WorkshopObjective>;
  updateWorkshopObjective(id: string, objective: Partial<InsertWorkshopObjective>): Promise<WorkshopObjective>;
  deleteWorkshopObjective(id: string): Promise<void>;

  // Workshops
  getAllWorkshops(): Promise<Workshop[]>;
  getWorkshop(id: string): Promise<Workshop | undefined>;
  getWorkshopsByObjective(objectiveId: string): Promise<Workshop[]>;
  createWorkshop(workshop: InsertWorkshop): Promise<Workshop>;
  updateWorkshop(id: string, workshop: Partial<InsertWorkshop>): Promise<Workshop>;
  deleteWorkshop(id: string): Promise<void>;

  // Fiche Navettes
  getAllFiches(filters?: {
    state?: string;
    assignedOrgId?: string;
    emitterId?: string;
    evsUserId?: string;
    search?: string;
  }): Promise<FicheNavette[]>;
  getFiche(id: string): Promise<FicheNavette | undefined>;
  createFiche(fiche: InsertFicheNavette): Promise<FicheNavette>;
  updateFiche(id: string, fiche: Partial<InsertFicheNavette>): Promise<FicheNavette>;
  deleteFiche(id: string): Promise<void>;

  // Audit Logs
  getAuditLogs(entityId?: string, entity?: string): Promise<AuditLog[]>;
  getAllAuditLogs(filters?: {
    actorId?: string;
    action?: string;
    entity?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<{ logs: AuditLog[], total: number }>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Comments
  getComments(ficheId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<void>;

  // Email Logs
  getEmailLogs(filters?: {
    status?: string;
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ logs: EmailLog[], total: number }>;
  getEmailLog(id: string): Promise<EmailLog | undefined>;
  createEmailLog(emailLog: InsertEmailLog): Promise<EmailLog>;
  updateEmailLog(id: string, emailLog: Partial<InsertEmailLog>): Promise<EmailLog>;
  deleteEmailLog(id: string): Promise<void>;
  deleteAllEmailLogs(): Promise<void>;

  // Workshop Enrollments
  getWorkshopEnrollments(filters?: {
    ficheId?: string;
    workshopId?: string;
    evsId?: string;
    isLocked?: boolean;
  }): Promise<WorkshopEnrollment[]>;
  getWorkshopEnrollment(id: string): Promise<WorkshopEnrollment | undefined>;
  createWorkshopEnrollment(enrollment: InsertWorkshopEnrollment): Promise<WorkshopEnrollment>;
  updateWorkshopEnrollment(id: string, enrollment: Partial<InsertWorkshopEnrollment>): Promise<WorkshopEnrollment>;
  deleteWorkshopEnrollment(id: string): Promise<void>;
  getEnrollmentsByWorkshopAndEvs(workshopId: string, evsId: string): Promise<WorkshopEnrollment[]>;
  markSessionActivityDone(sessionId: string, userId: string): Promise<{ updatedCount: number, enrollments: WorkshopEnrollment[] }>;
  uploadEnrollmentReport(enrollmentId: string, reportUrl: string, userId: string): Promise<WorkshopEnrollment>;
  scheduleSessionControl(sessionId: string): Promise<{ updatedCount: number, enrollments: WorkshopEnrollment[] }>;
  validateSessionControl(sessionId: string): Promise<{ updatedCount: number, enrollments: WorkshopEnrollment[] }>;
}

export class DatabaseStorage implements IStorage {
  // EPCIs
  async getAllEpcis(): Promise<Epci[]> {
    return await db.select().from(epcis).orderBy(asc(epcis.name));
  }

  async getEpci(id: string): Promise<Epci | undefined> {
    const [epci] = await db.select().from(epcis).where(eq(epcis.id, id));
    return epci || undefined;
  }

  async createEpci(insertEpci: InsertEpci): Promise<Epci> {
    const [epci] = await db.insert(epcis).values(insertEpci).returning();
    return epci;
  }

  async updateEpci(id: string, insertEpci: Partial<InsertEpci>): Promise<Epci> {
    const [epci] = await db.update(epcis).set(insertEpci).where(eq(epcis.id, id)).returning();
    return epci;
  }

  async deleteEpci(id: string): Promise<void> {
    await db.delete(epcis).where(eq(epcis.id, id));
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any)).orderBy(asc(users.lastName));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, insertUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set({ ...insertUser, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.lastName));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }


  // Organizations
  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(asc(organizations.name));
  }

    async getOrganization(id: string): Promise<Organization | undefined> {
      const [org] = await db.select().from(organizations).where(eq(organizations.orgId, id));
      return org || undefined;
    }

  async getOrganizationsByEpci(epciId: string): Promise<Organization[]> {
    return await db.select().from(organizations).where(eq(organizations.epciId, epciId)).orderBy(asc(organizations.name));
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(insertOrg).returning();
    return org;
  }

    async updateOrganization(id: string, insertOrg: Partial<InsertOrganization>): Promise<Organization> {
      const [org] = await db.update(organizations).set(insertOrg).where(eq(organizations.orgId, id)).returning();
      return org;
    }

    async deleteOrganization(id: string): Promise<void> {
      await db.delete(organizations).where(eq(organizations.orgId, id));
    }

    async findOrganizationByNameAndEpci(name: string, epciId: string): Promise<Organization | undefined> {
      const [org] = await db.select().from(organizations)
        .where(and(eq(organizations.name, name), eq(organizations.epciId, epciId)));
      return org || undefined;
    }

    async upsertOrganization(insertOrg: InsertOrganization): Promise<{ organization: Organization, isNew: boolean }> {
      // Check if organization already exists
      const existing = await this.findOrganizationByNameAndEpci(insertOrg.name, insertOrg.epciId);
      
      if (existing) {
        // Update existing organization
        const [updated] = await db.update(organizations)
          .set({
            contact: insertOrg.contact,
            contactName: insertOrg.contactName,
            contactEmail: insertOrg.contactEmail,
            contactPhone: insertOrg.contactPhone,
            epci: insertOrg.epci
          })
          .where(eq(organizations.orgId, existing.orgId))
          .returning();
        
        return { organization: updated, isNew: false };
      } else {
        // Create new organization
        const [created] = await db.insert(organizations).values(insertOrg).returning();
        return { organization: created, isNew: true };
      }
    }

  // Workshop Objectives
  async getAllWorkshopObjectives(): Promise<WorkshopObjective[]> {
    return await db.select().from(workshopObjectives).orderBy(asc(workshopObjectives.order));
  }

  async getWorkshopObjective(id: string): Promise<WorkshopObjective | undefined> {
    const [objective] = await db.select().from(workshopObjectives).where(eq(workshopObjectives.id, id));
    return objective || undefined;
  }

  async createWorkshopObjective(insertObjective: InsertWorkshopObjective): Promise<WorkshopObjective> {
    const [objective] = await db.insert(workshopObjectives).values(insertObjective).returning();
    return objective;
  }

  async updateWorkshopObjective(id: string, insertObjective: Partial<InsertWorkshopObjective>): Promise<WorkshopObjective> {
    const [objective] = await db.update(workshopObjectives).set(insertObjective).where(eq(workshopObjectives.id, id)).returning();
    return objective;
  }

  async deleteWorkshopObjective(id: string): Promise<void> {
    await db.delete(workshopObjectives).where(eq(workshopObjectives.id, id));
  }

  // Workshops
  async getAllWorkshops(): Promise<Workshop[]> {
    return await db.select().from(workshops).orderBy(asc(workshops.name));
  }

  async getWorkshop(id: string): Promise<Workshop | undefined> {
    const [workshop] = await db.select().from(workshops).where(eq(workshops.id, id));
    return workshop || undefined;
  }

  async getWorkshopsByObjective(objectiveId: string): Promise<Workshop[]> {
    return await db.select().from(workshops).where(eq(workshops.objectiveId, objectiveId));
  }

    async createWorkshop(insertWorkshop: InsertWorkshop): Promise<Workshop> {
      const [workshop] = await db.insert(workshops).values(insertWorkshop).returning();
      return workshop;
    }

  async updateWorkshop(id: string, insertWorkshop: Partial<InsertWorkshop>): Promise<Workshop> {
    const [workshop] = await db.update(workshops).set(insertWorkshop).where(eq(workshops.id, id)).returning();
    return workshop;
  }

  async deleteWorkshop(id: string): Promise<void> {
    await db.delete(workshops).where(eq(workshops.id, id));
  }

  // Fiche Navettes
  async getAllFiches(filters?: {
    state?: string;
    assignedOrgId?: string;
    emitterId?: string;
    evsUserId?: string;
    search?: string;
  }): Promise<FicheNavette[]> {
    let query: any = db.select().from(ficheNavettes);
    
    const conditions = [];
    if (filters?.state) conditions.push(eq(ficheNavettes.state, filters.state as any));
    if (filters?.assignedOrgId) conditions.push(eq(ficheNavettes.assignedOrgId, filters.assignedOrgId));
    if (filters?.emitterId) conditions.push(eq(ficheNavettes.emitterId, filters.emitterId));
    if (filters?.evsUserId) {
      // Filtering by EVS user is currently not implemented since organizations do not track user assignments
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(ficheNavettes.ref, `%${filters.search}%`),
          like(ficheNavettes.description, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(ficheNavettes.createdAt));
  }

  async getFiche(id: string): Promise<FicheNavette | undefined> {
    const [fiche] = await db.select().from(ficheNavettes).where(eq(ficheNavettes.id, id));
    return fiche || undefined;
  }

  async createFiche(insertFiche: InsertFicheNavette): Promise<FicheNavette> {
    const [fiche] = await db.insert(ficheNavettes).values(insertFiche).returning();
    return fiche;
  }

  async updateFiche(id: string, insertFiche: Partial<InsertFicheNavette>): Promise<FicheNavette> {
    const [fiche] = await db.update(ficheNavettes).set({ ...insertFiche, updatedAt: new Date() }).where(eq(ficheNavettes.id, id)).returning();
    return fiche;
  }

  async deleteFiche(id: string): Promise<void> {
    await db.delete(ficheNavettes).where(eq(ficheNavettes.id, id));
  }
  // Audit Logs
  async getAuditLogs(entityId?: string, entity?: string): Promise<AuditLog[]> {
      let query: any = db.select().from(auditLogs);
    
    const conditions = [];
    if (entityId) conditions.push(eq(auditLogs.entityId, entityId));
    if (entity) conditions.push(eq(auditLogs.entity, entity));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  /**
   * Récupère tous les logs d'audit avec pagination et filtres
   * Utilisé pour l'interface d'administration
   * @param filters - Filtres optionnels (actorId, action, entity, search, page, size)
   * @returns Liste paginée des logs avec le total
   */
  async getAllAuditLogs(filters?: {
    actorId?: string;
    action?: string;
    entity?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<{ logs: AuditLog[], total: number }> {
    const { actorId, action, entity, search, page = 1, size = 50 } = filters || {};
    
    // Construction des conditions WHERE
    const conditions = [];
    if (actorId) conditions.push(eq(auditLogs.actorId, actorId));
    // Utilisation de ilike pour rendre les filtres action et entity insensibles à la casse
    // Cela permet de matcher CREATE avec create, UPDATE avec update, etc.
    if (action) conditions.push(ilike(auditLogs.action, action));
    if (entity) conditions.push(ilike(auditLogs.entity, entity));
    
    // Recherche textuelle dans l'entityId
    if (search) {
      conditions.push(like(auditLogs.entityId, `%${search}%`));
    }

    // Calcul du nombre total de résultats
    const [totalResult] = await db.select({ count: count() }).from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = totalResult.count;

    // Récupération des résultats paginés
    const offset = (page - 1) * size;
    let query = db.select().from(auditLogs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const logs = await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(size)
      .offset(offset);

    return { logs, total };
  }

  // Comments
  async getComments(ficheId: string): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.ficheId, ficheId)).orderBy(asc(comments.createdAt));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  // Email Logs
  async getEmailLogs(filters?: {
    status?: string;
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ logs: EmailLog[], total: number }> {
    const { status, search, page = 1, size = 50, sort = 'createdAt:desc' } = filters || {};
    
    // Build where conditions
    const conditions = [];
    if (status) conditions.push(eq(emailLogs.status, status as any));
    if (search) {
      conditions.push(
        or(
          like(emailLogs.subject, `%${search}%`),
          like(emailLogs.html, `%${search}%`)
        )
      );
    }

    // Parse sort
    const [sortField, sortOrder] = sort.split(':');
    const orderBy = sortOrder === 'asc' ? asc : desc;
    const sortColumn = sortField === 'createdAt' ? emailLogs.createdAt :
                      sortField === 'subject' ? emailLogs.subject :
                      sortField === 'status' ? emailLogs.status :
                      emailLogs.createdAt;

    // Get total count
    const [totalResult] = await db.select({ count: count() }).from(emailLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = totalResult.count;

    // Get paginated results
    const offset = (page - 1) * size;
    let query = db.select().from(emailLogs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const logs = await query
      .orderBy(orderBy(sortColumn))
      .limit(size)
      .offset(offset);

    return { logs, total };
  }

  async getEmailLog(id: string): Promise<EmailLog | undefined> {
    const [log] = await db.select().from(emailLogs).where(eq(emailLogs.id, id));
    return log || undefined;
  }

  async createEmailLog(insertEmailLog: InsertEmailLog): Promise<EmailLog> {
    const [log] = await db.insert(emailLogs).values(insertEmailLog).returning();
    return log;
  }

  async updateEmailLog(id: string, insertEmailLog: Partial<InsertEmailLog>): Promise<EmailLog> {
    const [log] = await db.update(emailLogs)
      .set({ ...insertEmailLog, updatedAt: new Date() })
      .where(eq(emailLogs.id, id))
      .returning();
    return log;
  }

  async deleteEmailLog(id: string): Promise<void> {
    await db.delete(emailLogs).where(eq(emailLogs.id, id));
  }

  async deleteAllEmailLogs(): Promise<void> {
    await db.delete(emailLogs);
  }

  // Workshop Enrollments
  async getWorkshopEnrollments(filters?: {
    ficheId?: string;
    workshopId?: string;
    evsId?: string;
    isLocked?: boolean;
  }): Promise<WorkshopEnrollment[]> {
    const conditions = [];
    
    if (filters?.ficheId) {
      conditions.push(eq(workshopEnrollments.ficheId, filters.ficheId));
    }
    if (filters?.workshopId) {
      conditions.push(eq(workshopEnrollments.workshopId, filters.workshopId));
    }
    if (filters?.evsId) {
      conditions.push(eq(workshopEnrollments.evsId, filters.evsId));
    }
    if (filters?.isLocked !== undefined) {
      conditions.push(eq(workshopEnrollments.isLocked, filters.isLocked));
    }

    let query = db.select().from(workshopEnrollments);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(asc(workshopEnrollments.createdAt));
  }

  async getWorkshopEnrollment(id: string): Promise<WorkshopEnrollment | undefined> {
    const [enrollment] = await db.select().from(workshopEnrollments).where(eq(workshopEnrollments.id, id));
    return enrollment || undefined;
  }

  async createWorkshopEnrollment(insertEnrollment: InsertWorkshopEnrollment): Promise<WorkshopEnrollment> {
    const [enrollment] = await db.insert(workshopEnrollments).values(insertEnrollment).returning();
    return enrollment;
  }

  async updateWorkshopEnrollment(id: string, insertEnrollment: Partial<InsertWorkshopEnrollment>): Promise<WorkshopEnrollment> {
    const [enrollment] = await db.update(workshopEnrollments)
      .set({ ...insertEnrollment, updatedAt: new Date() })
      .where(eq(workshopEnrollments.id, id))
      .returning();
    return enrollment;
  }

  async deleteWorkshopEnrollment(id: string): Promise<void> {
    await db.delete(workshopEnrollments).where(eq(workshopEnrollments.id, id));
  }

  // Get workshop sessions with role-based filtering and joined data
  async getWorkshopSessions(userRole: string, userOrgId?: string): Promise<any[]> {
    let query = db
      .select({
        id: workshopEnrollments.id,
        ficheId: workshopEnrollments.ficheId,
        workshopId: workshopEnrollments.workshopId,
        evsId: workshopEnrollments.evsId,
        participantCount: workshopEnrollments.participantCount,
        sessionNumber: workshopEnrollments.sessionNumber,
        isLocked: workshopEnrollments.isLocked,
        contractSignedByEVS: workshopEnrollments.contractSignedByEVS,
        contractSignedByCommune: workshopEnrollments.contractSignedByCommune,
        contractCommuneUrl: workshopEnrollments.contractCommunePdfUrl,
        contractSignedAt: workshopEnrollments.contractSignedAt,
        activityDone: workshopEnrollments.activityDone,
        activityCompletedAt: workshopEnrollments.activityCompletedAt,
        controlScheduled: workshopEnrollments.controlScheduled,
        controlValidatedAt: workshopEnrollments.controlValidatedAt,
        createdAt: workshopEnrollments.createdAt,
        // Workshop details
        workshopName: workshops.name,
        workshopMinCapacity: workshops.minCapacity,
        workshopMaxCapacity: workshops.maxCapacity,
        // EVS details
        evsName: organizations.name
      })
      .from(workshopEnrollments)
      .leftJoin(workshops, eq(workshopEnrollments.workshopId, workshops.id))
      .leftJoin(organizations, eq(workshopEnrollments.evsId, organizations.orgId));

    // Apply role-based filtering
    if (userRole === 'EVS_CS' && userOrgId) {
      query = query.where(eq(workshopEnrollments.evsId, userOrgId)) as any;
    }
    // ADMIN, RELATIONS_EVS, CD see all sessions

    const enrollments = await query.orderBy(
      asc(workshops.name),
      asc(workshopEnrollments.sessionNumber)
    );

    // Group enrollments by (workshopId, evsId, sessionNumber)
    const sessionMap = new Map<string, {
      enrollments: typeof enrollments;
      workshopName: string;
      workshopMinCapacity: number;
      workshopMaxCapacity: number;
      evsName: string;
    }>();

    for (const enrollment of enrollments) {
      const sessionKey = `${enrollment.workshopId}-${enrollment.evsId}-${enrollment.sessionNumber}`;
      
      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          enrollments: [],
          workshopName: enrollment.workshopName || '',
          workshopMinCapacity: enrollment.workshopMinCapacity || 0,
          workshopMaxCapacity: enrollment.workshopMaxCapacity || 0,
          evsName: enrollment.evsName || ''
        });
      }
      
      sessionMap.get(sessionKey)!.enrollments.push(enrollment);
    }

    // Aggregate data for each session
    const sessions = await Promise.all(
      Array.from(sessionMap.entries()).map(async ([sessionKey, sessionData]) => {
        const { enrollments: sessionEnrollments, workshopName, workshopMinCapacity, workshopMaxCapacity, evsName } = sessionData;
        
        // Use first enrollment as base
        const baseEnrollment = sessionEnrollments[0];
        
        // Aggregate values across all enrollments in this session
        const aggregated = {
          participantCount: sessionEnrollments.reduce((sum, e) => sum + (e.participantCount || 0), 0),
          isLocked: sessionEnrollments.some(e => e.isLocked),
          contractSignedByEVS: sessionEnrollments.some(e => e.contractSignedByEVS),
          contractSignedByCommune: sessionEnrollments.some(e => e.contractSignedByCommune),
          activityDone: sessionEnrollments.some(e => e.activityDone),
          controlScheduled: sessionEnrollments.some(e => e.controlScheduled),
          // Take most recent dates (MAX)
          contractSignedAt: sessionEnrollments.reduce((latest, e) => {
            if (!e.contractSignedAt) return latest;
            if (!latest) return e.contractSignedAt;
            return new Date(e.contractSignedAt) > new Date(latest) ? e.contractSignedAt : latest;
          }, null as Date | null),
          activityCompletedAt: sessionEnrollments.reduce((latest, e) => {
            if (!e.activityCompletedAt) return latest;
            if (!latest) return e.activityCompletedAt;
            return new Date(e.activityCompletedAt) > new Date(latest) ? e.activityCompletedAt : latest;
          }, null as Date | null),
          controlValidatedAt: sessionEnrollments.reduce((latest, e) => {
            if (!e.controlValidatedAt) return latest;
            if (!latest) return e.controlValidatedAt;
            return new Date(e.controlValidatedAt) > new Date(latest) ? e.controlValidatedAt : latest;
          }, null as Date | null),
          // Take first non-null PDF URL
          contractCommunePdfUrl: sessionEnrollments.find(e => e.contractCommuneUrl)?.contractCommuneUrl || null
        };

        // Get all unique fiches for this session via their ficheIds
        const ficheIds = Array.from(new Set(sessionEnrollments.map(e => e.ficheId).filter(Boolean)));
        const fiches = ficheIds.length > 0 ? await db
          .select({
            id: ficheNavettes.id,
            ref: ficheNavettes.ref,
            familyDetailedData: ficheNavettes.familyDetailedData,
            participantsCount: ficheNavettes.participantsCount
          })
          .from(ficheNavettes)
          .where(sql`${ficheNavettes.id} IN (${sql.join(ficheIds.map(id => sql`${id}`), sql`, `)})`)
        : [];

        return {
          // Use first enrollment ID as session identifier
          id: baseEnrollment.id,
          workshopId: baseEnrollment.workshopId,
          sessionNumber: baseEnrollment.sessionNumber,
          participantCount: aggregated.participantCount,
          isLocked: aggregated.isLocked,
          contractSignedByEVS: aggregated.contractSignedByEVS,
          contractSignedByCommune: aggregated.contractSignedByCommune,
          contractCommunePdfUrl: aggregated.contractCommunePdfUrl,
          contractSignedAt: aggregated.contractSignedAt,
          activityDone: aggregated.activityDone,
          activityCompletedAt: aggregated.activityCompletedAt,
          controlScheduled: aggregated.controlScheduled,
          controlValidatedAt: aggregated.controlValidatedAt,
          createdAt: baseEnrollment.createdAt,
          workshop: {
            id: baseEnrollment.workshopId,
            name: workshopName,
            minCapacity: workshopMinCapacity,
            maxCapacity: workshopMaxCapacity
          },
          evs: {
            id: baseEnrollment.evsId,
            name: evsName
          },
          fiches: fiches.map(f => ({
            id: f.id,
            ref: f.ref,
            familyName: this.extractGuardianName(f.familyDetailedData),
            participantsCount: f.participantsCount
          }))
        };
      })
    );

    return sessions;
  }

  // Helper function to extract guardian name from familyDetailedData
  private extractGuardianName(familyDetailedData: any): string {
    if (!familyDetailedData) return 'Famille';

    try {
      const familyData = typeof familyDetailedData === 'string' 
        ? JSON.parse(familyDetailedData) 
        : familyDetailedData;

      if (familyData?.autoriteParentale) {
        const authority = familyData.autoriteParentale
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        switch (authority) {
          case 'mere':
            return familyData.mother || 'Famille';
          case 'pere':
            return familyData.father || 'Famille';
          case 'tiers':
            return familyData.tiers || familyData.guardian || 'Famille';
          default:
            break;
        }
      }

      if (familyData?.mother) return familyData.mother;
      if (familyData?.father) return familyData.father;
      if (familyData?.guardian) return familyData.guardian;

      return 'Famille';
    } catch (error) {
      console.error('Error extracting guardian name:', error);
      return 'Famille';
    }
  }

  // Update session contracts
  async updateSessionContracts(sessionId: string, contracts: {
    contractSignedByEVS?: boolean;
    contractSignedByCommune?: boolean;
    contractCommunePdfUrl?: string | null;
    contractSignedAt?: Date;
  }): Promise<void> {
    console.log('Storage: Updating session contracts', { sessionId, contracts });
    const result = await db.update(workshopEnrollments)
      .set({
        ...contracts,
        updatedAt: new Date()
      })
      .where(eq(workshopEnrollments.id, sessionId));
    console.log('Storage: Update result', result);
  }

  async getEnrollmentsByWorkshopAndEvs(workshopId: string, evsId: string): Promise<WorkshopEnrollment[]> {
    return await db.select().from(workshopEnrollments)
      .where(and(
        eq(workshopEnrollments.workshopId, workshopId),
        eq(workshopEnrollments.evsId, evsId)
      ))
      .orderBy(asc(workshopEnrollments.sessionNumber));
  }

  // Mark all enrollments of a session as activity done
  async markSessionActivityDone(sessionId: string, userId: string): Promise<{ updatedCount: number, enrollments: WorkshopEnrollment[] }> {
    // Get the enrollment to find its session info
    const enrollment = await this.getWorkshopEnrollment(sessionId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Update all enrollments with same (workshopId, evsId, sessionNumber)
    const enrollments = await db.update(workshopEnrollments)
      .set({ 
        activityDone: true,
        activityCompletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(workshopEnrollments.workshopId, enrollment.workshopId),
        eq(workshopEnrollments.evsId, enrollment.evsId),
        eq(workshopEnrollments.sessionNumber, enrollment.sessionNumber)
      ))
      .returning();

    return {
      updatedCount: enrollments.length,
      enrollments
    };
  }

  // Upload report for a specific enrollment
  async uploadEnrollmentReport(enrollmentId: string, reportUrl: string, userId: string): Promise<WorkshopEnrollment> {
    const [enrollment] = await db.update(workshopEnrollments)
      .set({
        reportUrl,
        reportUploadedAt: new Date(),
        reportUploadedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(workshopEnrollments.id, enrollmentId))
      .returning();

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    return enrollment;
  }

  // Schedule control for all enrollments of a session
  async scheduleSessionControl(sessionId: string): Promise<{ updatedCount: number, enrollments: WorkshopEnrollment[] }> {
    // Get the enrollment to find its session info
    const enrollment = await this.getWorkshopEnrollment(sessionId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Update all enrollments with same (workshopId, evsId, sessionNumber)
    const enrollments = await db.update(workshopEnrollments)
      .set({ 
        controlScheduled: true,
        updatedAt: new Date()
      })
      .where(and(
        eq(workshopEnrollments.workshopId, enrollment.workshopId),
        eq(workshopEnrollments.evsId, enrollment.evsId),
        eq(workshopEnrollments.sessionNumber, enrollment.sessionNumber)
      ))
      .returning();

    return {
      updatedCount: enrollments.length,
      enrollments
    };
  }

  // Validate control for all enrollments of a session
  async validateSessionControl(sessionId: string): Promise<{ updatedCount: number, enrollments: WorkshopEnrollment[] }> {
    // Get the enrollment to find its session info
    const enrollment = await this.getWorkshopEnrollment(sessionId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Update all enrollments with same (workshopId, evsId, sessionNumber)
    const enrollments = await db.update(workshopEnrollments)
      .set({ 
        controlValidatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(workshopEnrollments.workshopId, enrollment.workshopId),
        eq(workshopEnrollments.evsId, enrollment.evsId),
        eq(workshopEnrollments.sessionNumber, enrollment.sessionNumber)
      ))
      .returning();

    return {
      updatedCount: enrollments.length,
      enrollments
    };
  }
}

export const storage = new DatabaseStorage();
