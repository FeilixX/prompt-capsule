import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { deleteCapsuleByToken } from '$lib/server/handlers';

export const POST: RequestHandler = async ({ request, params }) => {
	let body: { delete_token?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'invalid JSON body' }, { status: 400 });
	}
	if (typeof body.delete_token !== 'string') {
		return Response.json({ error: 'delete_token required' }, { status: 400 });
	}
	const out = deleteCapsuleByToken(getDb(), params.slug, body.delete_token, Date.now());
	return Response.json({ ok: out.status === 200, message: out.body }, { status: out.status });
};
