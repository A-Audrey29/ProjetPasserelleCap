import { pgTable, index, varchar, text, json, timestamp, unique, boolean, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const emailStatus = pgEnum("email_status", ['intercepted', 'sent', 'viewed', 'archived', 'error'])
export const ficheState = pgEnum("fiche_state", ['DRAFT', 'SUBMITTED_TO_FEVES', 'ASSIGNED_EVS', 'ACCEPTED_EVS', 'EVS_REJECTED', 'CONTRACT_SIGNED', 'ACTIVITY_DONE', 'FIELD_CHECK_SCHEDULED', 'FIELD_CHECK_DONE', 'FINAL_REPORT_RECEIVED', 'CLOSED', 'ARCHIVED'])
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
	minCapacity: integer("min_capacity"),
	maxCapacity: integer("max_capacity"),
}, (table) => [
	index("workshops_objective_idx").using("btree", table.objectiveId.asc().nullsLast().op("text_ops")),
]);

export const emailLogs = pgTable("email_logs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	to: json().notNull(),
	cc: json(),
	bcc: json(),
	subject: text().notNull(),
	text: text(),
	html: text().notNull(),
	meta: json(),
	status: emailStatus().default('intercepted').notNull(),
	error: text(),
	messageId: text("message_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	viewedAt: timestamp("viewed_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("email_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("email_logs_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
]);

export const migrations = pgTable("migrations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	checksum: text().notNull(),
	metadata: json(),
	executedAt: timestamp("executed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("migrations_executed_at_idx").using("btree", table.executedAt.asc().nullsLast().op("timestamp_ops")),
	index("migrations_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("migrations_name_unique").on(table.name),
]);

export const workshopEnrollments = pgTable("workshop_enrollments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ficheId: varchar("fiche_id").notNull(),
	workshopId: varchar("workshop_id").notNull(),
	evsId: varchar("evs_id").notNull(),
	participantCount: integer("participant_count").notNull(),
	sessionNumber: integer("session_number").default(1).notNull(),
	isLocked: boolean("is_locked").default(false).notNull(),
	minCapacityNotificationSent: boolean("min_capacity_notification_sent").default(false).notNull(),
	contractSignedByEvs: boolean("contract_signed_by_evs").default(false).notNull(),
	contractSignedByCommune: boolean("contract_signed_by_commune").default(false).notNull(),
	contractCommunePdfUrl: text("contract_commune_pdf_url"),
	contractSignedAt: timestamp("contract_signed_at", { mode: 'string' }),
	activityDone: boolean("activity_done").default(false).notNull(),
	activityCompletedAt: timestamp("activity_completed_at", { mode: 'string' }),
	controlScheduled: boolean("control_scheduled").default(false).notNull(),
	controlValidatedAt: timestamp("control_validated_at", { mode: 'string' }),
	reportUrl: text("report_url"),
	reportUploadedAt: timestamp("report_uploaded_at", { mode: 'string' }),
	reportUploadedBy: varchar("report_uploaded_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("workshop_enrollments_evs_idx").using("btree", table.evsId.asc().nullsLast().op("text_ops")),
	index("workshop_enrollments_fiche_idx").using("btree", table.ficheId.asc().nullsLast().op("text_ops")),
	index("workshop_enrollments_session_idx").using("btree", table.workshopId.asc().nullsLast().op("int4_ops"), table.evsId.asc().nullsLast().op("int4_ops"), table.sessionNumber.asc().nullsLast().op("int4_ops")),
	index("workshop_enrollments_workshop_idx").using("btree", table.workshopId.asc().nullsLast().op("text_ops")),
	unique("unique_fiche_workshop").on(table.ficheId, table.workshopId),
]);

export const ficheNavettes = pgTable("fiche_navettes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ref: text().notNull(),
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
	selectedWorkshops: json("selected_workshops"),
	participantsCount: integer("participants_count").default(1),
	capDocuments: json("cap_documents"),
	state: ficheState().default('DRAFT').notNull(),
}, (table) => [
	index("fiche_navettes_assigned_org_idx").using("btree", table.assignedOrgId.asc().nullsLast().op("text_ops")),
	index("fiche_navettes_emitter_idx").using("btree", table.emitterId.asc().nullsLast().op("text_ops")),
	index("fiche_navettes_ref_idx").using("btree", table.ref.asc().nullsLast().op("text_ops")),
	index("fiche_navettes_state_idx").using("btree", table.state.asc().nullsLast().op("enum_ops")),
	unique("fiche_navettes_ref_unique").on(table.ref),
]);
