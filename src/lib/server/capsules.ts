import { Database } from 'bun:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { generateSlug } from '../utils/slug';

/**
 * Canonical schema for the capsules table. `db/schema.sql` mirrors this for ops reference;
 * this constant is the single source of truth (applied by initSchema).
 *
 * Moderation columns (post-v1): a capsule is created `pending` and stays publicly
 * readable (先发后审 / publish-then-review). An out-of-band worker classifies it
 * via DeepSeek and flips it to `approved` or `blocked`; a `blocked` capsule reads
 * as 404 to the outside (see isBlocked + renderCapsuleText). Columns are added to
 * live DBs by migrateSchema (idempotent ALTER), so this constant and an old table
 * converge to the same shape.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS capsules (
  id                  TEXT PRIMARY KEY,
  slug                TEXT UNIQUE NOT NULL,
  title               TEXT,
  content             TEXT NOT NULL,
  content_sha256      TEXT NOT NULL,
  content_bytes       INTEGER NOT NULL,
  created_at          TEXT NOT NULL,
  expires_at          TEXT NOT NULL,
  deleted_at          TEXT,
  delete_token_hash   TEXT NOT NULL,
  source              TEXT NOT NULL,
  has_callback        INTEGER NOT NULL DEFAULT 0,
  view_count          INTEGER NOT NULL DEFAULT 0,
  copy_count          INTEGER NOT NULL DEFAULT 0,
  moderation_status   TEXT NOT NULL DEFAULT 'pending',
  moderation_reason   TEXT,
  moderation_model    TEXT,
  moderated_at        TEXT,
  moderation_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_capsules_expires ON capsules(expires_at);
`;
// NB: the idx_capsules_moderation index is created in migrateSchema, NOT here. On an existing
// v1 DB, CREATE TABLE IF NOT EXISTS no-ops (no moderation_status column yet), so an index on that
// column in this same batch would throw "no such column" before migrateSchema can ALTER it in.

/** Moderation lifecycle states. `pending` is publicly readable (publish-then-review). */
export type ModerationStatus = 'pending' | 'approved' | 'blocked';

/**
 * Columns added after the v1 table shipped. migrateSchema ALTERs any that are
 * missing, so an old on-disk DB (created before moderation) converges to SCHEMA_SQL.
 * SQLite allows ADD COLUMN with a constant NOT NULL DEFAULT, which is what we rely on.
 */
const MODERATION_COLUMNS: ReadonlyArray<readonly [string, string]> = [
	['moderation_status', "TEXT NOT NULL DEFAULT 'pending'"],
	['moderation_reason', 'TEXT'],
	['moderation_model', 'TEXT'],
	['moderated_at', 'TEXT'],
	['moderation_attempts', 'INTEGER NOT NULL DEFAULT 0']
];

export interface Capsule {
	id: string;
	slug: string;
	title: string | null;
	content: string;
	content_sha256: string;
	content_bytes: number;
	created_at: string;
	expires_at: string;
	deleted_at: string | null;
	delete_token_hash: string;
	source: string;
	has_callback: number;
	view_count: number;
	copy_count: number;
	moderation_status: ModerationStatus;
	moderation_reason: string | null;
	moderation_model: string | null;
	moderated_at: string | null;
	moderation_attempts: number;
}

export interface CreateInput {
	content: string;
	title?: string | null;
	ttlSeconds: number; // caller clamps via clampTtl
	source: string;
	hasCallback?: boolean;
	nowMs: number;
	slugLength?: number;
}

export interface CreateResult {
	capsule: Capsule;
	deleteToken: string; // plaintext, surfaced to the creator exactly once
}

const MAX_SLUG_ATTEMPTS = 6;

export function initSchema(db: Database): void {
	db.run(SCHEMA_SQL);
	migrateSchema(db);
}

/**
 * Bring an existing table up to SCHEMA_SQL by ALTER-ing in any missing moderation
 * columns. Idempotent: on a fresh DB (columns already present via SCHEMA_SQL) it is a
 * no-op; on an old DB it backfills, and every pre-existing row defaults to `pending`.
 */
