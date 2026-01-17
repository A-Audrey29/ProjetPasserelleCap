import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, json, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum("role", ["ADMIN", "SUIVI_PROJETS", "EMETTEUR", "RELATIONS_EVS", "EVS_CS", "CD"]);
export const orgTypeEnum = pgEnum("org_type", ["EVS", "CS", "OTHER"]);
export const ficheStateEnum = pgEnum("fiche_state", [
  "DRAFT", "SUBMITTED_TO_FEVES", "ASSIGNED_EVS", "ACCEPTED_EVS", "EVS_REJECTED",
  "CONTRACT_SIGNED", "ACTIVITY_DONE", "FIELD_CHECK_SCHEDULED",
  "FIELD_CHECK_DONE", "FINAL_REPORT_RECEIVED", "CLOSED", "ARCHIVED"
]);
export const emailStatusEnum = pgEnum("email_status", ["intercepted", "sent", "viewed", "archived", "error"]);

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
  orgId: varchar("org_id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contact: text("contact"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  epci: text("epci"),
  epciId: varchar("epci_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  epciIdx: index("organizations_epci_idx").on(table.epciId),
}));


export const workshopObjectives = pgTable("workshop_objectives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workshops = pgTable("workshops", {
  id: varchar("id").primaryKey(),
  objectiveId: varchar("objective_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  // Capacités pour gestion collective des ateliers
  minCapacity: integer("min_capacity"), // Seuil minimum pour démarrer
  maxCapacity: integer("max_capacity"), // Capacité maximum avant nouvelle session
}, (table) => ({
  objectiveIdx: index("workshops_objective_idx").on(table.objectiveId),
}));

// Table pour le tracking collectif des inscriptions aux ateliers
export const workshopEnrollments = pgTable("workshop_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ficheId: varchar("fiche_id").notNull(), // Référence vers fiche_navettes
  workshopId: varchar("workshop_id").notNull(), // Référence vers workshops
  evsId: varchar("evs_id").notNull(), // Organisation EVS/CS responsable
  participantCount: integer("participant_count").notNull(), // Nombre de participants de cette fiche
  sessionNumber: integer("session_number").notNull().default(1), // Numéro de session (1, 2, 3...)
  
  // État de la session
  isLocked: boolean("is_locked").notNull().default(false), // Verrouillé quand seuil atteint
  minCapacityNotificationSent: boolean("min_capacity_notification_sent").notNull().default(false), // Notification "atelier prêt" envoyée
  
  // Gestion des contrats par session
  contractSignedByEVS: boolean("contract_signed_by_evs").notNull().default(false),
  contractSignedByCommune: boolean("contract_signed_by_commune").notNull().default(false),
  contractCommunePdfUrl: text("contract_commune_pdf_url"), // URL du PDF uploadé si structure communale
  contractSignedAt: timestamp("contract_signed_at"), // Date de signature du contrat
  
  // Suivi de l'activité
  activityDone: boolean("activity_done").notNull().default(false),
  activityCompletedAt: timestamp("activity_completed_at"), // Date de marquage de l'activité terminée
  
  // Contrôle de terrain (par session)
  controlScheduled: boolean("control_scheduled").notNull().default(false), // Contrôle programmé
  controlValidatedAt: timestamp("control_validated_at"), // Date de validation du contrôle
  
  // Bilan d'atelier par famille
  reportUrl: text("report_url"), // URL du bilan uploadé pour cette famille
  reportUploadedAt: timestamp("report_uploaded_at"), // Date d'upload du bilan
  reportUploadedBy: varchar("report_uploaded_by"), // User ID qui a uploadé le bilan
  
  // Timestamp pour audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  ficheIdx: index("workshop_enrollments_fiche_idx").on(table.ficheId),
  workshopIdx: index("workshop_enrollments_workshop_idx").on(table.workshopId),
  evsIdx: index("workshop_enrollments_evs_idx").on(table.evsId),
  sessionIdx: index("workshop_enrollments_session_idx").on(table.workshopId, table.evsId, table.sessionNumber),
  // Protection anti-doublon: une fiche ne peut être inscrite qu'une seule fois à un atelier
  uniqueFicheWorkshop: unique("unique_fiche_workshop").on(table.ficheId, table.workshopId),
}));

