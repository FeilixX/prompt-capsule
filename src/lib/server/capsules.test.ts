import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import {
	initSchema,
	migrateSchema,
	createCapsule,
	getActiveCapsule,
	getCapsuleRaw,
	deleteCapsule,
	isBlocked,
	selectPendingForModeration,
	applyModeration,
	autoApproveExhausted
} from './capsules';

const T0 = 1_700_000_000_000; // fixed injected clock

function freshDb(): Database {
	const db = new Database(':memory:');
	initSchema(db);
	return db;
}

test('create then get returns the same capsule content and slug', () => {
	const db = freshDb();
	const { capsule } = createCapsule(db, {
		content: 'hello world',
		title: 'greeting',
		ttlSeconds: 3600,
		source: 'web',
		nowMs: T0
	});
	const got = getActiveCapsule(db, capsule.slug, T0);
	expect(got).not.toBeNull();
	expect(got!.content).toBe('hello world');
	expect(got!.title).toBe('greeting');
	expect(got!.slug).toBe(capsule.slug);
});

test('content_bytes counts UTF-8 bytes, not characters', () => {
	const db = freshDb();
	const { capsule } = createCapsule(db, {
		content: '你好', // 6 UTF-8 bytes, 2 chars
		ttlSeconds: 3600,
		source: 'web',
		nowMs: T0
	});
	expect(capsule.content_bytes).toBe(6);
	expect(capsule.content_sha256).toBe(createHash('sha256').update('你好', 'utf8').digest('hex'));
});

test('delete token is returned but never stored in plaintext', () => {
	const db = freshDb();
	const { capsule, deleteToken } = createCapsule(db, {
		content: 'secretish',
		ttlSeconds: 3600,
		source: 'web',
		nowMs: T0
	});
	expect(deleteToken.length).toBeGreaterThan(16);
	expect(capsule.delete_token_hash).not.toBe(deleteToken);
	expect(capsule.delete_token_hash).toBe(createHash('sha256').update(deleteToken).digest('hex'));
});

test('capsule is gone after its TTL expires', () => {
	const db = freshDb();
	const { capsule } = createCapsule(db, {
		content: 'ephemeral',
		ttlSeconds: 3600,
		source: 'web',
		nowMs: T0
	});
	expect(getActiveCapsule(db, capsule.slug, T0 + 3599_000)).not.toBeNull();
	expect(getActiveCapsule(db, capsule.slug, T0 + 3601_000)).toBeNull();
});

test('delete with the correct token removes the capsule', () => {
	const db = freshDb();
	const { capsule, deleteToken } = createCapsule(db, {
		content: 'delete me',
		ttlSeconds: 3600,
		source: 'web',
		nowMs: T0
	});
	expect(deleteCapsule(db, capsule.slug, deleteToken, T0)).toBe(true);
	expect(getActiveCapsule(db, capsule.slug, T0)).toBeNull();
});

test('delete with a wrong token does nothing', () => {
	const db = freshDb();
	const { capsule } = createCapsule(db, {
		content: 'keep me',
		ttlSeconds: 3600,
		source: 'web',
		nowMs: T0
	});
	expect(deleteCapsule(db, capsule.slug, 'not-the-token', T0)).toBe(false);
	expect(getActiveCapsule(db, capsule.slug, T0)).not.toBeNull();
});

test('missing slug yields null and non-deletable', () => {
	const db = freshDb();
	expect(getActiveCapsule(db, 'nope1234', T0)).toBeNull();
	expect(deleteCapsule(db, 'nope1234', 'whatever', T0)).toBe(false);
});

test('new capsules are created pending', () => {
	const db = freshDb();
	const { capsule } = createCapsule(db, { content: 'x', ttlSeconds: 3600, source: 'web', nowMs: T0 });
	expect(capsule.moderation_status).toBe('pending');
	expect(getCapsuleRaw(db, capsule.slug)!.moderation_status).toBe('pending');
});

test('isBlocked is true only for blocked status', () => {
	const db = freshDb();
	const { capsule } = createCapsule(db, { content: 'x', ttlSeconds: 3600, source: 'web', nowMs: T0 });
	expect(isBlocked(getCapsuleRaw(db, capsule.slug)!)).toBe(false); // pending
	db.query("UPDATE capsules SET moderation_status = 'blocked' WHERE slug = ?").run(capsule.slug);
	expect(isBlocked(getCapsuleRaw(db, capsule.slug)!)).toBe(true);
	db.query("UPDATE capsules SET moderation_status = 'approved' WHERE slug = ?").run(capsule.slug);
	expect(isBlocked(getCapsuleRaw(db, capsule.slug)!)).toBe(false);
});

test('migrateSchema backfills moderation columns on a pre-moderation table', () => {
	// A table created before moderation shipped: the original 13 columns, no moderation_*.
	const db = new Database(':memory:');
	db.run(`CREATE TABLE capsules (
		id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT, content TEXT NOT NULL,
		content_sha256 TEXT NOT NULL, content_bytes INTEGER NOT NULL, created_at TEXT NOT NULL,
		expires_at TEXT NOT NULL, deleted_at TEXT, delete_token_hash TEXT NOT NULL, source TEXT NOT NULL,
		has_callback INTEGER NOT NULL DEFAULT 0, view_count INTEGER NOT NULL DEFAULT 0,
		copy_count INTEGER NOT NULL DEFAULT 0
	)`);
	db.run(`INSERT INTO capsules
		(id, slug, title, content, content_sha256, content_bytes, created_at, expires_at,
		 deleted_at, delete_token_hash, source)
		VALUES ('cap_old', 'oldslug1', 't', 'c', 'h', 1, '2020-01-01T00:00:00Z',
		 '2999-01-01T00:00:00Z', NULL, 'dh', 'web')`);

	migrateSchema(db);

	const row = getCapsuleRaw(db, 'oldslug1')!;
	expect(row.moderation_status).toBe('pending'); // pre-existing rows default to pending → get re-reviewed
	expect(row.moderation_attempts).toBe(0);
	expect(row.moderated_at).toBeNull();
	migrateSchema(db); // idempotent: a second run must not throw
});

