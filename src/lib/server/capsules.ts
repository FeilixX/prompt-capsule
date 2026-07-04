import { Database } from 'bun:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { generateSlug } from '../utils/slug';

/**
 * Canonical schema for the capsules table. `db/schema.sql` mirrors this for ops reference;
 * this constant is the single source of truth (applied by initSchema).
 * v1 deliberately omits pool/moderation columns — added only when the discovery pool ships (ROOT-v1 step 4).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS capsules (
  id                TEXT PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT,
  content           TEXT NOT NULL,
  content_sha256    TEXT NOT NULL,
  content_bytes     INTEGER NOT NULL,
  created_at        TEXT NOT NULL,
  expires_at        TEXT NOT NULL,
  deleted_at        TEXT,
  delete_token_hash TEXT NOT NULL,
  source            TEXT NOT NULL,
  has_callback      INTEGER NOT NULL DEFAULT 0,
  view_count        INTEGER NOT NULL DEFAULT 0,
  copy_count        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_capsules_expires ON capsules(expires_at);
`;

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
		copy_count: 0
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
