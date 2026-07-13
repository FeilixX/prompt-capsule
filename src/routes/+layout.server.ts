import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { htmlLang } from '$lib/locale';

// Root layout load runs for page routes only (not the /c, /mcp, /api +server.ts
// endpoints), so setting the locale-varying response headers here scopes them to
// HTML pages — machine endpoints never get a Content-Language/Vary label.
//
// The ICP filing is resolved SERVER-SIDE and passed through data only when locale=zh.
// Reading it here (private env) instead of $env/dynamic/public keeps the value out of the
// client public-env blob entirely — otherwise a PUBLIC_-prefixed var is serialized into
// every page's HTML regardless of the visual gate, leaking the Chinese filing into EN pages.
// (Deploy: rename the systemd env PUBLIC_ICP_FILING -> ICP_FILING to drop it from the public
// blob; the PUBLIC_ fallback below keeps rendering working during that transition.)
export const load: LayoutServerLoad = ({ locals, setHeaders }) => {
	setHeaders({
		'Content-Language': htmlLang(locals.locale),
		Vary: 'Cookie, Accept-Language'
	});
	const icpFiling = env.ICP_FILING ?? env.PUBLIC_ICP_FILING ?? '';
	return {
		locale: locals.locale,
		icp: locals.locale === 'zh' && icpFiling ? icpFiling : null
	};
};
