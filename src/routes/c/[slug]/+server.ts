import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { renderCapsuleText } from '$lib/server/handlers';

// Pure text/plain endpoint for agents and humans. Never wrap in HTML.
export const GET: RequestHandler = ({ params }) => {
	const out = renderCapsuleText(getDb(), params.slug, Date.now());
	return new Response(out.body, {
		status: out.status,
		headers: {
			'Content-Type': out.contentType,
			'Cache-Control': 'no-store, no-cache, must-revalidate',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
