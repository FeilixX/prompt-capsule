import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema, createCapsule, getCapsuleRaw } from './capsules';
import { renderCapsuleText } from './handlers';
import { loadConfig, type Config } from '../config';
import {
	buildModerationPrompt,
	parseVerdicts,
	moderateOnce,
	buildDeepseekRequestBody,
	extractDeepseekContent,
	type DeepseekCaller
} from './moderation';

const T0 = 1_700_000_000_000;

function freshDb(): Database {
	const db = new Database(':memory:');
	initSchema(db);
	return db;
}

function cfg(overrides: Record<string, string> = {}): Config {
	return loadConfig({ MODERATION_ENABLED: 'true', DEEPSEEK_API_KEY: 'sk-test', ...overrides });
}

function seed(db: Database, content: string, title: string | null = null) {
	return createCapsule(db, { content, title, ttlSeconds: 3600, source: 'web', nowMs: T0 }).capsule;
}

/** Caller that returns a canned assistant response, or throws to simulate an API failure. */
function fixedCaller(response: string | Error): DeepseekCaller {
	return async () => {
		if (response instanceof Error) throw response;
		return response;
	};
}

// ---- buildModerationPrompt ----------------------------------------------

test('buildModerationPrompt satisfies DeepSeek JSON mode and sends FULL content (no truncation bypass)', () => {
	const db = freshDb();
	const cap = seed(db, 'A'.repeat(5000), 'longtitle');
	const { system, user } = buildModerationPrompt([cap]);
	expect(system.toLowerCase()).toContain('json'); // DeepSeek requires the literal token in the prompt
	expect(system).toContain('"results"'); // and a format sample
	expect(system).toContain('防操纵'); // cross-capsule injection guard is present
	expect(user.toLowerCase()).toContain('json');
	const payload = JSON.parse(user.slice(user.indexOf('[')));
	expect(payload[0].content.length).toBe(5000); // FULL content — truncation would be a moderation bypass
	expect(payload[0].i).toBe(0);
});

// ---- parseVerdicts -------------------------------------------------------

test('parseVerdicts parses a well-formed batch', () => {
	const v = parseVerdicts('{"results":[{"i":0,"verdict":"allow"},{"i":1,"verdict":"block","category":"gambling"}]}');
	expect(v).toEqual([
		{ i: 0, verdict: 'allow', category: undefined, reason: undefined },
		{ i: 1, verdict: 'block', category: 'gambling', reason: undefined }
	]);
});

test('parseVerdicts returns null on empty content (DeepSeek may return empty)', () => {
	expect(parseVerdicts('')).toBeNull();
	expect(parseVerdicts('   ')).toBeNull();
});

test('parseVerdicts returns null on malformed JSON or missing results array', () => {
	expect(parseVerdicts('not json at all')).toBeNull();
	expect(parseVerdicts('{"foo":1}')).toBeNull();
	expect(parseVerdicts('[]')).toBeNull(); // top-level array, no results key
});

test('parseVerdicts skips malformed entries but keeps valid ones', () => {
	const v = parseVerdicts(
		'{"results":[{"i":0,"verdict":"maybe"},{"i":1,"verdict":"block"},{"verdict":"allow"}]}'
	);
	expect(v).toEqual([{ i: 1, verdict: 'block', category: undefined, reason: undefined }]);
});

test('parseVerdicts rejects non-integer / negative / string indices (guards undefined-index crash)', () => {
	expect(parseVerdicts('{"results":[{"i":0.5,"verdict":"allow"}]}')).toEqual([]);
	expect(parseVerdicts('{"results":[{"i":-1,"verdict":"block"}]}')).toEqual([]);
	expect(parseVerdicts('{"results":[{"i":"0","verdict":"allow"}]}')).toEqual([]);
	// a valid entry still survives alongside a bad index
	expect(parseVerdicts('{"results":[{"i":0.5,"verdict":"allow"},{"i":2,"verdict":"block"}]}')).toEqual([
		{ i: 2, verdict: 'block', category: undefined, reason: undefined }
	]);
});

// ---- moderateOnce --------------------------------------------------------

test('moderateOnce: a block verdict makes the capsule read as 404', async () => {
	const db = freshDb();
	const bad = seed(db, 'how to run an illegal lottery');
	const r = await moderateOnce(
		db,
		cfg(),
		fixedCaller('{"results":[{"i":0,"verdict":"block","category":"gambling"}]}'),
		T0
	);
	expect(r.blocked).toBe(1);
	const row = getCapsuleRaw(db, bad.slug)!;
	expect(row.moderation_status).toBe('blocked');
	expect(row.moderation_reason).toBe('gambling');
	expect(renderCapsuleText(db, bad.slug, T0).status).toBe(404);
});

test('moderateOnce: an allow verdict approves and keeps it readable', async () => {
	const db = freshDb();
	const ok = seed(db, 'write me a haiku about spring');
	const r = await moderateOnce(db, cfg(), fixedCaller('{"results":[{"i":0,"verdict":"allow"}]}'), T0);
	expect(r.approved).toBe(1);
	const row = getCapsuleRaw(db, ok.slug)!;
	expect(row.moderation_status).toBe('approved');
	expect(row.moderation_reason).toBeNull();
	expect(row.moderation_model).toBe('deepseek-v4-flash');
	expect(renderCapsuleText(db, ok.slug, T0).status).toBe(200);
});

