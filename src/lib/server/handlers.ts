import { z } from 'zod';
import { Database } from 'bun:sqlite';
import type { Config } from '../config';
import { clampTtl } from '../config';
import {
	createCapsule,
	getActiveCapsule,
	getCapsuleRaw,
	deleteCapsule,
	bumpViewCount,
	bumpCopyCountIfLive,
	isBlocked,
	type Capsule
} from './capsules';
import { buildTextBody } from './body';
import { resolveTarget, bumpProgramHits } from './programs';

const PLAIN = 'text/plain; charset=utf-8';

// ---- create -------------------------------------------------------------

const createSchema = z.object({
	content: z.string(),
	title: z.string().max(200).nullish(),
	ttl_seconds: z.number().int().positive().optional(),
	source: z.enum(['web', 'cli', 'mcp', 'api']).default('web'),
	has_callback: z.boolean().optional()
});

export interface CreateResponse {
	id: string;
	slug: string;
	url: string;
	view_url: string;
	expires_at: string;
	delete_token: string;
	share_text: string;
	// URL-free 分享串:只含编码。小红书等平台发完整链接易被降权,发裸编码则否。
	// 读者用「读取提示词卡带 {slug}」让装了 prompt-tape skill/MCP 的 AI resolve 并执行。
	code_share_text: string;
	agent_text: string;
}

export type CreateOutcome =
	| { ok: true; response: CreateResponse }
	| { ok: false; status: number; error: string };

export function createCapsuleFromInput(
	db: Database,
	config: Config,
	raw: unknown,
	nowMs: number
): CreateOutcome {
	const parsed = createSchema.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, status: 400, error: 'invalid input' };
	}
	const input = parsed.data;

	if (input.content.trim() === '') {
		return { ok: false, status: 400, error: 'content is empty' };
	}
	if (Buffer.byteLength(input.content, 'utf8') > config.maxContentBytes) {
		return { ok: false, status: 413, error: `content exceeds ${config.maxContentBytes} bytes` };
	}

	const { capsule, deleteToken } = createCapsule(db, {
		content: input.content,
		title: input.title ?? null,
		ttlSeconds: clampTtl(config, input.ttl_seconds),
		source: input.source,
		hasCallback: input.has_callback,
		nowMs,
		slugLength: config.slugLength
	});

	const url = `${config.publicBaseUrl}${config.routePrefix}/${capsule.slug}`;
	const viewUrl = `${config.publicBaseUrl}/view/${capsule.slug}`;
	// display: protocol-stripped for the human-facing share headline (short, non-spammy).
	// agent_text keeps the full URL (scheme included) — a machine consumer needs a directly-fetchable URL.
	const display = url.replace(/^https?:\/\//, '');

	return {
		ok: true,
		response: {
			id: capsule.id,
			slug: capsule.slug,
			url,
			view_url: viewUrl,
			expires_at: capsule.expires_at,
			delete_token: deleteToken,
			share_text: `提示词卡带: ${display}`,
			code_share_text: `提示词卡带编码：${capsule.slug}（让你的 AI 说「读取提示词卡带 ${capsule.slug}」即可取回并执行）`,
			agent_text: `打开这个链接，按里面的内容执行：${url}`
		}
	};
}

// ---- read (text/plain) --------------------------------------------------

export interface TextResult {
	status: 200 | 404 | 410;
	contentType: string;
	body: string;
}

export function renderCapsuleText(db: Database, slug: string, nowMs: number): TextResult {
	const raw = getCapsuleRaw(db, slug);
	if (!raw) {
		return { status: 404, contentType: PLAIN, body: '404 未找到 / Not found.' };
	}
	// A moderation-blocked capsule reads as 404 (never-existed), not 410 (gone) —
	// don't signal to a bad actor that the slug was live and got taken down.
	if (isBlocked(raw)) {
		return { status: 404, contentType: PLAIN, body: '404 未找到 / Not found.' };
	}
	const active = getActiveCapsule(db, slug, nowMs);
	if (!active) {
		return { status: 410, contentType: PLAIN, body: '410 已过期或已删除 / Gone.' };
	}
	bumpViewCount(db, slug);
	return { status: 200, contentType: PLAIN, body: buildTextBody(active, nowMs) };
}

/**
 * Read a tape by target token: a capsule slug (exact, always wins — byte-for-byte
 * legacy behavior) or a program code (case-insensitive, resolved to the current tape).
 *
 * Program-path semantics (see design §5):
 * - blocked current tape → the SAME 404 as a direct hit (a program must never leak
 *   that its tape was taken down);
 * - expired / deleted / dangling → a program-flavored 410 ("off air, next episode
 *   soon") instead of the terminal direct-slug 410 — the program code printed in a
 *   permanent post stays a valid entry point between swaps;
 * - live → normal 200, counting BOTH the tape's view_count and the program's hits
 *   (hits survive renewals; view_count resets with each new tape).
 */
