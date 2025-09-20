import {
  epcis, users, organizations, workshopObjectives, workshops,
  ficheNavettes, auditLogs, comments,
  type Epci, type InsertEpci, type User, type InsertUser, type Organization,
  type InsertOrganization, type WorkshopObjective, type InsertWorkshopObjective, type Workshop, type InsertWorkshop,
  type FicheNavette, type InsertFicheNavette,
  type AuditLog, type InsertAuditLog, type Comment, type InsertComment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like } from "drizzle-orm";

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
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Comments
  getComments(ficheId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
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
}

export const storage = new DatabaseStorage();
