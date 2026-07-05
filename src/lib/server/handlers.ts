import { z } from 'zod';
import { Database } from 'bun:sqlite';
import type { Config } from '../config';
import { clampTtl } from '../config';
import {
	createCapsule,
	getActiveCapsule,
	getCapsuleRaw,
	deleteCapsule,
	bumpViewCount
} from './capsules';
import { buildTextBody } from './body';

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
	// display: protocol-stripped for the human-facing 小红书 headline (short, non-spammy).
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
	const active = getActiveCapsule(db, slug, nowMs);
	if (!active) {
		return { status: 410, contentType: PLAIN, body: '410 已过期或已删除 / Gone.' };
	}
	bumpViewCount(db, slug);
	return { status: 200, contentType: PLAIN, body: buildTextBody(active, nowMs) };
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
