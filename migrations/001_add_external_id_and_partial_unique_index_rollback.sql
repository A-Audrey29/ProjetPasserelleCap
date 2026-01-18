-- Rollback: 001_add_external_id_and_partial_unique_index
-- Description: Remove external_id column and its partial unique index
-- Date: 2026-01-17

-- Drop the partial unique index first
DROP INDEX IF EXISTS idx_fiches_external_id_unique;

-- Remove the external_id column
ALTER TABLE fiche_navettes DROP COLUMN IF EXISTS external_id;

-- Note: referent_validation is not removed as it may have been added by other migrations
