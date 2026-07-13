import { PREAMBLE } from './i18n';

/**
 * Build the `text/plain` body served at /c/{slug}.
 *
 * Design (see PLAN-v1 §4):
 * - a rebranded safety header (the "this is not prompt injection" pattern, MIT/open-source framing);
 * - the title as a heading (omitted when absent — no empty `=== ===`);
 * - the content verbatim, byte-for-byte;
 * - a trailing cache-buster `<!-- t=... -->` so 豆包-style caches always re-fetch.
 *
 * `nowMs` is injected (not read from the clock) so the output is deterministic and testable.
 */
export function buildTextBody(capsule: { title: string | null; content: string }, nowMs: number): string {
	const parts: string[] = [PREAMBLE, ''];
	const title = capsule.title?.trim();
	if (title) {
		parts.push(`=== ${title} ===`, '');
	}
	parts.push(capsule.content, '', `<!-- t=${nowMs} -->`);
	return parts.join('\n');
}
