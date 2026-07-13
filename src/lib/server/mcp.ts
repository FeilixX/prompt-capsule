import type { Database } from 'bun:sqlite';
import type { Config } from '../config';
import { createCapsuleFromInput, renderTape, deleteCapsuleByToken } from './handlers';
import { checkRateLimit } from './rateLimit';
import { CREATE_RATE } from './limits';

// Pure MCP tool wrappers over the existing handlers. No transport, no HTTP —
// these are unit-testable with bun test via relative imports (E1: bun test
// can't resolve SvelteKit $lib/$app aliases, so the route stays a thin shell
// and all logic lives here).

export interface McpDeps {
	db: Database;
	config: Config;
	clientIp: string;
	nowMs: number;
}

export interface McpResult {
	content: { type: 'text'; text: string }[];
	structuredContent?: Record<string, unknown>;
	isError?: boolean;
}

/** Stable machine-readable error codes so agents can branch (C3). */
export type McpErrorCode =
	| 'rate_limited'
	| 'too_large'
	| 'empty'
	| 'invalid_input'
	| 'not_found'
	| 'gone'
	| 'invalid_token';

function ok(text: string, structured?: Record<string, unknown>): McpResult {
	return { content: [{ type: 'text', text }], structuredContent: structured };
}

function err(code: McpErrorCode, status: number, message: string): McpResult {
	return {
		content: [{ type: 'text', text: `${code} (${status}): ${message}` }],
		structuredContent: { error: { code, status, message } },
		isError: true
	};
}

// Map a handler error string to a stable code. The handlers return prose
// errors; we classify them by status for the structured error contract.
function classifyCreate(status: number, message: string): McpResult {
	if (status === 413) return err('too_large', status, message);
	if (message.includes('empty')) return err('empty', status, message);
	return err('invalid_input', status, message);
}

function logTool(tool: string, ip: string, ok: boolean): void {
	console.log(JSON.stringify({ evt: 'mcp_tool', tool, ip, ok, ts: Date.now() }));
}

// ---- create -------------------------------------------------------------

export function mcpCreate(
	deps: McpDeps,
	input: { content: string; title?: string; ttl_seconds?: number; lang?: 'zh' | 'en' }
): McpResult {
	const rl = checkRateLimit(`create:${deps.clientIp}`, deps.nowMs, CREATE_RATE);
	if (!rl.allowed) {
		logTool('create', deps.clientIp, false);
		return err('rate_limited', 429, 'rate limited, slow down (10/min)');
	}

	const outcome = createCapsuleFromInput(
		deps.db,
		deps.config,
		{
			content: input.content,
			title: input.title,
			ttl_seconds: input.ttl_seconds,
			source: 'mcp',
			lang: input.lang
		},
		deps.nowMs
	);
	if (!outcome.ok) {
		logTool('create', deps.clientIp, false);
		return classifyCreate(outcome.status, outcome.error);
	}

	const r = outcome.response;
	const payload = {
		view_url: r.view_url,
		raw_url: r.url,
		code: r.slug, // the tape code = slug; downstream can pass just the code to read_prompt_tape
		delete_token: r.delete_token,
		expires_at: r.expires_at,
		code_share_text: r.code_share_text, // URL-free share line (dodges link downranking)
		agent_text: r.agent_text // C2: the "fetch this URL and execute it" line
	};
	logTool('create', deps.clientIp, true);
	return ok(JSON.stringify(payload), payload);
}

// ---- read ---------------------------------------------------------------

/** Extract a slug from either a bare slug or a full /c/{slug} or /view/{slug} URL. */
export function slugFromTarget(target: string): string {
	let t = target.trim();
	if (/^https?:\/\//i.test(t)) t = new URL(t).pathname;
	t = t.replace(/[?#].*$/, ''); // drop query/hash (covers relative /c/x?a=1, not just full URLs)
	t = t.replace(/\/+$/, ''); // strip trailing slashes
	return t.slice(t.lastIndexOf('/') + 1); // last path segment (whole string if no slash)
}

export function mcpRead(deps: McpDeps, input: { target: string }): McpResult {
	// The extracted token may be a capsule slug OR a program code — renderTape resolves both.
	const slug = slugFromTarget(input.target);
	const res = renderTape(deps.db, deps.config, slug, deps.nowMs);
	if (res.status === 200) {
		logTool('read', deps.clientIp, true);
		return ok(res.body);
	}
	logTool('read', deps.clientIp, false);
	if (res.status === 410) return err('gone', 410, res.body);
	return err('not_found', 404, res.body);
}

// ---- delete -------------------------------------------------------------

export function mcpDelete(
	deps: McpDeps,
	input: { slug: string; delete_token: string }
): McpResult {
	const res = deleteCapsuleByToken(deps.db, input.slug, input.delete_token, deps.nowMs);
	if (res.status === 200) {
		logTool('delete', deps.clientIp, true);
		return ok('deleted');
	}
	logTool('delete', deps.clientIp, false);
	if (res.status === 404) return err('not_found', 404, res.body);
	return err('invalid_token', 403, res.body);
}
