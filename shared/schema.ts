import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum("role", ["ADMIN", "SUIVI_PROJETS", "EMETTEUR", "RELATIONS_EVS", "EVS_CS", "CD"]);
export const orgTypeEnum = pgEnum("org_type", ["EVS", "CS", "OTHER"]);
export const ficheStateEnum = pgEnum("fiche_state", [
  "DRAFT", "SUBMITTED_TO_CD", "SUBMITTED_TO_FEVES", "ASSIGNED_EVS", "ACCEPTED_EVS", "EVS_REJECTED", "NEEDS_INFO",
  "CONTRACT_SENT", "CONTRACT_SIGNED", "ADVANCE_70_PAID", "ACTIVITY_DONE", "FIELD_CHECK_SCHEDULED",
  "FIELD_CHECK_DONE", "FINAL_REPORT_RECEIVED", "REMAINING_30_PAID", "CLOSED", "ARCHIVED"
]);
export const paymentKindEnum = pgEnum("payment_kind", ["ADVANCE_70", "REMAINING_30"]);

// Tables
export const epcis = pgTable("epcis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("epcis_name_idx").on(table.name),
}));

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: roleEnum("role").notNull(),
  structure: text("structure"),
  phone: text("phone"),
  orgId: varchar("org_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  roleIdx: index("users_role_idx").on(table.role),
}));

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: orgTypeEnum("type").notNull(),
  address: text("address"),
  contactPersonName: text("contact_person_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  epciId: varchar("epci_id").notNull(),
  userId: varchar("user_id"), // EVS/CS contact user ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("organizations_type_idx").on(table.type),
  epciIdx: index("organizations_epci_idx").on(table.epciId),
}));

export const families = pgTable("families", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  mother: text("mother"),
  father: text("father"),
  guardian: text("guardian"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  codeIdx: index("families_code_idx").on(table.code),
}));

export const children = pgTable("children", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  firstName: text("first_name"),
  birthDate: timestamp("birth_date"),
  level: text("level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  familyIdx: index("children_family_idx").on(table.familyId),
}));

export const workshopObjectives = pgTable("workshop_objectives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workshops = pgTable("workshops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectiveId: varchar("objective_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  orgId: varchar("org_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  objectiveIdx: index("workshops_objective_idx").on(table.objectiveId),
  orgIdx: index("workshops_org_idx").on(table.orgId),
}));

export const ficheNavettes = pgTable("fiche_navettes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ref: text("ref").notNull().unique(),
  state: ficheStateEnum("state").notNull().default("DRAFT"),
  emitterId: varchar("emitter_id").notNull(),
  familyId: varchar("family_id").notNull(),
  assignedOrgId: varchar("assigned_org_id"),
  description: text("description"),
  
  // Referent information
  referentData: json("referent_data"), // Store complete referent information
  
  // Family detailed information (extending beyond basic family table)
  familyDetailedData: json("family_detailed_data"), // Store complete family form data
  
  // Children information
  childrenData: json("children_data"), // Store children details from form
  
  // Workshop propositions from referent
  workshopPropositions: json("workshop_propositions"), // Store referent propositions for each workshop
  
  // Family consent
  familyConsent: boolean("family_consent").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  refIdx: index("fiche_navettes_ref_idx").on(table.ref),
  stateIdx: index("fiche_navettes_state_idx").on(table.state),
  emitterIdx: index("fiche_navettes_emitter_idx").on(table.emitterId),
  assignedOrgIdx: index("fiche_navettes_assigned_org_idx").on(table.assignedOrgId),
}));

export const ficheWorkshopSelections = pgTable("fiche_workshop_selections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ficheId: varchar("fiche_id").notNull(),
  workshopId: varchar("workshop_id").notNull(),
  qty: integer("qty").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ficheIdx: index("fiche_workshop_selections_fiche_idx").on(table.ficheId),
  workshopIdx: index("fiche_workshop_selections_workshop_idx").on(table.workshopId),
}));

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ficheId: varchar("fiche_id").notNull().unique(),
  orgSigned: boolean("org_signed").notNull().default(false),
  fevesSigned: boolean("feves_signed").notNull().default(false),
  signedAt: timestamp("signed_at"),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ficheIdx: index("contracts_fiche_idx").on(table.ficheId),
}));

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ficheId: varchar("fiche_id").notNull(),
  kind: paymentKindEnum("kind").notNull(),
  amountCents: integer("amount_cents").notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ficheIdx: index("payments_fiche_idx").on(table.ficheId),
  kindIdx: index("payments_kind_idx").on(table.kind),
}));

export const fieldVerifications = pgTable("field_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ficheId: varchar("fiche_id").notNull().unique(),
  scheduledAt: timestamp("scheduled_at"),
  doneAt: timestamp("done_at"),
  reportUrl: text("report_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ficheIdx: index("field_verifications_fiche_idx").on(table.ficheId),
}));

export const finalReports = pgTable("final_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ficheId: varchar("fiche_id").notNull().unique(),
  evaluation: text("evaluation"),
  difficulties: text("difficulties"),
  recommendations: text("recommendations"),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ficheIdx: index("final_reports_fiche_idx").on(table.ficheId),
}));

