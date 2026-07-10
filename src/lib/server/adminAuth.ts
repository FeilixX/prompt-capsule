import { createHash, timingSafeEqual } from 'node:crypto';

export type AdminAuth = 'disabled' | 'unauthorized' | 'ok';

/**
 * Bearer-token gate for the operator-only /api/programs* surface.
 *
 * - Empty ADMIN_TOKEN config = the whole surface is DISABLED (routes answer 404,
 *   fail-closed): an unconfigured deploy has no admin face at all.
 * - Comparison runs over sha256 digests with timingSafeEqual — constant time and
 *   length-independent, so neither token length nor prefix matches leak.
 *
 * No isCrossOrigin gate here on purpose: that guard exists for UNauthenticated
 * browser-facing endpoints (the copy beacon); this surface is authenticated and
 * consumed by curl/scripts, where Origin headers prove nothing.
 */
export function checkAdminAuth(authorizationHeader: string | null, adminToken: string): AdminAuth {
	if (adminToken === '') return 'disabled';
	// Auth scheme is case-insensitive per RFC 7235 §2.1 ("bearer" from curl-ish tools is legal).
	const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader ?? '');
	if (!match) return 'unauthorized';
	const provided = createHash('sha256').update(match[1], 'utf8').digest();
	const expected = createHash('sha256').update(adminToken, 'utf8').digest();
	return timingSafeEqual(provided, expected) ? 'ok' : 'unauthorized';
}