export function renderTape(db: Database, config: Config, target: string, nowMs: number): TextResult {
	const resolved = resolveTarget(db, config, target);
	if (!resolved) {
		return { status: 404, contentType: PLAIN, body: '404 未找到 / Not found.' };
	}
	if (resolved.program === null) {
		return renderCapsuleText(db, resolved.slug, nowMs);
	}
	const raw = getCapsuleRaw(db, resolved.slug);
	if (raw && isBlocked(raw)) {
		return { status: 404, contentType: PLAIN, body: '404 未找到 / Not found.' };
	}
	const active = raw ? getActiveCapsule(db, resolved.slug, nowMs) : null;
	if (!active) {
		return {
			status: 410,
			contentType: PLAIN,
			body: `410 本期已下带,节目码 ${resolved.program} 稍后换新一期 / Off air, new episode soon.`
		};
	}
	bumpViewCount(db, resolved.slug);
	bumpProgramHits(db, resolved.program.toLowerCase());
	return { status: 200, contentType: PLAIN, body: buildTextBody(active, nowMs) };
}

// ---- /view page data ------------------------------------------------------

export type ViewData =
	| {
			kind: 'tape';
			slug: string;
			title: string | null;
			content: string | null;
			active: boolean;
			createdAt: string;
			expiresAt: string;
			url: string;
			display: string;
			agentText: string;
			program: string | null;
	  }
	| { kind: 'program-offair'; program: string };

/**
 * Data for /view/{slug-or-program}. Pure and unit-testable; the route turns null into 404.
 *
 * - Direct slug: byte-for-byte legacy behavior — a dead tape still shows its receipt
 *   (title/dates, content cleared) to whoever holds the slug.
 * - Via program, live tape: share surfaces (url/display/agentText) use the PROGRAM form,
 *   which survives weekly swaps; `slug` stays the resolved capsule slug (copy beacon).
 * - Via program, dead/dangling tape: 'program-offair' carries NOTHING but the program
 *   name — the dead tape's slug/title/dates must not leak to program-code holders.
 * - Blocked reads as null (404) on both paths: never signal a takedown.
 */
export function loadViewData(
	db: Database,
	config: Config,
	target: string,
	nowMs: number
): ViewData | null {
	const resolved = resolveTarget(db, config, target);
	if (!resolved) return null;

	const raw = getCapsuleRaw(db, resolved.slug);

	if (resolved.program !== null) {
		if (raw && isBlocked(raw)) return null;
		const active = raw ? getActiveCapsule(db, resolved.slug, nowMs) : null;
		if (!active) return { kind: 'program-offair', program: resolved.program };
		return tapeViewData(config, active, true, resolved.program, resolved.program);
	}

	if (!raw || isBlocked(raw)) return null;
	const active = getActiveCapsule(db, resolved.slug, nowMs);
	return tapeViewData(config, raw, active !== null, raw.slug, null);
}

function tapeViewData(
	config: Config,
	row: Capsule,
	active: boolean,
	shareId: string,
	program: string | null
): ViewData {
	const url = `${config.publicBaseUrl}${config.routePrefix}/${shareId}`;
	return {
		kind: 'tape',
		slug: row.slug,
		title: row.title,
		content: active ? row.content : null,
		active,
		createdAt: row.created_at,
		expiresAt: row.expires_at,
		url,
		display: url.replace(/^https?:\/\//, ''),
		agentText: `打开这个链接，按里面的内容执行：${url}`,
		program
	};
}

// ---- copy telemetry -----------------------------------------------------

/**
 * Record one reader copy of a capsule (the /view copy buttons). Delegates to an atomic
 * conditional UPDATE so missing / expired / blocked / deleted slugs are ignored — copy_count
 * reflects real copies of readable capsules, and a bot POSTing random slugs can't inflate it.
 * Returns true iff a row was counted.
 */
export function recordCopy(db: Database, slug: string, nowMs: number): boolean {
	return bumpCopyCountIfLive(db, slug, nowMs);
}

// ---- delete -------------------------------------------------------------

export interface DeleteResult {
	status: 200 | 403 | 404;
	body: string;
}

export function deleteCapsuleByToken(
	db: Database,
	slug: string,
	token: string,
	nowMs: number
): DeleteResult {
	if (!getCapsuleRaw(db, slug)) {
		return { status: 404, body: 'not found' };
	}
	if (deleteCapsule(db, slug, token, nowMs)) {
		return { status: 200, body: 'deleted' };
	}
	return { status: 403, body: 'invalid delete token' };
}
