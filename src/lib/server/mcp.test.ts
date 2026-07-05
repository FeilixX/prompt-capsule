import { test, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema } from './capsules';
import { loadConfig } from '../config';
import { mcpCreate, mcpRead, mcpDelete, slugFromTarget } from './mcp';

const config = loadConfig({ PUBLIC_BASE_URL: 'https://n78.xyz' });
let db: Database;
beforeEach(() => {
	db = new Database(':memory:');
	initSchema(db);
});

function deps(ip = '1.1.1.1', nowMs = 1000) {
	return { db, config, clientIp: ip, nowMs };
}

// ---- create ----

test('mcpCreate returns urls + delete_token + agent_text', () => {
	const r = mcpCreate(deps(), { content: 'hello prompt' });
	expect(r.isError).toBeUndefined();
	const out = r.structuredContent as Record<string, string>;
	expect(out.raw_url).toContain('/c/');
	expect(out.view_url).toContain('/view/');
	expect(out.delete_token).toBeTruthy();
	expect(out.expires_at).toBeTruthy();
	expect(out.agent_text).toContain('http'); // C2: agent_text carries the fetchable URL
	// text mirror parses to the same payload
	expect(JSON.parse(r.content[0].text).raw_url).toBe(out.raw_url);
});

test('mcpCreate empty content -> structured empty error', () => {
	const r = mcpCreate(deps(), { content: '   ' });
	expect(r.isError).toBe(true);
	expect((r.structuredContent as any).error.code).toBe('empty');
});

test('mcpCreate oversize -> too_large error', () => {
	const big = 'x'.repeat(config.maxContentBytes + 1);
	const r = mcpCreate(deps(), { content: big });
	expect(r.isError).toBe(true);
	expect((r.structuredContent as any).error.code).toBe('too_large');
	expect((r.structuredContent as any).error.status).toBe(413);
});

test('mcpCreate rate limited after 10 -> rate_limited', () => {
	for (let i = 0; i < 10; i++) mcpCreate(deps('9.9.9.9'), { content: 'x' + i });
	const r = mcpCreate(deps('9.9.9.9'), { content: 'over' });
	expect(r.isError).toBe(true);
	expect((r.structuredContent as any).error.code).toBe('rate_limited');
});

// ---- slugFromTarget ----

test('slugFromTarget handles slug and urls', () => {
	expect(slugFromTarget('X2xIRFcn')).toBe('X2xIRFcn');
	expect(slugFromTarget('https://n78.xyz/c/X2xIRFcn')).toBe('X2xIRFcn');
	expect(slugFromTarget('https://n78.xyz/view/X2xIRFcn?x=1')).toBe('X2xIRFcn');
	expect(slugFromTarget('/c/abc/')).toBe('abc');
});

// ---- read ----

test('mcpRead returns body then not_found for unknown', () => {
	const c = mcpCreate(deps(), { content: 'read me' }).structuredContent as Record<string, string>;
	const slug = slugFromTarget(c.raw_url);
	const r = mcpRead(deps('1.1.1.1', 2000), { target: slug });
	expect(r.isError).toBeUndefined();
	expect(r.content[0].text).toContain('read me');

	const missing = mcpRead(deps('1.1.1.1', 2000), { target: 'nope1234' });
	expect(missing.isError).toBe(true);
	expect((missing.structuredContent as any).error.code).toBe('not_found');
});

// ---- delete ----

test('mcpDelete removes tape; wrong token -> invalid_token; then gone', () => {
	const c = mcpCreate(deps(), { content: 'bye' }).structuredContent as Record<string, string>;
	const slug = slugFromTarget(c.raw_url);

	const wrong = mcpDelete(deps('1.1.1.1', 1500), { slug, delete_token: 'bad' });
	expect(wrong.isError).toBe(true);
	expect((wrong.structuredContent as any).error.code).toBe('invalid_token');

	const good = mcpDelete(deps('1.1.1.1', 1500), { slug, delete_token: c.delete_token });
	expect(good.isError).toBeUndefined();

	const after = mcpRead(deps('1.1.1.1', 1600), { target: slug });
	expect(after.isError).toBe(true);
	expect((after.structuredContent as any).error.code).toBe('gone');
});