export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ficheId: varchar("fiche_id").notNull(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  url: text("url").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ficheIdx: index("attachments_fiche_idx").on(table.ficheId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: varchar("entity_id").notNull(),
  meta: json("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  actorIdx: index("audit_logs_actor_idx").on(table.actorId),
  entityIdx: index("audit_logs_entity_idx").on(table.entityId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ficheId: varchar("fiche_id").notNull(),
  authorId: varchar("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ficheIdx: index("comments_fiche_idx").on(table.ficheId),
}));

// Relations
export const epcisRelations = relations(epcis, ({ many }) => ({
  organizations: many(organizations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
  emittedFiches: many(ficheNavettes),
  auditLogs: many(auditLogs),
  comments: many(comments),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  epci: one(epcis, { fields: [organizations.epciId], references: [epcis.id] }),
  users: many(users),
  workshops: many(workshops),
  assignedFiches: many(ficheNavettes),
}));

export const familiesRelations = relations(families, ({ many }) => ({
  children: many(children),
  fiches: many(ficheNavettes),
}));

export const childrenRelations = relations(children, ({ one }) => ({
  family: one(families, { fields: [children.familyId], references: [families.id] }),
}));

export const workshopObjectivesRelations = relations(workshopObjectives, ({ many }) => ({
  workshops: many(workshops),
}));

export const workshopsRelations = relations(workshops, ({ one, many }) => ({
  objective: one(workshopObjectives, { fields: [workshops.objectiveId], references: [workshopObjectives.id] }),
  organization: one(organizations, { fields: [workshops.orgId], references: [organizations.id] }),
  selections: many(ficheWorkshopSelections),
}));

export const ficheNavettesRelations = relations(ficheNavettes, ({ one, many }) => ({
  emitter: one(users, { fields: [ficheNavettes.emitterId], references: [users.id] }),
  family: one(families, { fields: [ficheNavettes.familyId], references: [families.id] }),
  assignedOrg: one(organizations, { fields: [ficheNavettes.assignedOrgId], references: [organizations.id] }),
  selections: many(ficheWorkshopSelections),
  attachments: many(attachments),
  contract: one(contracts),
  payments: many(payments),
  verification: one(fieldVerifications),
  finalReport: one(finalReports),
  comments: many(comments),
}));

export const ficheWorkshopSelectionsRelations = relations(ficheWorkshopSelections, ({ one }) => ({
  fiche: one(ficheNavettes, { fields: [ficheWorkshopSelections.ficheId], references: [ficheNavettes.id] }),
  workshop: one(workshops, { fields: [ficheWorkshopSelections.workshopId], references: [workshops.id] }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  fiche: one(ficheNavettes, { fields: [contracts.ficheId], references: [ficheNavettes.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  fiche: one(ficheNavettes, { fields: [payments.ficheId], references: [ficheNavettes.id] }),
}));

export const fieldVerificationsRelations = relations(fieldVerifications, ({ one }) => ({
  fiche: one(ficheNavettes, { fields: [fieldVerifications.ficheId], references: [ficheNavettes.id] }),
}));

export const finalReportsRelations = relations(finalReports, ({ one }) => ({
  fiche: one(ficheNavettes, { fields: [finalReports.ficheId], references: [ficheNavettes.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  fiche: one(ficheNavettes, { fields: [attachments.ficheId], references: [ficheNavettes.id] }),
  uploadedByUser: one(users, { fields: [attachments.uploadedBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  fiche: one(ficheNavettes, { fields: [comments.ficheId], references: [ficheNavettes.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

// Insert schemas
export const insertEpciSchema = createInsertSchema(epcis).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true,
});

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  createdAt: true,
});

export const insertWorkshopObjectiveSchema = createInsertSchema(workshopObjectives).omit({
  id: true,
  createdAt: true,
});

export const insertWorkshopSchema = createInsertSchema(workshops).omit({
  id: true,
  createdAt: true,
});

export const insertFicheNavetteSchema = createInsertSchema(ficheNavettes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFicheWorkshopSelectionSchema = createInsertSchema(ficheWorkshopSelections).omit({
  id: true,
  createdAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertFieldVerificationSchema = createInsertSchema(fieldVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertFinalReportSchema = createInsertSchema(finalReports).omit({
  id: true,
  createdAt: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

// Types
export type Epci = typeof epcis.$inferSelect;
export type InsertEpci = z.infer<typeof insertEpciSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Family = typeof families.$inferSelect;
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Child = typeof children.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type WorkshopObjective = typeof workshopObjectives.$inferSelect;
export type InsertWorkshopObjective = z.infer<typeof insertWorkshopObjectiveSchema>;
export type Workshop = typeof workshops.$inferSelect;
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type FicheNavette = typeof ficheNavettes.$inferSelect;
export type InsertFicheNavette = z.infer<typeof insertFicheNavetteSchema>;
export type FicheWorkshopSelection = typeof ficheWorkshopSelections.$inferSelect;
export type InsertFicheWorkshopSelection = z.infer<typeof insertFicheWorkshopSelectionSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type FieldVerification = typeof fieldVerifications.$inferSelect;
export type InsertFieldVerification = z.infer<typeof insertFieldVerificationSchema>;
export type FinalReport = typeof finalReports.$inferSelect;
export type InsertFinalReport = z.infer<typeof insertFinalReportSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
