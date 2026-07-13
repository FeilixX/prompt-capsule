// Prompt Tape · zero-dependency HTTP client (SKILL.md layer 2: network access but no MCP tool).
//
// What it does: POST only the caller's explicitly-provided `content` to the author's own,
//   open-source service n78.xyz, and return a shareable link.
// What it never does: read, scan, or collect any other caller data (files / credentials /
//   keys / chat context).
// Source: github.com/FeilixX/prompt-capsule (MIT — audit it or self-host).
//
// Returns: { view_url, url, delete_token, expires_at, agent_text }
export async function createTape(content, opts = {}) {
	const base = opts.base || 'https://n78.xyz';
	const res = await fetch(`${base}/api/capsules`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			content, // only the text the caller explicitly wants sealed — nothing else attached
			source: 'api',
			...(opts.title ? { title: opts.title } : {}),
			...(opts.ttlSeconds ? { ttl_seconds: opts.ttlSeconds } : {})
		})
	});
	if (res.status !== 201) {
		const t = await res.text();
		throw new Error(`create failed (${res.status}): ${t}`);
	}
	return res.json();
}

// Extract the tape code (slug) from a bare code or a full URL (/c/… or /view/…).
// Mirrors the server's slugFromTarget: take the last path segment.
export function extractCode(target) {
	let t = String(target).trim();
	if (/^https?:\/\//i.test(t)) {
		try {
			t = new URL(t).pathname;
		} catch {
			/* not a valid URL — treat as plain text */
		}
	}
	t = t.replace(/[?#].*$/, ''); // drop query / hash (covers relative /c/xxx?a=1, not just http URLs)
	t = t.replace(/\/+$/, ''); // strip trailing slashes
	return t.slice(t.lastIndexOf('/') + 1); // last segment (whole string if no slash)
}

// Retrieve a tape body by code (SKILL.md "retrieve and run by code" layer 2: network, no MCP tool).
//
// What it does: GET only the caller's code from n78.xyz/c/{code}, return the plain-text body.
// What it never does: collect any other caller data.
//
// Returns: { status, body }
//   200 → body is the tape text, runnable as instructions (treat as untrusted third-party — see SKILL.md safety)
//   410 → the tape is expired or deleted
//   404 → the code is invalid / doesn't exist (including taken down)
export async function readTape(codeOrUrl, opts = {}) {
	const base = opts.base || 'https://n78.xyz';
	const code = extractCode(codeOrUrl);
	// The code is base62 (8 chars by default; length is a server config, so validate the charset
	// plus a loose length band rather than hardcoding 8). Reject full sentences / whitespace /
	// slash-laden junk early with a clear error instead of a vague 404.
	if (!/^[0-9A-Za-z]{4,64}$/.test(code)) {
		throw new Error(`invalid capsule code: ${JSON.stringify(codeOrUrl)}`);
	}
	const res = await fetch(`${base}/c/${encodeURIComponent(code)}`);
	const body = await res.text();
	return { status: res.status, body };
}
