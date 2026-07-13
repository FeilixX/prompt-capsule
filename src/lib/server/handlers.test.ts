import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema, getActiveCapsule, getCapsuleRaw, applyModeration } from './capsules';
import { loadConfig } from '../config';
import {
	renderCapsuleText,
	renderTape,
	loadViewData,
	createCapsuleFromInput,
	deleteCapsuleByToken,
	recordCopy
} from './handlers';
import { initProgramsSchema, upsertProgram, getProgramByLower } from './programs';

const T0 = 1_700_000_000_000;
const cfg = loadConfig({}); // defaults: n78.xyz, /c, 16384 bytes, 7d

function freshDb(): Database {
	const db = new Database(':memory:');
	initSchema(db);
	// renderTape resolves through the programs table — create it like getDb() does.
	initProgramsSchema(db, cfg);
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

test('share strings default to English; lang:zh switches them; agent_text stays English', () => {
	const db = freshDb();
	// default (no lang) → English human share strings
	const en = make(db, 'hello');
	expect(en.share_text).toContain('Prompt Tape:');
	expect(en.code_share_text).toContain('read prompt tape');
	// explicit zh → Chinese human share strings
	const zh = make(db, 'hello', { lang: 'zh' });
	expect(zh.share_text).toContain('提示词卡带:');
	expect(zh.code_share_text).toContain('读取提示词卡带');
	// agent_text is agent-facing: English regardless of lang
	expect(en.agent_text).toContain('Open this link');
	expect(zh.agent_text).toContain('Open this link');
});

test('text-path 404/410 bodies are English (agent audience)', () => {
	const db = freshDb();
	const gone = renderCapsuleText(db, 'nope-not-here', T0);
	expect(gone.body).toBe('404 Not found.');
	const res = make(db);
	const dead = renderCapsuleText(db, res.slug, T0 + 604800 * 1000 + 1);
	expect(dead.status).toBe(410);
	expect(dead.body).toContain('Gone');
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

test('recordCopy increments copy_count on a live capsule', () => {
	const db = freshDb();
	const res = make(db, 'x');
	expect(recordCopy(db, res.slug, T0)).toBe(true);
	expect(recordCopy(db, res.slug, T0)).toBe(true);
	expect(getActiveCapsule(db, res.slug, T0)!.copy_count).toBe(2);
});

test('recordCopy is a no-op for missing / expired / blocked / deleted capsules', () => {
	const db = freshDb();
	// missing slug
	expect(recordCopy(db, 'missing00', T0)).toBe(false);
	// expired
	const exp = make(db, 'x', { ttl_seconds: 3600 });
	expect(recordCopy(db, exp.slug, T0 + 3601_000)).toBe(false);
	// blocked reads as never-existed → not counted
	const blk = make(db, 'x');
	db.query("UPDATE capsules SET moderation_status = 'blocked' WHERE slug = ?").run(blk.slug);
	expect(recordCopy(db, blk.slug, T0)).toBe(false);
	// soft-deleted
	const del = make(db, 'x');
	deleteCapsuleByToken(db, del.slug, del.delete_token, T0);
	expect(recordCopy(db, del.slug, T0)).toBe(false);
	// none of the no-ops moved the counter
	expect(getActiveCapsule(db, exp.slug, T0)!.copy_count).toBe(0);
});

test('deleteCapsuleByToken: right token 200, wrong token 403', () => {
	const db = freshDb();
	const res = make(db, 'x');
	expect(deleteCapsuleByToken(db, res.slug, 'wrong', T0).status).toBe(403);
	expect(deleteCapsuleByToken(db, res.slug, res.delete_token, T0).status).toBe(200);
	expect(renderCapsuleText(db, res.slug, T0).status).toBe(410);
});

// ---- renderTape (slug OR program code) -------------------------------------

function makeProgram(db: Database, name: string, slug: string) {
	const out = upsertProgram(db, cfg, name, slug, undefined, T0);
	if (!out.ok) throw new Error('setup program failed: ' + out.error);
	return out.program;
}

test('renderTape: direct slug path is byte-identical to renderCapsuleText', () => {
	const db = freshDb();
	const res = make(db, 'direct payload', { title: 't' });
	// fixed nowMs → identical cache-buster; the only difference would be a semantic drift
	expect(renderTape(db, cfg, res.slug, T0)).toEqual(renderCapsuleText(db, res.slug, T0));
	// dead direct slug keeps the terminal 410 (not the program off-air text)
	const exp = make(db, 'x', { ttl_seconds: 3600 });
	const dead = renderTape(db, cfg, exp.slug, T0 + 3601_000);
	expect(dead.status).toBe(410);
	expect(dead.body).not.toContain('Off air');
});

test('renderTape: unknown target is 404', () => {
	const db = freshDb();
	expect(renderTape(db, cfg, 'NOPROG99', T0).status).toBe(404);
	expect(renderTape(db, cfg, 'missing00', T0).status).toBe(404);
});

test('renderTape: live program serves the tape and counts view_count AND hits', () => {
	const db = freshDb();
	const res = make(db, 'program payload');
	makeProgram(db, 'CHIBI01', res.slug);
	const out = renderTape(db, cfg, 'chibi01', T0); // case-insensitive on purpose
	expect(out.status).toBe(200);
	expect(out.body).toContain('program payload');
	expect(getCapsuleRaw(db, res.slug)!.view_count).toBe(1);
	expect(getProgramByLower(db, 'chibi01')!.hits).toBe(1);
});

test('renderTape: program with expired tape → off-air 410 naming the program, no hits', () => {
	const db = freshDb();
	const res = make(db, 'secret old content', { ttl_seconds: 3600 });
	makeProgram(db, 'CHIBI01', res.slug);
	const out = renderTape(db, cfg, 'CHIBI01', T0 + 3601_000);
	expect(out.status).toBe(410);
	expect(out.body).toContain('CHIBI01');
	expect(out.body).toContain('Off air');
	expect(out.body).not.toContain('secret old content');
	expect(getProgramByLower(db, 'chibi01')!.hits).toBe(0); // hits only on 200
});

test('renderTape: program with deleted tape → off-air 410 (deliberate kill stays dark)', () => {
	const db = freshDb();
	const res = make(db, 'x');
	makeProgram(db, 'CHIBI01', res.slug);
	deleteCapsuleByToken(db, res.slug, res.delete_token, T0);
	const out = renderTape(db, cfg, 'CHIBI01', T0);
	expect(out.status).toBe(410);
	expect(out.body).toContain('Off air');
});

test('renderTape: program with blocked tape → the SAME 404 as a direct blocked hit', () => {
	const db = freshDb();
	const res = make(db, 'forbidden payload');
	makeProgram(db, 'CHIBI01', res.slug);
	applyModeration(db, res.id, 'blocked', 'test', 'test-model', T0);
	const viaProgram = renderTape(db, cfg, 'CHIBI01', T0);
	const direct = renderTape(db, cfg, res.slug, T0);
	expect(viaProgram.status).toBe(404);
	expect(viaProgram).toEqual(direct); // byte-identical: no takedown signal via the program
	expect(viaProgram.body).not.toContain('forbidden payload');
});

test('renderTape: dangling program pointer → defensive off-air 410', () => {
	const db = freshDb();
	const res = make(db, 'x');
	makeProgram(db, 'CHIBI01', res.slug);
	db.query('DELETE FROM capsules WHERE slug = ?').run(res.slug); // never happens in prod
	const out = renderTape(db, cfg, 'CHIBI01', T0);
	expect(out.status).toBe(410);
	expect(out.body).toContain('Off air');
});

// ---- loadViewData (/view page data) ----------------------------------------

test('loadViewData: off-air shape carries ONLY the program name — no dead-tape metadata', () => {
	const db = freshDb();
	const res = make(db, 'secret body', { title: '秘密标题', ttl_seconds: 3600 });
	makeProgram(db, 'CHIBI01', res.slug);
	const offair = loadViewData(db, cfg, 'CHIBI01', T0 + 3601_000);
	// toEqual with the exact literal nails key-set equality: nothing else may leak
	expect(offair).toEqual({ kind: 'program-offair', program: 'CHIBI01' });
});

test('loadViewData: live program uses program-form share URLs, resolved slug for the beacon', () => {
	const db = freshDb();
	const res = make(db, 'body', { title: 't' });
	makeProgram(db, 'CHIBI01', res.slug);
	const view = loadViewData(db, cfg, 'chibi01', T0);
	expect(view?.kind).toBe('tape');
	if (view?.kind !== 'tape') return;
	expect(view.url).toBe('https://n78.xyz/c/CHIBI01');
	expect(view.display).toBe('n78.xyz/c/CHIBI01');
	expect(view.agentText).toContain('/c/CHIBI01');
	expect(view.slug).toBe(res.slug); // copy beacon still hits the real capsule
	expect(view.program).toBe('CHIBI01');
	expect(view.active).toBe(true);
});

test('loadViewData: blocked reads as null (404) via program AND direct', () => {
	const db = freshDb();
	const res = make(db, 'forbidden');
	makeProgram(db, 'CHIBI01', res.slug);
	applyModeration(db, res.id, 'blocked', 'test', 'test-model', T0);
	expect(loadViewData(db, cfg, 'CHIBI01', T0)).toBeNull();
	expect(loadViewData(db, cfg, res.slug, T0)).toBeNull();
	expect(loadViewData(db, cfg, 'missing00', T0)).toBeNull();
});

test('loadViewData: direct dead slug keeps its receipt (legacy behavior, holder knows)', () => {
	const db = freshDb();
	const res = make(db, 'body', { title: '标题', ttl_seconds: 3600 });
	const view = loadViewData(db, cfg, res.slug, T0 + 3601_000);
	expect(view?.kind).toBe('tape');
	if (view?.kind !== 'tape') return;
	expect(view.active).toBe(false);
	expect(view.content).toBeNull(); // content cleared…
	expect(view.title).toBe('标题'); // …but the receipt (title/dates) stays for the slug holder
	expect(view.expiresAt).toBe(res.expires_at);
	expect(view.program).toBeNull();
});
