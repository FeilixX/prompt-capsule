import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema, getActiveCapsule } from './capsules';
import { loadConfig } from '../config';
import { renderCapsuleText, createCapsuleFromInput, deleteCapsuleByToken } from './handlers';

const T0 = 1_700_000_000_000;
const cfg = loadConfig({}); // defaults: n78.xyz, /c, 16384 bytes, 7d

function freshDb(): Database {
	const db = new Database(':memory:');
	initSchema(db);
	return db;
}

function make(db: Database, content = 'do the thing', extra: Record<string, unknown> = {}) {
	const r = createCapsuleFromInput(db, cfg, { content, ...extra }, T0);
	if (!r.ok) throw new Error('setup create failed: ' + r.error);
	return r.response;
}

test('createCapsuleFromInput returns share metadata built from config', () => {
	const db = freshDb();
	const res = make(db, 'hello', { title: 'greet' });
	expect(res.url).toBe(`https://n78.xyz/c/${res.slug}`);
	expect(res.view_url).toBe(`https://n78.xyz/view/${res.slug}`);
	expect(res.delete_token.length).toBeGreaterThan(16);
	expect(res.share_text).toContain(res.slug);
	// agent_text is machine-facing: it must carry a complete, directly-fetchable URL (scheme included),
	// not the protocol-stripped display form — a weak agent can't reconstruct https:// from a bare host.
	// (Copy wording is intentionally not asserted here — it lives in product copy, not this contract.)
	expect(res.agent_text).toContain(res.url);
	expect(res.agent_text).toContain('https://');
	expect(res.expires_at).toBe(new Date(T0 + 604800 * 1000).toISOString());
});

test('code_share_text carries the code and is URL-free (RED anti-downrank)', () => {
	const db = freshDb();
	const res = make(db, 'hello');
	// Must contain the bare code so a reader can resolve it via read_prompt_tape / GET /c/{code}.
	expect(res.code_share_text).toContain(res.slug);
	// The whole point: NO url in this string — a full link is what gets downranked on 小红书.
	// Match a scheme (https://) deterministically: a base62 slug can contain the substring
	// "http" (~3e-7) but never "://" (':' and '/' aren't base62), so toMatch avoids a flake.
	expect(res.code_share_text).not.toMatch(/https?:\/\//);
	expect(res.code_share_text).not.toContain('n78.xyz'); // '.' not in base62 → deterministic
	expect(res.code_share_text).not.toContain('/c/'); // '/' not in base62 → deterministic
});

test('createCapsuleFromInput rejects empty content', () => {
	const db = freshDb();
	const r = createCapsuleFromInput(db, cfg, { content: '   ' }, T0);
	expect(r.ok).toBe(false);
	if (!r.ok) expect(r.status).toBe(400);
});

test('createCapsuleFromInput rejects content over the byte limit', () => {
	const db = freshDb();
	const small = loadConfig({ MAX_CONTENT_BYTES: '16' });
	const r = createCapsuleFromInput(db, small, { content: 'x'.repeat(100) }, T0);
	expect(r.ok).toBe(false);
	if (!r.ok) expect(r.status).toBe(413);
});

test('renderCapsuleText serves active capsule as text/plain with body + cache-buster', () => {
	const db = freshDb();
	const res = make(db, 'payload text', { title: 't' });
	const out = renderCapsuleText(db, res.slug, T0);
	expect(out.status).toBe(200);
	expect(out.contentType).toBe('text/plain; charset=utf-8');
	expect(out.body).toContain('payload text');
	expect(out.body).toContain('<!-- t=');
});

test('renderCapsuleText returns 404 for missing and 410 for expired', () => {
	const db = freshDb();
	const res = make(db, 'x', { ttl_seconds: 3600 });
	expect(renderCapsuleText(db, 'missing00', T0).status).toBe(404);
	expect(renderCapsuleText(db, res.slug, T0 + 3601_000).status).toBe(410);
});

test('renderCapsuleText increments view_count on a hit', () => {
	const db = freshDb();
	const res = make(db, 'x');
	renderCapsuleText(db, res.slug, T0);
	renderCapsuleText(db, res.slug, T0);
	expect(getActiveCapsule(db, res.slug, T0)!.view_count).toBe(2);
});

test('renderCapsuleText: a pending capsule is publicly readable (publish-then-review)', () => {
	const db = freshDb();
	const res = make(db, 'pending payload'); // fresh create = pending
	expect(renderCapsuleText(db, res.slug, T0).status).toBe(200);
});

test('renderCapsuleText: a blocked capsule reads as 404 (never-existed), not 410', () => {
	const db = freshDb();
	const res = make(db, 'forbidden payload');
	db.query("UPDATE capsules SET moderation_status = 'blocked' WHERE slug = ?").run(res.slug);
	const out = renderCapsuleText(db, res.slug, T0);
	expect(out.status).toBe(404);
	expect(out.body).not.toContain('forbidden payload'); // content must not leak
});

test('renderCapsuleText: blocked takes precedence over expiry (still 404, not 410)', () => {
	const db = freshDb();
	const res = make(db, 'x', { ttl_seconds: 3600 });
	db.query("UPDATE capsules SET moderation_status = 'blocked' WHERE slug = ?").run(res.slug);
	// Past expiry a normal capsule is 410; a blocked one stays 404 — the blocked check runs first.
	expect(renderCapsuleText(db, res.slug, T0 + 3601_000).status).toBe(404);
});

test('deleteCapsuleByToken: right token 200, wrong token 403', () => {
	const db = freshDb();
	const res = make(db, 'x');
	expect(deleteCapsuleByToken(db, res.slug, 'wrong', T0).status).toBe(403);
	expect(deleteCapsuleByToken(db, res.slug, res.delete_token, T0).status).toBe(200);
	expect(renderCapsuleText(db, res.slug, T0).status).toBe(410);
});
