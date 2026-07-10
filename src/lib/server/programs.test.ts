import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema, applyModeration, getCapsuleRaw } from './capsules';
import { loadConfig } from '../config';
import { createCapsuleFromInput, deleteCapsuleByToken } from './handlers';
import {
	initProgramsSchema,
	isValidProgramName,
	resolveTarget,
	upsertProgram,
	renewProgram,
	listPrograms,
	deleteProgram,
	bumpProgramHits,
	getProgramByLower
} from './programs';

const T0 = 1_700_000_000_000;
const cfg = loadConfig({}); // slugLength 8, defaultTtl 7d

function freshDb(): Database {
	const db = new Database(':memory:');
	initSchema(db);
	initProgramsSchema(db, cfg);
	return db;
}

function make(db: Database, content = 'program payload', extra: Record<string, unknown> = {}) {
	const r = createCapsuleFromInput(db, cfg, { content, ...extra }, T0);
	if (!r.ok) throw new Error('setup create failed: ' + r.error);
	return r.response;
}

/** Raw insert bypassing validation — for guard tests that need an "impossible" row. */
function rawInsertProgram(db: Database, name: string, slug: string) {
	db.query(
		`INSERT INTO programs (name, name_lower, current_slug, note, hits, created_at, updated_at)
		 VALUES (?, ?, ?, NULL, 0, ?, ?)`
	).run(name, name.toLowerCase(), slug, new Date(T0).toISOString(), new Date(T0).toISOString());
}

// ---- name rules -----------------------------------------------------------

test('program name: 4-32 alphanumerics, never slugLength chars', () => {
	expect(isValidProgramName('abc', cfg)).toBe(false); // 3 — below deployed client floor {4,64}
	expect(isValidProgramName('abcd', cfg)).toBe(true);
	expect(isValidProgramName('CHIBI01', cfg)).toBe(true); // 7
	expect(isValidProgramName('ABCD1234', cfg)).toBe(false); // 8 == slugLength → shadowable
	expect(isValidProgramName('a'.repeat(32), cfg)).toBe(true);
	expect(isValidProgramName('a'.repeat(33), cfg)).toBe(false);
	expect(isValidProgramName('ab-cd', cfg)).toBe(false); // non-alnum
	expect(isValidProgramName('节目码', cfg)).toBe(false);
});

// ---- upsert ---------------------------------------------------------------

test('upsertProgram creates a program pointing at a live (pending is fine) capsule', () => {
	const db = freshDb();
	const tape = make(db); // fresh tapes are moderation `pending` — publish-then-review
	const out = upsertProgram(db, cfg, 'CHIBI01', tape.slug, '选题:chibi 贴贴', T0);
	expect(out.ok).toBe(true);
	if (!out.ok) return;
	expect(out.program.name).toBe('CHIBI01');
	expect(out.program.name_lower).toBe('chibi01');
	expect(out.program.current_slug).toBe(tape.slug);
	expect(out.program.note).toBe('选题:chibi 贴贴');
	expect(out.program.hits).toBe(0);
});

test('upsertProgram rejects invalid names and slug-colliding names', () => {
	const db = freshDb();
	const tape = make(db);
	expect(upsertProgram(db, cfg, 'ab', tape.slug, undefined, T0).ok).toBe(false);
	// a name equal to an EXISTING capsule slug would be permanently shadowed (slug-first)
	const other = make(db, 'other');
	const collide = upsertProgram(db, cfg, other.slug, tape.slug, undefined, T0);
	expect(collide.ok).toBe(false);
	if (!collide.ok) expect(collide.status).toBe(422);
});

