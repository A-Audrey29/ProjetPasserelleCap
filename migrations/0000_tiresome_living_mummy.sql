-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."fiche_state" AS ENUM('DRAFT', 'SUBMITTED_TO_CD', 'SUBMITTED_TO_FEVES', 'ASSIGNED_EVS', 'ACCEPTED_EVS', 'EVS_REJECTED', 'NEEDS_INFO', 'CONTRACT_SIGNED', 'ACTIVITY_DONE', 'FIELD_CHECK_SCHEDULED', 'FIELD_CHECK_DONE', 'CLOSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('EVS', 'CS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'SUIVI_PROJETS', 'EMETTEUR', 'RELATIONS_EVS', 'EVS_CS', 'CD');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" varchar,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"meta" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiche_id" varchar NOT NULL,
	"author_id" varchar NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "epcis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "epcis_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fiche_navettes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"state" "fiche_state" DEFAULT 'DRAFT' NOT NULL,
	"emitter_id" varchar NOT NULL,
	"assigned_org_id" varchar,
	"description" text,
	"referent_data" json,
	"family_detailed_data" json,
	"children_data" json,
	"workshop_propositions" json,
	"family_consent" boolean DEFAULT false NOT NULL,
	"contract_signed" boolean DEFAULT false NOT NULL,
	"advance_payment_sent" boolean DEFAULT false NOT NULL,
	"contract_verified_by" varchar,
	"contract_verified_at" timestamp,
	"activity_completed" boolean DEFAULT false NOT NULL,
	"activity_completed_by" varchar,
	"activity_completed_at" timestamp,
	"field_check_completed" boolean DEFAULT false NOT NULL,
	"field_check_completed_by" varchar,
	"field_check_completed_at" timestamp,
	"final_report_sent" boolean DEFAULT false NOT NULL,
	"remaining_payment_sent" boolean DEFAULT false NOT NULL,
	"final_verification_by" varchar,
	"final_verification_at" timestamp,
	"total_amount" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fiche_navettes_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"org_id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"epci" text,
	"epci_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "role" NOT NULL,
	"structure" text,
	"phone" text,
	"org_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workshop_objectives" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workshop_objectives_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" varchar PRIMARY KEY NOT NULL,
	"objective_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_id" text_ops);--> statement-breakpoint
CREATE INDEX "comments_fiche_idx" ON "comments" USING btree ("fiche_id" text_ops);--> statement-breakpoint
CREATE INDEX "epcis_name_idx" ON "epcis" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "fiche_navettes_assigned_org_idx" ON "fiche_navettes" USING btree ("assigned_org_id" text_ops);--> statement-breakpoint
CREATE INDEX "fiche_navettes_emitter_idx" ON "fiche_navettes" USING btree ("emitter_id" text_ops);--> statement-breakpoint
CREATE INDEX "fiche_navettes_ref_idx" ON "fiche_navettes" USING btree ("ref" text_ops);--> statement-breakpoint
CREATE INDEX "fiche_navettes_state_idx" ON "fiche_navettes" USING btree ("state" enum_ops);--> statement-breakpoint
CREATE INDEX "organizations_epci_idx" ON "organizations" USING btree ("epci_id" text_ops);--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role" enum_ops);--> statement-breakpoint
CREATE INDEX "workshops_objective_idx" ON "workshops" USING btree ("objective_id" text_ops);
*/