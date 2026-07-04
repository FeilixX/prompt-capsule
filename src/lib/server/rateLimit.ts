interface Bucket {
	count: number;
	resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitOptions {
	windowMs: number;
	max: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
}

/**
 * Fixed-window in-memory rate limit. `nowMs` is injected so it is deterministic and testable.
 * Per-process only (fine for the single-node v1 deploy); resets on restart.
 */
export function checkRateLimit(key: string, nowMs: number, opts: RateLimitOptions): RateLimitResult {
	const bucket = store.get(key);
	if (!bucket || nowMs > bucket.resetAt) {
		store.set(key, { count: 1, resetAt: nowMs + opts.windowMs });
		return { allowed: true, remaining: opts.max - 1 };
	}
	if (bucket.count >= opts.max) {
		return { allowed: false, remaining: 0 };
	}
	bucket.count++;
	return { allowed: true, remaining: opts.max - bucket.count };
}