export function migrateSchema(db: Database): void {
	const existing = new Set(
		(db.query('PRAGMA table_info(capsules)').all() as { name: string }[]).map((c) => c.name)
	);
	for (const [name, def] of MODERATION_COLUMNS) {
		if (existing.has(name)) continue;
		try {
			db.run(`ALTER TABLE capsules ADD COLUMN ${name} ${def}`);
		} catch (e) {
			// Concurrent first-open (web + worker): the other process may ADD this column between
			// our PRAGMA read and this ALTER. A duplicate-column error is then benign; re-throw
			// anything else. Column name/def come only from the hardcoded MODERATION_COLUMNS
			// constant, so there is no injection surface in the interpolation.
			if (!isDuplicateColumn(e)) throw e;
		}
	}
	db.run('CREATE INDEX IF NOT EXISTS idx_capsules_moderation ON capsules(moderation_status)');
}

function isDuplicateColumn(e: unknown): boolean {
	const msg = e instanceof Error ? e.message : String(e);
	return msg.toLowerCase().includes('duplicate column');
}

/**
 * A blocked capsule must read as if it never existed (404), not 410 — 410 leaks that
 * the slug once held content. `pending` and `approved` are both publicly readable.
 */
export function isBlocked(row: Capsule): boolean {
	return row.moderation_status === 'blocked';
}

function sha256(input: string): string {
	return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function createCapsule(db: Database, input: CreateInput): CreateResult {
	const id = 'cap_' + randomBytes(12).toString('hex');
	const deleteToken = randomBytes(24).toString('base64url');
	const contentBytes = Buffer.byteLength(input.content, 'utf8');
	const createdAt = new Date(input.nowMs).toISOString();
	const expiresAt = new Date(input.nowMs + input.ttlSeconds * 1000).toISOString();

	const row: Capsule = {
		id,
		slug: '', // filled per attempt below
		title: input.title ?? null,
		content: input.content,
		content_sha256: sha256(input.content),
		content_bytes: contentBytes,
		created_at: createdAt,
		expires_at: expiresAt,
		deleted_at: null,
		delete_token_hash: sha256(deleteToken),
		source: input.source,
		has_callback: input.hasCallback ? 1 : 0,
		view_count: 0,
		copy_count: 0,
		// New capsules enter moderation as `pending`: publicly readable, awaiting the
		// out-of-band DeepSeek worker. The INSERT below relies on the column DEFAULTs;
		// these mirror them so the returned object matches the persisted row.
		moderation_status: 'pending',
		moderation_reason: null,
		moderation_model: null,
		moderated_at: null,
		moderation_attempts: 0
	};

	const insert = db.query(
		`INSERT INTO capsules
      (id, slug, title, content, content_sha256, content_bytes, created_at, expires_at,
       deleted_at, delete_token_hash, source, has_callback, view_count, copy_count)
     VALUES
      ($id, $slug, $title, $content, $content_sha256, $content_bytes, $created_at, $expires_at,
       $deleted_at, $delete_token_hash, $source, $has_callback, 0, 0)`
	);

	for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
		row.slug = generateSlug(input.slugLength ?? 8);
		try {
			insert.run({
				$id: row.id,
				$slug: row.slug,
				$title: row.title,
				$content: row.content,
				$content_sha256: row.content_sha256,
				$content_bytes: row.content_bytes,
				$created_at: row.created_at,
				$expires_at: row.expires_at,
				$deleted_at: row.deleted_at,
				$delete_token_hash: row.delete_token_hash,
				$source: row.source,
				$has_callback: row.has_callback
			});
			return { capsule: row, deleteToken };
		} catch (e) {
			if (isSlugCollision(e)) continue;
			throw e;
		}
	}
	throw new Error('slug generation failed after retries');
}

function isSlugCollision(e: unknown): boolean {
	const msg = e instanceof Error ? e.message : String(e);
	return msg.includes('UNIQUE') && msg.includes('slug');
}

