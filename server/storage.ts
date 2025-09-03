import {
  epcis, users, organizations, families, children, workshopObjectives, workshops,
  ficheNavettes, ficheWorkshopSelections, contracts, payments, fieldVerifications,
  finalReports, attachments, auditLogs, comments,
  type Epci, type InsertEpci, type User, type InsertUser, type Organization,
  type InsertOrganization, type Family, type InsertFamily, type Child, type InsertChild,
  type WorkshopObjective, type InsertWorkshopObjective, type Workshop, type InsertWorkshop,
  type FicheNavette, type InsertFicheNavette, type FicheWorkshopSelection,
  type InsertFicheWorkshopSelection, type Contract, type InsertContract,
  type Payment, type InsertPayment, type FieldVerification, type InsertFieldVerification,
  type FinalReport, type InsertFinalReport, type Attachment, type InsertAttachment,
  type AuditLog, type InsertAuditLog, type Comment, type InsertComment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, inArray } from "drizzle-orm";

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

  // Families
  getAllFamilies(): Promise<Family[]>;
  getFamily(id: string): Promise<Family | undefined>;
  getFamilyByCode(code: string): Promise<Family | undefined>;
  createFamily(family: InsertFamily): Promise<Family>;
  updateFamily(id: string, family: Partial<InsertFamily>): Promise<Family>;
  deleteFamily(id: string): Promise<void>;

  // Children
  getChildrenByFamily(familyId: string): Promise<Child[]>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: string, child: Partial<InsertChild>): Promise<Child>;
  deleteChild(id: string): Promise<void>;

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
  getWorkshopsByOrganization(orgId: string): Promise<Workshop[]>;
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

  // Fiche Workshop Selections
  getFicheSelections(ficheId: string): Promise<FicheWorkshopSelection[]>;
  createFicheSelection(selection: InsertFicheWorkshopSelection): Promise<FicheWorkshopSelection>;
  deleteFicheSelections(ficheId: string): Promise<void>;

  // Contracts
  getContract(ficheId: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(ficheId: string, contract: Partial<InsertContract>): Promise<Contract>;

  // Payments
  getPayments(ficheId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment>;

  // Field Verifications
  getFieldVerification(ficheId: string): Promise<FieldVerification | undefined>;
  createFieldVerification(verification: InsertFieldVerification): Promise<FieldVerification>;
  updateFieldVerification(ficheId: string, verification: Partial<InsertFieldVerification>): Promise<FieldVerification>;

  // Final Reports
  getFinalReport(ficheId: string): Promise<FinalReport | undefined>;
  createFinalReport(report: InsertFinalReport): Promise<FinalReport>;
  updateFinalReport(ficheId: string, report: Partial<InsertFinalReport>): Promise<FinalReport>;

  // Attachments
  getAttachments(ficheId: string): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;

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
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
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
    const [org] = await db.update(organizations).set(insertOrg).where(eq(organizations.id, id)).returning();
    return org;
  }

  async deleteOrganization(id: string): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  // Families
  async getAllFamilies(): Promise<Family[]> {
    return await db.select().from(families).orderBy(asc(families.code));
  }

  async getFamily(id: string): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.id, id));
    return family || undefined;
  }

  async getFamilyByCode(code: string): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.code, code));
    return family || undefined;
  }

  async createFamily(insertFamily: InsertFamily): Promise<Family> {
    const [family] = await db.insert(families).values(insertFamily).returning();
    return family;
  }

  async updateFamily(id: string, insertFamily: Partial<InsertFamily>): Promise<Family> {
    const [family] = await db.update(families).set(insertFamily).where(eq(families.id, id)).returning();
    return family;
  }

  async deleteFamily(id: string): Promise<void> {
    await db.delete(families).where(eq(families.id, id));
  }

  // Children
  async getChildrenByFamily(familyId: string): Promise<Child[]> {
    return await db.select().from(children).where(eq(children.familyId, familyId));
  }

  async createChild(insertChild: InsertChild): Promise<Child> {
    const [child] = await db.insert(children).values(insertChild).returning();
    return child;
  }

  async updateChild(id: string, insertChild: Partial<InsertChild>): Promise<Child> {
    const [child] = await db.update(children).set(insertChild).where(eq(children.id, id)).returning();
    return child;
  }

  async deleteChild(id: string): Promise<void> {
    await db.delete(children).where(eq(children.id, id));
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

  async getWorkshopsByOrganization(orgId: string): Promise<Workshop[]> {
    return await db.select().from(workshops).where(eq(workshops.orgId, orgId));
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
    let query = db.select().from(ficheNavettes);
    
    const conditions = [];
    if (filters?.state) conditions.push(eq(ficheNavettes.state, filters.state as any));
    if (filters?.assignedOrgId) conditions.push(eq(ficheNavettes.assignedOrgId, filters.assignedOrgId));
    if (filters?.emitterId) conditions.push(eq(ficheNavettes.emitterId, filters.emitterId));
    if (filters?.evsUserId) {
      // Join with organizations to filter by user_id
      // Include fiches assigned to EVS user in ASSIGNED_EVS and ACCEPTED_EVS states
      query = query
        .innerJoin(organizations, eq(ficheNavettes.assignedOrgId, organizations.id));
      conditions.push(and(
        eq(organizations.userId, filters.evsUserId),
        or(
          eq(ficheNavettes.state, 'ASSIGNED_EVS' as any),
          eq(ficheNavettes.state, 'ACCEPTED_EVS' as any)
        )
      ));
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

  // Fiche Workshop Selections
  async getFicheSelections(ficheId: string): Promise<FicheWorkshopSelection[]> {
    return await db.select().from(ficheWorkshopSelections).where(eq(ficheWorkshopSelections.ficheId, ficheId));
  }

  async createFicheSelection(insertSelection: InsertFicheWorkshopSelection): Promise<FicheWorkshopSelection> {
    const [selection] = await db.insert(ficheWorkshopSelections).values(insertSelection).returning();
    return selection;
  }

  async deleteFicheSelections(ficheId: string): Promise<void> {
    await db.delete(ficheWorkshopSelections).where(eq(ficheWorkshopSelections.ficheId, ficheId));
  }

  // Contracts
  async getContract(ficheId: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.ficheId, ficheId));
    return contract || undefined;
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const [contract] = await db.insert(contracts).values(insertContract).returning();
    return contract;
  }

  async updateContract(ficheId: string, insertContract: Partial<InsertContract>): Promise<Contract> {
    const [contract] = await db.update(contracts).set(insertContract).where(eq(contracts.ficheId, ficheId)).returning();
    return contract;
  }

  // Payments
  async getPayments(ficheId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.ficheId, ficheId));
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async updatePayment(id: string, insertPayment: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db.update(payments).set(insertPayment).where(eq(payments.id, id)).returning();
    return payment;
  }

  // Field Verifications
  async getFieldVerification(ficheId: string): Promise<FieldVerification | undefined> {
    const [verification] = await db.select().from(fieldVerifications).where(eq(fieldVerifications.ficheId, ficheId));
    return verification || undefined;
  }

  async createFieldVerification(insertVerification: InsertFieldVerification): Promise<FieldVerification> {
    const [verification] = await db.insert(fieldVerifications).values(insertVerification).returning();
    return verification;
  }

  async updateFieldVerification(ficheId: string, insertVerification: Partial<InsertFieldVerification>): Promise<FieldVerification> {
    const [verification] = await db.update(fieldVerifications).set(insertVerification).where(eq(fieldVerifications.ficheId, ficheId)).returning();
    return verification;
  }

  // Final Reports
  async getFinalReport(ficheId: string): Promise<FinalReport | undefined> {
    const [report] = await db.select().from(finalReports).where(eq(finalReports.ficheId, ficheId));
    return report || undefined;
  }

  async createFinalReport(insertReport: InsertFinalReport): Promise<FinalReport> {
    const [report] = await db.insert(finalReports).values(insertReport).returning();
    return report;
  }

  async updateFinalReport(ficheId: string, insertReport: Partial<InsertFinalReport>): Promise<FinalReport> {
    const [report] = await db.update(finalReports).set(insertReport).where(eq(finalReports.ficheId, ficheId)).returning();
    return report;
  }

  // Attachments
  async getAttachments(ficheId: string): Promise<Attachment[]> {
    return await db.select().from(attachments).where(eq(attachments.ficheId, ficheId)).orderBy(desc(attachments.createdAt));
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const [attachment] = await db.insert(attachments).values(insertAttachment).returning();
    return attachment;
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  // Audit Logs
  async getAuditLogs(entityId?: string, entity?: string): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
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
