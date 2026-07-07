-- Capsules table schema.
--
-- CANONICAL SOURCE: src/lib/server/capsules.ts (SCHEMA_SQL) — the app applies that on init.
-- This file mirrors it for ops / manual inspection (e.g. `sqlite3 data/capsules.db < db/schema.sql`).
-- Keep the two in sync.

CREATE TABLE IF NOT EXISTS capsules (
  id                TEXT PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT,
  content           TEXT NOT NULL,
  content_sha256    TEXT NOT NULL,
  content_bytes     INTEGER NOT NULL,
  created_at        TEXT NOT NULL,           -- ISO8601
  expires_at        TEXT NOT NULL,           -- ISO8601
  deleted_at        TEXT,                    -- ISO8601, null while active
  delete_token_hash TEXT NOT NULL,           -- sha256(delete_token)
  source            TEXT NOT NULL,           -- web | cli | mcp | api
  has_callback      INTEGER NOT NULL DEFAULT 0,
  view_count        INTEGER NOT NULL DEFAULT 0,
  copy_count        INTEGER NOT NULL DEFAULT 0,
  moderation_status   TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | blocked
  moderation_reason   TEXT,                             -- violation category, for audit / appeal
  moderation_model    TEXT,                             -- model+version that judged it (or 'fallback')
  moderated_at        TEXT,                             -- ISO8601, null while pending
  moderation_attempts INTEGER NOT NULL DEFAULT 0        -- worker retries; >=3 auto-approves (fail-open)
);

CREATE INDEX IF NOT EXISTS idx_capsules_expires ON capsules(expires_at);
-- NOTE: idx_capsules_moderation is intentionally NOT here. The app's migrateSchema creates it
-- AFTER adding the moderation columns. If this file were run (sqlite3 < schema.sql) against an
-- existing pre-moderation DB, CREATE TABLE IF NOT EXISTS no-ops and an index on the not-yet-added
-- moderation_status column would throw "no such column". The app builds it on first open.
