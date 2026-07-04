import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getDb, config } from '$lib/server/db';
import { getCapsuleRaw, getActiveCapsule } from '$lib/server/capsules';

export const load: PageServerLoad = ({ params }) => {
	const db = getDb();
	const raw = getCapsuleRaw(db, params.slug);
	if (!raw) throw error(404, 'capsule not found');

	const active = getActiveCapsule(db, params.slug, Date.now());
	const url = `${config.publicBaseUrl}${config.routePrefix}/${raw.slug}`;
	const display = url.replace(/^https?:\/\//, '');

	return {
		slug: raw.slug,
		title: raw.title,
		content: active ? raw.content : null,
		active: active !== null,
		createdAt: raw.created_at,
		expiresAt: raw.expires_at,
		url,
		display,
		agentText: `打开这个链接，按里面的内容执行：${url}`
	};
};
