/**
 * True when a request is provably cross-origin — a browser drive-by / CSRF forgery.
 *
 * SvelteKit's built-in CSRF check only fires for form content-types; a bodyless POST (our copy
 * beacon) slips past it, so unauthenticated write-ish endpoints must gate themselves. Same-origin
 * fetches from our own pages carry `Sec-Fetch-Site: same-origin` and a matching `Origin`, and a
 * malicious cross-site page cannot forge either (both are browser-controlled, not page-settable).
 *
 * A header-less non-browser client (curl) returns false here — it's indistinguishable from a
 * legacy same-origin request — and is bounded by the caller's rate limit instead. That's an
 * accepted limit for a public, unauthenticated vanity counter: this gate stops the cheap
 * cross-origin browser forgery, not a determined scripted attacker.
 *
 * `allowedOrigin` is the site's own origin (scheme + host [+ port]), e.g. `https://n78.xyz`.
 */
export function isCrossOrigin(request: Request, allowedOrigin: string): boolean {
	const site = request.headers.get('sec-fetch-site');
	// same-origin = our page; none = user-initiated (typed URL / bookmark). Anything else
	// (cross-site / same-site subdomain) is another origin.
	if (site && site !== 'same-origin' && site !== 'none') return true;
	const origin = request.headers.get('origin');
	// Compare against the normalized ORIGIN (scheme+host+port). An Origin header is always
	// origin-only, so a trailing slash or path in PUBLIC_BASE_URL (e.g. `https://n78.xyz/`)
	// would otherwise 403 legit same-origin POSTs — normalize so config drift can't break it.
	if (origin && origin !== normalizeOrigin(allowedOrigin)) return true;
	return false;
}

function normalizeOrigin(value: string): string {
	try {
		return new URL(value).origin;
	} catch {
		return value;
	}
}
