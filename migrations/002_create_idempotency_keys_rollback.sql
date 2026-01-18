-- Rollback Migration 002: Drop idempotency_keys table

DROP INDEX IF EXISTS idx_idempotency_keys_created_at;
DROP TABLE IF EXISTS idempotency_keys;
