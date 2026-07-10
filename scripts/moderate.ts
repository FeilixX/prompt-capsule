/// <reference types="bun" />
/**
 * Publish-then-review moderation worker (long-lived loop).
 *
 *   bun scripts/moderate.ts
 *
 * Requires MODERATION_ENABLED=true and a non-empty DEEPSEEK_API_KEY (else it exits
 * cleanly as a no-op). Each round: fail-open any capsule that exhausted its retry
 * budget, pull the next pending batch, classify it with one DeepSeek call, write
 * verdicts. Base period MODERATION_INTERVAL_SEC (60s); on a fully-failed round it
 * backs off exponentially to a 600s ceiling and resets on the next success.
 *
 * Deploy under systemd (Type=simple, Restart=always) on the box that holds the DB.
 */
import { getDb, config } from '../src/lib/server/db';
import {
	moderateOnce,
	buildDeepseekRequestBody,
	extractDeepseekContent,
	type DeepseekCaller
} from '../src/lib/server/moderation';

const m = config.moderation;
const BACKOFF_CEIL_SEC = 600;
// Output-token budget scales with batch size. A large all-`block` batch (each verdict carries a
// Chinese `reason`) could otherwise truncate the JSON response mid-array → parseVerdicts returns
// null → the whole batch bumps and eventually fail-opens genuinely-violating content. ~256 tok/
// item over a base, capped so it stays within the model's output ceiling.
const MAX_OUTPUT_TOKENS = Math.min(8192, 512 + m.batchSize * 256);

/** Real DeepSeek caller: OpenAI-compatible /chat/completions in JSON-output mode, with a timeout. */
function makeDeepseekCaller(): DeepseekCaller {
	const url = `${m.deepseekBaseUrl}/chat/completions`;
	return async (system, user) => {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${m.deepseekApiKey}`
			},
			body: JSON.stringify(buildDeepseekRequestBody(system, user, m.deepseekModel, MAX_OUTPUT_TOKENS)),
			// A hung request must not stall the loop; AbortSignal.timeout rejects, we back off.
			signal: AbortSignal.timeout(m.timeoutSec * 1000),
			// bun-only: optional outbound proxy for dev machines; empty proxyUrl => direct connect
			...(m.proxyUrl ? { proxy: m.proxyUrl } : {})
		});
		if (!res.ok) throw new Error(`deepseek HTTP ${res.status}`);
		return extractDeepseekContent(await res.json());
	};
}

async function main() {
	if (!m.enabled) {
		console.log('[moderate] MODERATION_ENABLED is false — worker exiting (no-op).');
		return;
	}
	if (!m.deepseekApiKey) {
		console.log('[moderate] DEEPSEEK_API_KEY is empty — worker exiting (no-op).');
		return;
	}

	const db = getDb();
	const caller = makeDeepseekCaller();
	const base = m.intervalSec;
	let backoff = base;
	console.log(
		`[moderate] up — model=${m.deepseekModel} batch=${m.batchSize} ` +
			`interval=${base}s maxAttempts=${m.maxAttempts} proxy=${m.proxyUrl || 'direct'}`
	);

	for (;;) {
		let batchFailed = false;
		try {
			const r = await moderateOnce(db, config, caller, Date.now());
			// Fail-open is a compliance-relevant event: capsules approved WITHOUT review because
			// DeepSeek was unreachable. Emit it loudly (WARN) so it can be alerted on, not folded
			// silently into the normal round log. Recover later via: WHERE moderation_model='fallback'.
			if (r.autoApproved > 0) {
				console.warn(
					JSON.stringify({
						evt: 'moderate_fail_open',
						autoApproved: r.autoApproved,
						note: 'auto-approved WITHOUT review (DeepSeek unreachable) — investigate',
						ts: Date.now()
					})
				);
			}
			if (r.examined > 0 || r.autoApproved > 0) {
				console.log(JSON.stringify({ evt: 'moderate_round', ...r, ts: Date.now() }));
			}
			// A round that examined capsules but produced no verdict = call/parse failed → back off.
			batchFailed = r.examined > 0 && r.approved === 0 && r.blocked === 0;
		} catch (e) {
			batchFailed = true;
			console.error('[moderate] round error:', e instanceof Error ? e.message : e);
		}
		backoff = batchFailed ? Math.min(backoff * 2, BACKOFF_CEIL_SEC) : base;
		await Bun.sleep(backoff * 1000);
	}
}

main().catch((e) => {
	console.error('[moderate] fatal:', e instanceof Error ? e.message : e);
	process.exit(1);
});
