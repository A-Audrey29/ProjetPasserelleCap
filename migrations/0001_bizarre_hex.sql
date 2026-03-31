CREATE TYPE "public"."report_objective" AS ENUM('REACHED', 'IN_PROGRESS', 'NOT_REACHED');--> statement-breakpoint
-- Note: idempotency_keys table is created by migration 002_create_idempotency_keys.sql
--> statement-breakpoint
CREATE TABLE "schema_migrations" (
	"version" varchar(255) PRIMARY KEY NOT NULL,
	"applied_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workshop_global_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" varchar NOT NULL,
	"intervenants_text" text,
	"effective_start_date" date,
	"sessions_realized" integer,
	"modalites_deploiement" text,
	"modalites_fonctionnement" text,
	"synthese_objectifs" text,
	"leviers_freins" text,
	"perspectives" text,
	"transmission_savoirs" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"last_modified_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "migrations_executed_at_idx";--> statement-breakpoint
DROP INDEX "audit_logs_actor_idx";--> statement-breakpoint
DROP INDEX "audit_logs_created_at_idx";--> statement-breakpoint
DROP INDEX "audit_logs_entity_idx";--> statement-breakpoint
DROP INDEX "comments_fiche_idx";--> statement-breakpoint
DROP INDEX "epcis_name_idx";--> statement-breakpoint
DROP INDEX "organizations_epci_idx";--> statement-breakpoint
DROP INDEX "users_email_idx";--> statement-breakpoint
DROP INDEX "users_role_idx";--> statement-breakpoint
DROP INDEX "workshops_objective_idx";--> statement-breakpoint
DROP INDEX "email_logs_created_at_idx";--> statement-breakpoint
DROP INDEX "email_logs_status_idx";--> statement-breakpoint
DROP INDEX "migrations_name_idx";--> statement-breakpoint
DROP INDEX "workshop_enrollments_evs_idx";--> statement-breakpoint
DROP INDEX "workshop_enrollments_fiche_idx";--> statement-breakpoint
DROP INDEX "workshop_enrollments_session_idx";--> statement-breakpoint
DROP INDEX "workshop_enrollments_workshop_idx";--> statement-breakpoint
DROP INDEX "fiche_navettes_assigned_org_idx";--> statement-breakpoint
DROP INDEX "fiche_navettes_emitter_idx";--> statement-breakpoint
DROP INDEX "fiche_navettes_ref_idx";--> statement-breakpoint
DROP INDEX "fiche_navettes_state_idx";--> statement-breakpoint
ALTER TABLE "workshop_enrollments" ADD COLUMN "report_participants_presences" integer;--> statement-breakpoint
ALTER TABLE "workshop_enrollments" ADD COLUMN "report_implication" text;--> statement-breakpoint
ALTER TABLE "workshop_enrollments" ADD COLUMN "report_objectifs" "report_objective";--> statement-breakpoint
ALTER TABLE "workshop_enrollments" ADD COLUMN "report_satisfaction" integer;--> statement-breakpoint
ALTER TABLE "workshop_enrollments" ADD COLUMN "report_commentaire_libre" text;--> statement-breakpoint
ALTER TABLE "workshop_enrollments" ADD COLUMN "report_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "fiche_navettes" ADD COLUMN "external_id" varchar(255);--> statement-breakpoint
ALTER TABLE "fiche_navettes" ADD COLUMN "referent_validation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "fiche_navettes" ADD COLUMN "last_modified_by" varchar;--> statement-breakpoint
ALTER TABLE "fiche_navettes" ADD COLUMN "last_modified_at" timestamp;--> statement-breakpoint
-- Note: idx_idempotency_keys_created_at is created by migration 002_create_idempotency_keys.sql
--> statement-breakpoint
CREATE INDEX "workshop_global_reports_workshop_idx" ON "workshop_global_reports" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "comments_fiche_idx" ON "comments" USING btree ("fiche_id");--> statement-breakpoint
CREATE INDEX "epcis_name_idx" ON "epcis" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organizations_epci_idx" ON "organizations" USING btree ("epci_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "workshops_objective_idx" ON "workshops" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "email_logs_created_at_idx" ON "email_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_logs_status_idx" ON "email_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "migrations_name_idx" ON "migrations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "workshop_enrollments_evs_idx" ON "workshop_enrollments" USING btree ("evs_id");--> statement-breakpoint
CREATE INDEX "workshop_enrollments_fiche_idx" ON "workshop_enrollments" USING btree ("fiche_id");--> statement-breakpoint
CREATE INDEX "workshop_enrollments_session_idx" ON "workshop_enrollments" USING btree ("workshop_id","evs_id","session_number");--> statement-breakpoint
CREATE INDEX "workshop_enrollments_workshop_idx" ON "workshop_enrollments" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "fiche_navettes_assigned_org_idx" ON "fiche_navettes" USING btree ("assigned_org_id");--> statement-breakpoint
CREATE INDEX "fiche_navettes_emitter_idx" ON "fiche_navettes" USING btree ("emitter_id");--> statement-breakpoint
CREATE INDEX "fiche_navettes_ref_idx" ON "fiche_navettes" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "fiche_navettes_state_idx" ON "fiche_navettes" USING btree ("state");