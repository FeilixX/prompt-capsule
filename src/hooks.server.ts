import type { Handle } from '@sveltejs/kit';
import { getDb, config } from '$lib/server/db';
import { resolveLocale, htmlLang } from '$lib/locale';

// Force config validation + DB/schema init at BOOT, not on the first request:
// adapter-node imports hooks eagerly but route modules lazily, so without this a
// bad ADMIN_TOKEN (too short) or a violated program-name/slugLength invariant
// would pass boot silently and then crash-loop on the first capsule request.
// systemd should see a misconfigured deploy die at startup, loudly.
getDb();

// Resolve the request locale once (cookie > Accept-Language > config default) and
// stamp it on locals + the SSR <html lang>. Per-request only — no shared state.
// transformPageChunk runs solely for HTML document responses, so /c, /mcp and the
// JSON API endpoints (which are +server.ts, not page routes) are never touched here.
// The locale-varying response headers (Content-Language / Vary) are set in the root
// +layout.server.ts, which only runs for page routes — machine endpoints stay unlabeled.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.locale = resolveLocale({
		cookie: event.cookies.get('pt_locale'),
		accept: event.request.headers.get('accept-language'),
		fallback: config.defaultLocale
	});
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%pt.lang%', htmlLang(event.locals.locale))
	});
};
