-- Migration 003 : colonnes de bilan d'atelier + table bilan global
-- Origine : extrait propre de 0001_bizarre_hex.sql (Drizzle, jamais appliquée)
-- Débloque createWorkshopEnrollments en échec depuis le 26/03/2026
-- Date : 2026-05-28

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_objective') THEN
    CREATE TYPE report_objective AS ENUM ('REACHED', 'IN_PROGRESS', 'NOT_REACHED');
  END IF;
END $$;

ALTER TABLE workshop_enrollments ADD COLUMN IF NOT EXISTS report_participants_presences integer;
ALTER TABLE workshop_enrollments ADD COLUMN IF NOT EXISTS report_implication text;
ALTER TABLE workshop_enrollments ADD COLUMN IF NOT EXISTS report_objectifs report_objective;
ALTER TABLE workshop_enrollments ADD COLUMN IF NOT EXISTS report_satisfaction integer;
ALTER TABLE workshop_enrollments ADD COLUMN IF NOT EXISTS report_commentaire_libre text;
ALTER TABLE workshop_enrollments ADD COLUMN IF NOT EXISTS report_completed_at timestamp;

CREATE TABLE IF NOT EXISTS workshop_global_reports (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  workshop_id varchar NOT NULL,
  intervenants_text text,
  effective_start_date date,
  sessions_realized integer,
  modalites_deploiement text,
  modalites_fonctionnement text,
  synthese_objectifs text,
  leviers_freins text,
  perspectives text,
  transmission_savoirs text,
  is_completed boolean NOT NULL DEFAULT false,
  is_draft boolean NOT NULL DEFAULT true,
  last_modified_by varchar,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workshop_global_reports_workshop_idx
  ON workshop_global_reports USING btree (workshop_id);