test('upsertProgram rejects dead targets: missing, expired, deleted, blocked', () => {
	const db = freshDb();

	const missing = upsertProgram(db, cfg, 'PROG1', 'nosuchsl', undefined, T0);
	expect(missing.ok).toBe(false);

	const shortLived = make(db, 'x', { ttl_seconds: 1 });
	const expired = upsertProgram(db, cfg, 'PROG2', shortLived.slug, undefined, T0 + 2000);
	expect(expired.ok).toBe(false);

	const deleted = make(db, 'y');
	deleteCapsuleByToken(db, deleted.slug, deleted.delete_token, T0);
	expect(upsertProgram(db, cfg, 'PROG3', deleted.slug, undefined, T0).ok).toBe(false);

	const blocked = make(db, 'z');
	applyModeration(db, blocked.id, 'blocked', 'test', 'test-model', T0);
	expect(upsertProgram(db, cfg, 'PROG4', blocked.slug, undefined, T0).ok).toBe(false);
});

test('upsertProgram repoints case-insensitively, keeps display name, note semantics', () => {
	const db = freshDb();
	const a = make(db, 'a');
	const b = make(db, 'b');
	upsertProgram(db, cfg, 'CHIBI01', a.slug, 'first note', T0);

	// repoint via a different case; note undefined = keep existing
	const re = upsertProgram(db, cfg, 'chibi01', b.slug, undefined, T0 + 1000);
	expect(re.ok).toBe(true);
	if (!re.ok) return;
	expect(re.program.name).toBe('CHIBI01'); // display form from creation survives
	expect(re.program.current_slug).toBe(b.slug);
	expect(re.program.note).toBe('first note');
	expect(re.program.updated_at).toBe(new Date(T0 + 1000).toISOString());

	// note null = clear
	const cleared = upsertProgram(db, cfg, 'CHIBI01', b.slug, null, T0 + 2000);
	if (cleared.ok) expect(cleared.program.note).toBeNull();
});

// ---- resolveTarget --------------------------------------------------------

test('resolveTarget: exact capsule slug always wins, even expired rows', () => {
	const db = freshDb();
	const tape = make(db);
	expect(resolveTarget(db, cfg, tape.slug)).toEqual({ slug: tape.slug, program: null });

	const shortLived = make(db, 'x', { ttl_seconds: 1 });
	// expired row still resolves as a slug (renderCapsuleText owns the 410) — program stays null
	expect(resolveTarget(db, cfg, shortLived.slug)).toEqual({ slug: shortLived.slug, program: null });
});

test('resolveTarget: program hit is case-insensitive and returns display name', () => {
	const db = freshDb();
	const tape = make(db);
	upsertProgram(db, cfg, 'CHIBI01', tape.slug, undefined, T0);
	expect(resolveTarget(db, cfg, 'chibi01')).toEqual({ slug: tape.slug, program: 'CHIBI01' });
	expect(resolveTarget(db, cfg, 'CHIBI01')).toEqual({ slug: tape.slug, program: 'CHIBI01' });
});

test('resolveTarget: precheck refuses garbage and slugLength-shaped tokens', () => {
	const db = freshDb();
	expect(resolveTarget(db, cfg, 'ab')).toBeNull(); // too short
	expect(resolveTarget(db, cfg, 'x'.repeat(33))).toBeNull(); // too long
	expect(resolveTarget(db, cfg, '节目码测试')).toBeNull(); // non-ASCII
	// even a (raw-inserted, normally impossible) 8-char program is unreachable: the
	// precheck guarantees slugLength-shaped tokens never touch the programs table
	rawInsertProgram(db, 'ABCD1234', 'whatever1');
	expect(resolveTarget(db, cfg, 'ABCD1234')).toBeNull();
});

test('initProgramsSchema fails loud when a program name length == slugLength', () => {
	const db = new Database(':memory:');
	initSchema(db);
	initProgramsSchema(db, cfg);
	rawInsertProgram(db, 'ABCD1234', 'whatever1'); // 8 == slugLength
	expect(() => initProgramsSchema(db, cfg)).toThrow(/SLUG_LENGTH/);
});

// ---- renew ----------------------------------------------------------------

