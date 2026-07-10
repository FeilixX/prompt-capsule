import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getDb, config } from '$lib/server/db';
import { checkAdminAuth } from '$lib/server/adminAuth';
import { upsertProgram, deleteProgram } from '$lib/server/programs';

const putSchema = z.object({
	slug: z.string(),
	// undefined = keep existing note, string = overwrite, null = clear
	note: z.string().max(500).nullish()
});

function gate(request: Request): Response | null {
	const auth = checkAdminAuth(request.headers.get('authorization'), config.adminToken);
	if (auth === 'disabled') return Response.json({ error: 'not found' }, { status: 404 });
	if (auth === 'unauthorized') return Response.json({ error: 'unauthorized' }, { status: 401 });
	return null;
}

// Create a program or repoint it at another live capsule.
export const PUT: RequestHandler = async ({ request, params }) => {
	const denied = gate(request);
	if (denied) return denied;

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return Response.json({ error: 'invalid JSON body' }, { status: 400 });
	}
	const parsed = putSchema.safeParse(raw);
	if (!parsed.success) return Response.json({ error: 'invalid input' }, { status: 400 });

	const out = upsertProgram(
		getDb(),
		config,
		params.name,
		parsed.data.slug,
		parsed.data.note,
		Date.now()
	);
	if (!out.ok) return Response.json({ error: out.error }, { status: out.status });
	return Response.json(out.program);
};

// Remove the pointer only — the current tape lives out its own TTL untouched.
export const DELETE: RequestHandler = ({ request, params }) => {
	const denied = gate(request);
	if (denied) return denied;
	return deleteProgram(getDb(), params.name)
		? Response.json({ deleted: params.name })
		: Response.json({ error: 'program not found' }, { status: 404 });
};
