-- Capsules schema — v1 (lean; no pool/moderation columns until ROOT-v1 step 4).
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
  copy_count        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_capsules_expires ON capsules(expires_at);