test('migrateSchema is idempotent when only SOME moderation columns pre-exist (partial migration)', () => {
	const db = new Database(':memory:');
	db.run(`CREATE TABLE capsules (
		id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT, content TEXT NOT NULL,
		content_sha256 TEXT NOT NULL, content_bytes INTEGER NOT NULL, created_at TEXT NOT NULL,
		expires_at TEXT NOT NULL, deleted_at TEXT, delete_token_hash TEXT NOT NULL, source TEXT NOT NULL,
		has_callback INTEGER NOT NULL DEFAULT 0, view_count INTEGER NOT NULL DEFAULT 0,
		copy_count INTEGER NOT NULL DEFAULT 0,
		moderation_status TEXT NOT NULL DEFAULT 'pending'  -- only one of the new columns present
	)`);
	migrateSchema(db); // must add the remaining columns without choking on the existing one
	const cols = new Set(
		(db.query('PRAGMA table_info(capsules)').all() as { name: string }[]).map((c) => c.name)
	);
	for (const c of ['moderation_reason', 'moderation_model', 'moderated_at', 'moderation_attempts']) {
		expect(cols.has(c)).toBe(true);
	}
});

test('initSchema on an existing pre-moderation table does not throw (SCHEMA_SQL + migrate path)', () => {
	// Regression guard: the moderation index must NOT live in SCHEMA_SQL. On an old table,
	// CREATE TABLE IF NOT EXISTS no-ops, so an index on the not-yet-added moderation_status
	// column would throw "no such column" before migrateSchema can ALTER it in.
	const db = new Database(':memory:');
	db.run(`CREATE TABLE capsules (
		id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT, content TEXT NOT NULL,
		content_sha256 TEXT NOT NULL, content_bytes INTEGER NOT NULL, created_at TEXT NOT NULL,
		expires_at TEXT NOT NULL, deleted_at TEXT, delete_token_hash TEXT NOT NULL, source TEXT NOT NULL,
		has_callback INTEGER NOT NULL DEFAULT 0, view_count INTEGER NOT NULL DEFAULT 0,
		copy_count INTEGER NOT NULL DEFAULT 0
	)`);
	db.run(`INSERT INTO capsules
		(id, slug, title, content, content_sha256, content_bytes, created_at, expires_at,
		 deleted_at, delete_token_hash, source)
		VALUES ('cap_old','oldslug9','t','c','h',1,'2020-01-01T00:00:00Z','2999-01-01T00:00:00Z',NULL,'dh','web')`);

	expect(() => initSchema(db)).not.toThrow();
	expect(getCapsuleRaw(db, 'oldslug9')!.moderation_status).toBe('pending');
	const idx = db
		.query("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_capsules_moderation'")
		.all();
	expect(idx.length).toBe(1);
});

test('autoApproveExhausted skips deleted/expired rows so audit stays clean', () => {
	const db = freshDb();
	const mk = (content: string, ttl: number) =>
		createCapsule(db, { content, ttlSeconds: ttl, source: 'web', nowMs: T0 }).capsule;
	const live = mk('live', 7200);
	const del = mk('deleted', 7200);
	db.query('UPDATE capsules SET moderation_attempts = 3').run(); // both exhausted their budget
	db.query('UPDATE capsules SET deleted_at = ? WHERE id = ?').run(new Date(T0).toISOString(), del.id);

	const n = autoApproveExhausted(db, 3, T0 + 1000);
	expect(n).toBe(1); // only the live row auto-approves
	expect(getCapsuleRaw(db, live.slug)!.moderation_status).toBe('approved');
	expect(getCapsuleRaw(db, del.slug)!.moderation_status).toBe('pending'); // deleted stays out of fallback
});

test('selectPendingForModeration excludes deleted, expired, and budget-exhausted rows', () => {
	const db = freshDb();
	const mk = (content: string, ttl: number) =>
		createCapsule(db, { content, ttlSeconds: ttl, source: 'web', nowMs: T0 }).capsule;
	const live = mk('live', 7200);
	const del = mk('deleted', 7200);
	mk('expired', 3600); // expires at T0+3600s
	const spent = mk('spent', 7200);
	db.query('UPDATE capsules SET deleted_at = ? WHERE id = ?').run(new Date(T0).toISOString(), del.id);
	db.query('UPDATE capsules SET moderation_attempts = 3 WHERE id = ?').run(spent.id);

	const now = T0 + 3601_000; // past `expired`'s expiry, before the others'
	const got = selectPendingForModeration(db, 20, 3, now).map((c) => c.slug);
	expect(got).toEqual([live.slug]);
});

test('applyModeration only decides a pending row; a stale write cannot flip blocked→approved', () => {
	const db = freshDb();
	const cap = createCapsule(db, { content: 'x', ttlSeconds: 3600, source: 'web', nowMs: T0 }).capsule;
	expect(applyModeration(db, cap.id, 'blocked', 'gambling', 'm1', T0)).toBe(true);
	expect(applyModeration(db, cap.id, 'approved', null, 'm1', T0 + 1)).toBe(false); // no-op: already decided
	const row = getCapsuleRaw(db, cap.slug)!;
	expect(row.moderation_status).toBe('blocked');
	expect(row.moderation_reason).toBe('gambling');
});
