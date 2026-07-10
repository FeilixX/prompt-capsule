import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb, config } from '$lib/server/db';
import { loadViewData } from '$lib/server/handlers';

// Thin shell: the path segment is a capsule slug or a program code; all branch
// semantics (off-air metadata hygiene, blocked-404, program-form share URLs)
// live in loadViewData where they are unit-tested.
export const load: PageServerLoad = ({ params }) => {
	const data = loadViewData(getDb(), config, params.slug, Date.now());
	if (!data) throw error(404, 'capsule not found');
	return data;
};
