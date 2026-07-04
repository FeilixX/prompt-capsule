import type { RequestHandler } from './$types';
import { getDb, config } from '$lib/server/db';
import { createCapsuleFromInput } from '$lib/server/handlers';
import { checkRateLimit } from '$lib/server/rateLimit';

// v1 abuse guard: 10 creates per minute per client IP (single-node, in-memory).
const RATE = { windowMs: 60_000, max: 10 };

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const rl = checkRateLimit(`create:${getClientAddress()}`, Date.now(), RATE);
	if (!rl.allowed) {
		return Response.json({ error: 'rate limited, slow down' }, { status: 429 });
	}

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return Response.json({ error: 'invalid JSON body' }, { status: 400 });
	}

	const outcome = createCapsuleFromInput(getDb(), config, raw, Date.now());
	if (!outcome.ok) {
		return Response.json({ error: outcome.error }, { status: outcome.status });
	}
	return Response.json(outcome.response, { status: 201 });
};
