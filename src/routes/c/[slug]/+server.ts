import type { RequestHandler } from './$types';
import { getDb, config } from '$lib/server/db';
import { renderTape } from '$lib/server/handlers';

// Pure text/plain endpoint for agents and humans. Never wrap in HTML.
// The path segment is a capsule slug or a program code (节目码) — renderTape resolves.
export const GET: RequestHandler = ({ params }) => {
	const out = renderTape(getDb(), config, params.slug, Date.now());
	return new Response(out.body, {
		status: out.status,
		headers: {
			'Content-Type': out.contentType,
			'Cache-Control': 'no-store, no-cache, must-revalidate',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