test('moderateOnce: empty pending set is a no-op', async () => {
	const db = freshDb();
	const r = await moderateOnce(db, cfg(), fixedCaller('{"results":[]}'), T0);
	expect(r).toEqual({ autoApproved: 0, examined: 0, approved: 0, blocked: 0, failed: 0 });
});

test('moderateOnce: an API failure bumps attempts; capsule stays pending and readable', async () => {
	const db = freshDb();
	const cap = seed(db, 'x');
	const r = await moderateOnce(db, cfg(), fixedCaller(new Error('network boom')), T0);
	expect(r.failed).toBe(1);
	const row = getCapsuleRaw(db, cap.slug)!;
	expect(row.moderation_status).toBe('pending');
	expect(row.moderation_attempts).toBe(1);
	expect(renderCapsuleText(db, cap.slug, T0).status).toBe(200); // publish-then-review: still live
});

test('moderateOnce: a capsule DeepSeek skipped gets an attempt, not a verdict', async () => {
	const db = freshDb();
	const a = seed(db, 'aaa'); // created first → index 0
	const b = seed(db, 'bbb'); // index 1, will be skipped
	const r = await moderateOnce(db, cfg(), fixedCaller('{"results":[{"i":0,"verdict":"allow"}]}'), T0);
	expect(r.approved).toBe(1);
	expect(r.failed).toBe(1);
	expect(getCapsuleRaw(db, a.slug)!.moderation_status).toBe('approved');
	const rowB = getCapsuleRaw(db, b.slug)!;
	expect(rowB.moderation_status).toBe('pending');
	expect(rowB.moderation_attempts).toBe(1);
});

test('moderateOnce: fail-open flips at the ceiling in the SAME round (not one loop later)', async () => {
	const db = freshDb();
	const cap = seed(db, 'unreachable-during-outage');
	const c = cfg({ MODERATION_MAX_ATTEMPTS: '3' });
	const down = fixedCaller(new Error('deepseek down'));

	const r1 = await moderateOnce(db, c, down, T0);
	expect(r1.autoApproved).toBe(0);
	expect(getCapsuleRaw(db, cap.slug)!.moderation_attempts).toBe(1);
	const r2 = await moderateOnce(db, c, down, T0 + 1000);
	expect(r2.autoApproved).toBe(0);
	expect(getCapsuleRaw(db, cap.slug)!.moderation_attempts).toBe(2);

	// third failed round hits attempts=maxAttempts → auto-approved immediately this round
	const r3 = await moderateOnce(db, c, down, T0 + 2000);
	expect(r3.examined).toBe(1);
	expect(r3.autoApproved).toBe(1);
	const row = getCapsuleRaw(db, cap.slug)!;
	expect(row.moderation_status).toBe('approved');
	expect(row.moderation_model).toBe('fallback');
	expect(renderCapsuleText(db, cap.slug, T0 + 2000).status).toBe(200);
});

test('moderateOnce: verdicts map by i VALUE not array position; duplicate i ignored', async () => {
	const db = freshDb();
	const a = seed(db, 'first-created'); // i=0 (oldest)
	const b = seed(db, 'second-created'); // i=1
	// out-of-order results, plus a duplicate i:1 that must be ignored
	const caller = fixedCaller(
		'{"results":[{"i":1,"verdict":"block","category":"x"},{"i":0,"verdict":"allow"},{"i":1,"verdict":"allow"}]}'
	);
	const r = await moderateOnce(db, cfg(), caller, T0);
	expect(r.approved).toBe(1);
	expect(r.blocked).toBe(1);
	expect(getCapsuleRaw(db, a.slug)!.moderation_status).toBe('approved'); // i=0
	expect(getCapsuleRaw(db, b.slug)!.moderation_status).toBe('blocked'); // i=1, the dup 'allow' had no effect
});

test('moderateOnce: a capsule deleted before review is never sent to DeepSeek', async () => {
	const db = freshDb();
	const cap = seed(db, 'DELETED_CONTENT_MARKER');
	db.query('UPDATE capsules SET deleted_at = ? WHERE slug = ?').run(new Date(T0).toISOString(), cap.slug);
	let shipped = false;
	const caller: DeepseekCaller = async (_s, user) => {
		if (user.includes('DELETED_CONTENT_MARKER')) shipped = true;
		return '{"results":[]}';
	};
	const r = await moderateOnce(db, cfg(), caller, T0 + 1000);
	expect(r.examined).toBe(0);
	expect(shipped).toBe(false); // deleted content must not reach a third party
});

test('extractDeepseekContent pulls assistant text, or "" on an unexpected shape', () => {
	expect(extractDeepseekContent({ choices: [{ message: { content: 'hi' } }] })).toBe('hi');
	expect(extractDeepseekContent({})).toBe('');
	expect(extractDeepseekContent({ choices: [] })).toBe('');
	expect(extractDeepseekContent(null)).toBe('');
	expect(extractDeepseekContent({ choices: [{ message: {} }] })).toBe('');
});

test('buildDeepseekRequestBody sets JSON mode, model, and deterministic temperature', () => {
	const body = buildDeepseekRequestBody('sys', 'usr', 'deepseek-v4-flash', 4096) as {
		model: string;
		response_format: unknown;
		temperature: number;
		max_tokens: number;
		messages: { role: string; content: string }[];
	};
	expect(body.model).toBe('deepseek-v4-flash');
	expect(body.response_format).toEqual({ type: 'json_object' });
	expect(body.temperature).toBe(0);
	expect(body.max_tokens).toBe(4096);
	expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
	expect(body.messages[1]).toEqual({ role: 'user', content: 'usr' });
});
