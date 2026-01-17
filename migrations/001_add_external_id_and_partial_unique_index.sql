-- Migration: 001_add_external_id_and_partial_unique_index
-- Description: Add external_id column for Make/Google Forms integration with partial unique index
-- Date: 2026-01-17

-- Add external_id column (nullable, for Make automation)
ALTER TABLE fiche_navettes ADD COLUMN IF NOT EXISTS external_id varchar(255);

-- Add referent_validation column if not exists (should already exist, safety check)
ALTER TABLE fiche_navettes ADD COLUMN IF NOT EXISTS referent_validation boolean NOT NULL DEFAULT false;

-- Create partial unique index on external_id (only when NOT NULL)
-- This allows multiple NULL values but ensures uniqueness when a value is present
CREATE UNIQUE INDEX IF NOT EXISTS idx_fiches_external_id_unique 
ON fiche_navettes (external_id) 
WHERE external_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN fiche_navettes.external_id IS 'External identifier from Make/Google Forms automation. Format: free string max 255 chars. Unique if present.';
