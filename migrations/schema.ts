import { pgTable, index, varchar, text, json, timestamp, unique, boolean, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const ficheState = pgEnum("fiche_state", ['DRAFT', 'SUBMITTED_TO_CD', 'SUBMITTED_TO_FEVES', 'ASSIGNED_EVS', 'ACCEPTED_EVS', 'EVS_REJECTED', 'NEEDS_INFO', 'CONTRACT_SIGNED', 'ACTIVITY_DONE', 'FIELD_CHECK_SCHEDULED', 'FIELD_CHECK_DONE', 'CLOSED', 'ARCHIVED'])
export const orgType = pgEnum("org_type", ['EVS', 'CS', 'OTHER'])
export const role = pgEnum("role", ['ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS', 'CD'])


export const auditLogs = pgTable("audit_logs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	actorId: varchar("actor_id"),
	action: text().notNull(),
	entity: text().notNull(),
	entityId: varchar("entity_id").notNull(),
	meta: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_logs_actor_idx").using("btree", table.actorId.asc().nullsLast().op("text_ops")),
	index("audit_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_logs_entity_idx").using("btree", table.entityId.asc().nullsLast().op("text_ops")),
]);

export const comments = pgTable("comments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ficheId: varchar("fiche_id").notNull(),
	authorId: varchar("author_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("comments_fiche_idx").using("btree", table.ficheId.asc().nullsLast().op("text_ops")),
]);

export const epcis = pgTable("epcis", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("epcis_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("epcis_name_unique").on(table.name),
]);

export const ficheNavettes = pgTable("fiche_navettes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ref: text().notNull(),
	state: ficheState().default('DRAFT').notNull(),
	emitterId: varchar("emitter_id").notNull(),
	assignedOrgId: varchar("assigned_org_id"),
	description: text(),
	referentData: json("referent_data"),
	familyDetailedData: json("family_detailed_data"),
	childrenData: json("children_data"),
	workshopPropositions: json("workshop_propositions"),
	familyConsent: boolean("family_consent").default(false).notNull(),
	contractSigned: boolean("contract_signed").default(false).notNull(),
	advancePaymentSent: boolean("advance_payment_sent").default(false).notNull(),
	contractVerifiedBy: varchar("contract_verified_by"),
	contractVerifiedAt: timestamp("contract_verified_at", { mode: 'string' }),
	activityCompleted: boolean("activity_completed").default(false).notNull(),
	activityCompletedBy: varchar("activity_completed_by"),
	activityCompletedAt: timestamp("activity_completed_at", { mode: 'string' }),
	fieldCheckCompleted: boolean("field_check_completed").default(false).notNull(),
	fieldCheckCompletedBy: varchar("field_check_completed_by"),
	fieldCheckCompletedAt: timestamp("field_check_completed_at", { mode: 'string' }),
	finalReportSent: boolean("final_report_sent").default(false).notNull(),
	remainingPaymentSent: boolean("remaining_payment_sent").default(false).notNull(),
	finalVerificationBy: varchar("final_verification_by"),
	finalVerificationAt: timestamp("final_verification_at", { mode: 'string' }),
	totalAmount: integer("total_amount"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("fiche_navettes_assigned_org_idx").using("btree", table.assignedOrgId.asc().nullsLast().op("text_ops")),
	index("fiche_navettes_emitter_idx").using("btree", table.emitterId.asc().nullsLast().op("text_ops")),
	index("fiche_navettes_ref_idx").using("btree", table.ref.asc().nullsLast().op("text_ops")),
	index("fiche_navettes_state_idx").using("btree", table.state.asc().nullsLast().op("enum_ops")),
	unique("fiche_navettes_ref_unique").on(table.ref),
]);

export const organizations = pgTable("organizations", {
	orgId: varchar("org_id").default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	contact: text(),
	contactName: text("contact_name"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	epci: text(),
	epciId: varchar("epci_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("organizations_epci_idx").using("btree", table.epciId.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	role: role().notNull(),
	structure: text(),
	phone: text(),
	orgId: varchar("org_id"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_role_idx").using("btree", table.role.asc().nullsLast().op("enum_ops")),
	unique("users_email_unique").on(table.email),
]);

export const workshopObjectives = pgTable("workshop_objectives", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	order: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("workshop_objectives_code_unique").on(table.code),
]);

export const workshops = pgTable("workshops", {
	id: varchar().primaryKey().notNull(),
	objectiveId: varchar("objective_id").notNull(),
	name: text().notNull(),
	description: text(),
}, (table) => [
	index("workshops_objective_idx").using("btree", table.objectiveId.asc().nullsLast().op("text_ops")),
]);
