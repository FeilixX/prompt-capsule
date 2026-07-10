import type { RequestHandler } from './$types';
import { getDb, config } from '$lib/server/db';
import { checkAdminAuth } from '$lib/server/adminAuth';
import { renewProgram } from '$lib/server/programs';
import { checkRateLimit } from '$lib/server/rateLimit';
import { CREATE_RATE } from '$lib/server/limits';

/**
 * Weekly tape swap: mint a new capsule from the current tape's content and repoint
 * the program, in one transaction. Returns ready-to-paste share strings in PROGRAM
 * form — the printed code never changes, so RED-side surfaces are edit-free.
 *
 * Rate limit: CREATE_RATE numbers on a SEPARATE `admin-create:` bucket — renew mints
 * capsules so it must not bypass the create budget, but it must not share a bucket
 * with public creates either (same-NAT public traffic could starve weekly ops, and
 * a runaway renew script could starve real creators).
 */
export const POST: RequestHandler = ({ request, params, getClientAddress }) => {
	const auth = checkAdminAuth(request.headers.get('authorization'), config.adminToken);
	if (auth === 'disabled') return Response.json({ error: 'not found' }, { status: 404 });
	if (auth === 'unauthorized') return Response.json({ error: 'unauthorized' }, { status: 401 });

	const rl = checkRateLimit(`admin-create:${getClientAddress()}`, Date.now(), CREATE_RATE);
	if (!rl.allowed) {
		return Response.json({ error: 'rate limited, slow down' }, { status: 429 });
	}

	const out = renewProgram(getDb(), config, params.name, Date.now());
	if (!out.ok) return Response.json({ error: out.error }, { status: out.status });

	// NB: the new tape's delete_token is deliberately NOT returned (plan §6.2): renewed
	// tapes die on their own TTL, and printing a kill credential to terminals/shell
	// history widens the exposure surface for no operational need.
	const name = out.program.name;
	const programUrl = `${config.publicBaseUrl}${config.routePrefix}/${name}`;
	return Response.json({
		name,
		slug: out.capsule.slug,
		view_url: `${config.publicBaseUrl}/view/${name}`,
		raw_url: programUrl,
		expires_at: out.capsule.expires_at,
		code_share_text: `提示词卡带编码：${name}（让你的 AI 说「读取提示词卡带 ${name}」即可取回并执行）`,
		pinned_comment_text: `口令：${name}（每周换带，口令不变。对装了 skill 的 AI 说「读取提示词卡带 ${name}」即可）`
	});
};
