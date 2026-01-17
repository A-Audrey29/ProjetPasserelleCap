-- Migration 002: Create idempotency_keys table for Make API upload deduplication
-- This migration is idempotent (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) NOT NULL,
  fiche_id VARCHAR(255) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (key, fiche_id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at 
  ON idempotency_keys(created_at);