test('renewProgram mints a new tape verbatim and repoints; old tape untouched', () => {
	const db = freshDb();
	const tape = make(db, '正文内容\n第二行', { title: '标题', has_callback: true });
	upsertProgram(db, cfg, 'CHIBI01', tape.slug, undefined, T0);
	bumpProgramHits(db, 'chibi01');

	const T1 = T0 + 3600_000;
	const out = renewProgram(db, cfg, 'chibi01', T1);
	expect(out.ok).toBe(true);
	if (!out.ok) return;

	expect(out.capsule.slug).not.toBe(tape.slug);
	expect(out.capsule.content).toBe('正文内容\n第二行');
	expect(out.capsule.title).toBe('标题');
	expect(out.capsule.has_callback).toBe(1);
	expect(out.capsule.expires_at).toBe(new Date(T1 + cfg.defaultTtlSeconds * 1000).toISOString());
	expect(out.deleteToken.length).toBeGreaterThan(16);
	expect(out.program.current_slug).toBe(out.capsule.slug);
	expect(out.program.hits).toBe(1); // hits survive the swap

	// old tape keeps its own contract: same expiry, not deleted
	const old = getCapsuleRaw(db, tape.slug);
	expect(old?.expires_at).toBe(tape.expires_at);
	expect(old?.deleted_at).toBeNull();
});

test('renewProgram works from an EXPIRED current tape (row retained, content intact)', () => {
	const db = freshDb();
	const tape = make(db, 'short life', { ttl_seconds: 1 });
	upsertProgram(db, cfg, 'CHIBI01', tape.slug, undefined, T0); // pointed while alive
	const out = renewProgram(db, cfg, 'CHIBI01', T0 + 60_000); // long after expiry
	expect(out.ok).toBe(true);
	if (out.ok) expect(out.capsule.content).toBe('short life');
});

test('renewProgram fail-closed: missing 404, blocked 409, deleted 409, dangling 500', () => {
	const db = freshDb();

	const missing = renewProgram(db, cfg, 'NOPE1', T0);
	expect(!missing.ok && missing.status === 404).toBe(true);

	const blocked = make(db, 'bad');
	upsertProgram(db, cfg, 'PROGB', blocked.slug, undefined, T0);
	applyModeration(db, blocked.id, 'blocked', 'test', 'test-model', T0);
	const rb = renewProgram(db, cfg, 'PROGB', T0);
	expect(!rb.ok && rb.status === 409).toBe(true);

	const deleted = make(db, 'gone');
	upsertProgram(db, cfg, 'PROGD', deleted.slug, undefined, T0);
	deleteCapsuleByToken(db, deleted.slug, deleted.delete_token, T0);
	const rd = renewProgram(db, cfg, 'PROGD', T0);
	expect(!rd.ok && rd.status === 409).toBe(true);

	rawInsertProgram(db, 'DANGL', 'neverwas1');
	const rg = renewProgram(db, cfg, 'DANGL', T0);
	expect(!rg.ok && rg.status === 500).toBe(true);
});

// ---- hits / list / delete -------------------------------------------------

test('bumpProgramHits increments; listPrograms joins current expiry', () => {
	const db = freshDb();
	const tape = make(db);
	upsertProgram(db, cfg, 'CHIBI01', tape.slug, undefined, T0);
	bumpProgramHits(db, 'chibi01');
	bumpProgramHits(db, 'chibi01');
	expect(getProgramByLower(db, 'chibi01')?.hits).toBe(2);

	const list = listPrograms(db);
	expect(list.length).toBe(1);
	expect(list[0].name).toBe('CHIBI01');
	expect(list[0].current_expires_at).toBe(tape.expires_at);
});

test('deleteProgram removes the pointer only, case-insensitively', () => {
	const db = freshDb();
	const tape = make(db);
	upsertProgram(db, cfg, 'CHIBI01', tape.slug, undefined, T0);
	expect(deleteProgram(db, 'chibi01')).toBe(true);
	expect(getProgramByLower(db, 'chibi01')).toBeNull();
	expect(deleteProgram(db, 'chibi01')).toBe(false);
	// tape untouched
	expect(getCapsuleRaw(db, tape.slug)).not.toBeNull();
});
