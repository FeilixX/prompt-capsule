import type { RequestHandler } from './$types';
import { getDb, config } from '$lib/server/db';
import { checkAdminAuth } from '$lib/server/adminAuth';
import { listPrograms } from '$lib/server/programs';

// Operator dashboard: every program with its current tape's expiry and lifetime hits.
// Bearer-gated; an empty ADMIN_TOKEN hides the whole surface (404, fail-closed).
export const GET: RequestHandler = ({ request }) => {
	const auth = checkAdminAuth(request.headers.get('authorization'), config.adminToken);
	if (auth === 'disabled') return Response.json({ error: 'not found' }, { status: 404 });
	if (auth === 'unauthorized') return Response.json({ error: 'unauthorized' }, { status: 401 });
	return Response.json({ programs: listPrograms(getDb()) });
};
