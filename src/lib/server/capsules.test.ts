import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { initSchema, createCapsule, getActiveCapsule, deleteCapsule } from './capsules';

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
