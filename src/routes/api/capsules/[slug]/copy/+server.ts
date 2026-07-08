import type { RequestHandler } from './$types';
import { getDb, config } from '$lib/server/db';
import { recordCopy } from '$lib/server/handlers';
import { checkRateLimit } from '$lib/server/rateLimit';
import { isCrossOrigin } from '$lib/server/requestGuard';
import { COPY_RATE } from '$lib/server/limits';

// Fire-and-forget copy telemetry from the /view copy buttons. A bodyless POST slips past
// SvelteKit's form-only CSRF check, so gate cross-origin forgery here, then rate-limit per
// (slug, IP) so no one can inflate a single tape's copy_count. recordCopy bumps only a live
// capsule. The client calls this via fetch(keepalive) so it survives navigation.
export const POST: RequestHandler = ({ params, request, getClientAddress }) => {
	if (isCrossOrigin(request, config.publicBaseUrl)) {
		return new Response(null, { status: 403 });
	}
	const rl = checkRateLimit(`copy:${params.slug}:${getClientAddress()}`, Date.now(), COPY_RATE);
	if (!rl.allowed) return new Response(null, { status: 429 });
	recordCopy(getDb(), params.slug, Date.now());
	return new Response(null, { status: 204 });
};