export const ficheNavettes = pgTable("fiche_navettes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ref: text("ref").notNull().unique(),
  state: ficheStateEnum("state").notNull().default("DRAFT"),
  emitterId: varchar("emitter_id").notNull(),
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
  
  // Workshop selections (checkboxes) - priority indicator
  selectedWorkshops: json("selected_workshops"), // Store which workshops are selected (checked)
  
  // Number of participants for workshops
  participantsCount: integer("participants_count").default(1), // Number of people from the fiche who will participate in workshops (1-10)
  
  // Family consent
  familyConsent: boolean("family_consent").notNull().default(false),
  
  // Referent TAS validation (electronic signature certification)
  referentValidation: boolean("referent_validation").notNull().default(false),
  
  // Contract verification tracking
  contractSigned: boolean("contract_signed").notNull().default(false),
  advancePaymentSent: boolean("advance_payment_sent").notNull().default(false),
  contractVerifiedBy: varchar("contract_verified_by"),
  contractVerifiedAt: timestamp("contract_verified_at"),
  
  // Activity completion tracking
  activityCompleted: boolean("activity_completed").notNull().default(false),
  activityCompletedBy: varchar("activity_completed_by"),
  activityCompletedAt: timestamp("activity_completed_at"),
  
  // Field check tracking
  fieldCheckCompleted: boolean("field_check_completed").notNull().default(false),
  fieldCheckCompletedBy: varchar("field_check_completed_by"),
  fieldCheckCompletedAt: timestamp("field_check_completed_at"),
  
  // Final verification tracking
  finalReportSent: boolean("final_report_sent").notNull().default(false),
  remainingPaymentSent: boolean("remaining_payment_sent").notNull().default(false),
  finalVerificationBy: varchar("final_verification_by"),
  finalVerificationAt: timestamp("final_verification_at"),
  
  // Total amount for calculations
  totalAmount: integer("total_amount"), // in cents
  
  // CAP documents uploaded with fiche
  capDocuments: json("cap_documents"), // Store array of uploaded CAP documents
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  refIdx: index("fiche_navettes_ref_idx").on(table.ref),
  stateIdx: index("fiche_navettes_state_idx").on(table.state),
  emitterIdx: index("fiche_navettes_emitter_idx").on(table.emitterId),
  assignedOrgIdx: index("fiche_navettes_assigned_org_idx").on(table.assignedOrgId),
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

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  to: json("to").notNull(), // Array of recipient emails
  cc: json("cc"), // Optional CC recipients
  bcc: json("bcc"), // Optional BCC recipients
  subject: text("subject").notNull(),
  text: text("text"), // Plain text version
  html: text("html").notNull(), // HTML version
  meta: json("meta"), // { ficheId, ficheRef, event, triggerUserId, ... }
  status: emailStatusEnum("status").notNull().default("intercepted"),
  error: text("error"), // Error message if status is 'error'
  messageId: text("message_id"), // SendGrid message ID when sent
  createdAt: timestamp("created_at").defaultNow().notNull(),
  viewedAt: timestamp("viewed_at"), // When marked as viewed
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("email_logs_status_idx").on(table.status),
  createdAtIdx: index("email_logs_created_at_idx").on(table.createdAt),
}));

export const migrations = pgTable("migrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  checksum: text("checksum").notNull(),
  metadata: json("metadata"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("migrations_name_idx").on(table.name),
  executedAtIdx: index("migrations_executed_at_idx").on(table.executedAt),
}));

// Relations
export const epcisRelations = relations(epcis, ({ many }) => ({
  organizations: many(organizations),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, { fields: [users.orgId], references: [organizations.orgId] }),
  emittedFiches: many(ficheNavettes),
  auditLogs: many(auditLogs),
  comments: many(comments),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  epci: one(epcis, { fields: [organizations.epciId], references: [epcis.id] }),
  users: many(users),
  assignedFiches: many(ficheNavettes),
  enrollments: many(workshopEnrollments),
}));

export const workshopObjectivesRelations = relations(workshopObjectives, ({ many }) => ({
  workshops: many(workshops),
}));

export const workshopsRelations = relations(workshops, ({ one, many }) => ({
  objective: one(workshopObjectives, { fields: [workshops.objectiveId], references: [workshopObjectives.id] }),
  enrollments: many(workshopEnrollments),
}));

export const ficheNavettesRelations = relations(ficheNavettes, ({ one, many }) => ({
  emitter: one(users, { fields: [ficheNavettes.emitterId], references: [users.id] }),
  assignedOrg: one(organizations, { fields: [ficheNavettes.assignedOrgId], references: [organizations.orgId] }),
  comments: many(comments),
  enrollments: many(workshopEnrollments),
}));

// Relations pour workshop_enrollments  
export const workshopEnrollmentsRelations = relations(workshopEnrollments, ({ one }) => ({
  fiche: one(ficheNavettes, { fields: [workshopEnrollments.ficheId], references: [ficheNavettes.id] }),
  workshop: one(workshops, { fields: [workshopEnrollments.workshopId], references: [workshops.id] }),
  evsOrganization: one(organizations, { fields: [workshopEnrollments.evsId], references: [organizations.orgId] }),
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
  orgId: true,
  createdAt: true,
});

export const insertWorkshopObjectiveSchema = createInsertSchema(workshopObjectives).omit({
  id: true,
  createdAt: true,
});

export const insertWorkshopSchema = createInsertSchema(workshops).extend({
  minCapacity: z.number().int().min(1, "La capacité minimum doit être au moins 1").optional(),
  maxCapacity: z.number().int().min(1, "La capacité maximum doit être au moins 1").optional(),
}).refine((data) => {
  if (data.minCapacity && data.maxCapacity) {
    return data.maxCapacity >= data.minCapacity;
  }
  return true;
}, {
  message: "La capacité maximum doit être supérieure ou égale à la capacité minimum",
  path: ["maxCapacity"],
});

export const insertFicheNavetteSchema = createInsertSchema(ficheNavettes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMigrationSchema = createInsertSchema(migrations).omit({
  id: true,
  executedAt: true,
});

// Schema pour workshop_enrollments avec validation renforcée
export const insertWorkshopEnrollmentSchema = createInsertSchema(workshopEnrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  participantCount: z.number().int().min(1, "Le nombre de participants doit être au moins 1"),
  sessionNumber: z.number().int().min(1, "Le numéro de session doit être au moins 1"),
});

// Types
export type Epci = typeof epcis.$inferSelect;
export type InsertEpci = z.infer<typeof insertEpciSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type WorkshopObjective = typeof workshopObjectives.$inferSelect;
export type InsertWorkshopObjective = z.infer<typeof insertWorkshopObjectiveSchema>;
export type Workshop = typeof workshops.$inferSelect;
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type FicheNavette = typeof ficheNavettes.$inferSelect;
export type InsertFicheNavette = z.infer<typeof insertFicheNavetteSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type Migration = typeof migrations.$inferSelect;
export type InsertMigration = z.infer<typeof insertMigrationSchema>;
export type WorkshopEnrollment = typeof workshopEnrollments.$inferSelect;
export type InsertWorkshopEnrollment = z.infer<typeof insertWorkshopEnrollmentSchema>;
