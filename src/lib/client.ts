// Client-only helpers: Microsoft Clarity custom events + copy telemetry + a robust
// clipboard copy. Every function is a safe no-op on the server and when Clarity isn't
// active (the layout only installs `window.clarity` in production, never on dev/preview/
// localhost), so callers never need to guard.

type ClarityFn = (...args: unknown[]) => void;

function clarity(): ClarityFn | null {
	if (typeof window === 'undefined') return null;
	const c = (window as Window & { clarity?: ClarityFn }).clarity;
	return typeof c === 'function' ? c : null;
}

/** Fire a Clarity custom event (funnel tag: tape_created / copy_agent / tape_deleted …). */
export function clarityEvent(name: string): void {
	const c = clarity();
	if (!c) return;
	try {
		c('event', name);
	} catch {
		/* telemetry must never break UX */
	}
}

/** Tag the current session with a filterable custom key/value. */
export function claritySet(key: string, value: string): void {
	const c = clarity();
	if (!c) return;
	try {
		c('set', key, value);
	} catch {
		/* ignore */
	}
}

/** Best-effort server increment of copy_count. Fire-and-forget (keepalive so it survives
 *  navigation); never blocks the copy UX and never surfaces an error. */
export function bumpCopyCount(slug: string): void {
	if (typeof fetch === 'undefined' || !slug) return;
	try {
		void fetch(`/api/capsules/${encodeURIComponent(slug)}/copy`, {
			method: 'POST',
			keepalive: true
		}).catch(() => {});
	} catch {
		/* ignore */
	}
}

/** Copy text to the clipboard, with a legacy execCommand fallback. Returns true on success.
 *  navigator.clipboard rejects on insecure contexts / denied permission / an unfocused doc
 *  (common on mobile Safari); the fallback keeps the button from being a silent dead-click. */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		/* fall through to legacy path */
	}
	const prevFocus = document.activeElement as HTMLElement | null;
	const ta = document.createElement('textarea');
	ta.value = text;
	ta.style.position = 'fixed';
	ta.style.top = '-1000px';
	ta.style.opacity = '0';
	document.body.appendChild(ta);
	try {
		ta.focus();
		ta.select();
		return document.execCommand('copy');
	} catch {
		return false;
	} finally {
		// Always tear down, even if execCommand throws, so the offscreen node never leaks;
		// then hand focus back to wherever it was (the copy button).
		ta.remove();
		prevFocus?.focus?.();
	}
}