/** Raw row lookup regardless of deleted/expired state; null only when the slug never existed. */
export function getCapsuleRaw(db: Database, slug: string): Capsule | null {
	const row = db.query('SELECT * FROM capsules WHERE slug = ?').get(slug) as Capsule | null;
	return row ?? null;
}

/** Returns the capsule only if it exists, is not deleted, and has not expired at `nowMs`. */
export function getActiveCapsule(db: Database, slug: string, nowMs: number): Capsule | null {
	const row = getCapsuleRaw(db, slug);
	if (!row) return null;
	if (row.deleted_at) return null;
	if (new Date(row.expires_at).getTime() <= nowMs) return null;
	return row;
}

/** Soft-delete if the token matches. Returns true only when a matching row was deleted. */
export function deleteCapsule(db: Database, slug: string, token: string, nowMs: number): boolean {
	const row = getCapsuleRaw(db, slug);
	if (!row) return false;
	if (row.deleted_at) return false;
	if (sha256(token) !== row.delete_token_hash) return false;
	db.query('UPDATE capsules SET deleted_at = ? WHERE slug = ?').run(
		new Date(nowMs).toISOString(),
		slug
	);
	return true;
}

export function bumpViewCount(db: Database, slug: string): void {
	db.query('UPDATE capsules SET view_count = view_count + 1 WHERE slug = ?').run(slug);
}

// ---- moderation (publish-then-review worker) ----------------------------

/**
 * Pending capsules still under the retry budget, oldest first (worker batch input).
 * Excludes soft-deleted and expired rows: a capsule the creator already deleted must never
 * have its content shipped to a third party (DeepSeek), and expired rows waste API calls.
 */
export function selectPendingForModeration(
	db: Database,
	limit: number,
	maxAttempts: number,
	nowMs: number
): Capsule[] {
	return db
		.query(
			`SELECT * FROM capsules
       WHERE moderation_status = 'pending' AND moderation_attempts < ?
         AND deleted_at IS NULL AND expires_at > ?
       ORDER BY created_at ASC
       LIMIT ?`
		)
		.all(maxAttempts, new Date(nowMs).toISOString(), limit) as Capsule[];
}

/**
 * Record a terminal verdict (approved | blocked) for one capsule. Guarded on `pending` so a
 * stale in-flight verdict or a second worker can never overwrite an already-decided row
 * (e.g. flip a `blocked` capsule back to `approved`). Returns true only if this call decided it.
 */
export function applyModeration(
	db: Database,
	id: string,
	status: 'approved' | 'blocked',
	reason: string | null,
	model: string,
	nowMs: number
): boolean {
	const res = db
		.query(
			`UPDATE capsules
         SET moderation_status = ?, moderation_reason = ?, moderation_model = ?, moderated_at = ?
       WHERE id = ? AND moderation_status = 'pending'`
		)
		.run(status, reason, model, new Date(nowMs).toISOString(), id);
	return res.changes > 0;
}

/** Count one failed round against a capsule; the attempt budget drives fail-open. */
export function bumpModerationAttempt(db: Database, id: string): void {
	db.query('UPDATE capsules SET moderation_attempts = moderation_attempts + 1 WHERE id = ?').run(id);
}

/**
 * Fail-open net: any capsule still pending after maxAttempts failed rounds is auto-approved,
 * so a persistently-unreachable DeepSeek never traps content in pending. Returns the count.
 */
export function autoApproveExhausted(db: Database, maxAttempts: number, nowMs: number): number {
	const nowIso = new Date(nowMs).toISOString();
	const res = db
		.query(
			`UPDATE capsules
         SET moderation_status = 'approved',
             moderation_reason = ?, moderation_model = 'fallback', moderated_at = ?
       WHERE moderation_status = 'pending' AND moderation_attempts >= ?
         AND deleted_at IS NULL AND expires_at > ?`
		)
		.run(`auto-approved after ${maxAttempts} failed attempts`, nowIso, maxAttempts, nowIso);
	return res.changes;
}
