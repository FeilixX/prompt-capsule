/**
 * DeepSeek-backed content moderation for the publish-then-review worker.
 * All values are config so the same code runs locally (behind the Mac Hiddify proxy)
 * and on aliyun (direct). `enabled=false` OR an empty apiKey makes the worker a no-op.
 */
export interface ModerationConfig {
	enabled: boolean;
	deepseekApiKey: string;
	deepseekBaseUrl: string;
	deepseekModel: string;
	proxyUrl: string; // '' = direct connect (aliyun); set to Hiddify for Mac-local testing
	batchSize: number;
	intervalSec: number;
	maxAttempts: number; // retries before fail-open: after this many failed rounds a capsule is auto-approved
	timeoutSec: number; // per DeepSeek request timeout — a hung request must not stall the worker
}

export interface Config {
	publicBaseUrl: string;
	allowedHosts: string[];
	routePrefix: string;
	maxContentBytes: number;
	defaultTtlSeconds: number;
	maxTtlSeconds: number;
	slugLength: number;
	dbPath: string;
	/** Bearer token for the operator-only /api/programs* surface. Empty = surface disabled (404). */
	adminToken: string;
	moderation: ModerationConfig;
}

type Env = Record<string, string | undefined>;

function num(env: Env, key: string, fallback: number): number {
	const raw = env[key];
	if (raw === undefined || raw.trim() === '') return fallback;
	const n = Number(raw);
	return Number.isFinite(n) ? n : fallback;
}

function str(env: Env, key: string, fallback: string): string {
	const raw = env[key];
	return raw === undefined || raw.trim() === '' ? fallback : raw.trim();
}

function bool(env: Env, key: string, fallback: boolean): boolean {
	const raw = env[key];
	if (raw === undefined || raw.trim() === '') return fallback;
	const v = raw.trim().toLowerCase();
	return v === 'true' || v === '1' || v === 'yes';
}

/**
 * Positive-integer env var clamped to [min, max]; any out-of-range / non-finite / non-integer
 * value falls back to the default. Guards the moderation worker against footguns: a 0 interval
 * would hot-loop a paid API, a 0 batch would ship nothing, a 0 maxAttempts would auto-approve all.
 */
function intInRange(env: Env, key: string, fallback: number, min: number, max: number): number {
	const raw = num(env, key, fallback);
	const n = Math.floor(raw);
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/**
 * Build the runtime config from an env bag. Pure — no process.env access, so it is testable.
 * Fail-fast validation lives here (config-over-code): a misconfiguration should kill the
 * boot with a clear message, not silently run in a weaker-than-intended state.
 */
export function loadConfig(env: Env): Config {
	const adminToken = str(env, 'ADMIN_TOKEN', '');
	// Non-empty means "admin surface armed" — refuse weak tokens outright rather than
	// letting a guessable one pretend the surface is protected. Empty stays legal (= disabled).
	if (adminToken !== '' && new TextEncoder().encode(adminToken).length < 32) {
		throw new Error(
			'ADMIN_TOKEN is set but shorter than 32 bytes. Use a strong random token ' +
				'(e.g. `openssl rand -base64 32`) or leave it empty to disable the admin surface.'
		);
	}
	return {
		publicBaseUrl: str(env, 'PUBLIC_BASE_URL', 'https://n78.xyz'),
		allowedHosts: str(env, 'ALLOWED_HOSTS', 'n78.xyz')
			.split(',')
			.map((h) => h.trim())
			.filter(Boolean),
		routePrefix: str(env, 'CAPSULE_ROUTE_PREFIX', '/c'),
		maxContentBytes: num(env, 'MAX_CONTENT_BYTES', 16384),
		defaultTtlSeconds: num(env, 'DEFAULT_TTL_SECONDS', 604800),
		maxTtlSeconds: num(env, 'MAX_TTL_SECONDS', 604800),
		slugLength: num(env, 'SLUG_LENGTH', 8),
		dbPath: str(env, 'DB_PATH', './data/capsules.db'),
		adminToken,
		moderation: {
			enabled: bool(env, 'MODERATION_ENABLED', false),
			deepseekApiKey: str(env, 'DEEPSEEK_API_KEY', ''),
			deepseekBaseUrl: str(env, 'DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
			// deepseek-chat/-reasoner are deprecated 2026-07-24; v4-flash is the current fast tier.
			deepseekModel: str(env, 'DEEPSEEK_MODEL', 'deepseek-v4-flash'),
			proxyUrl: str(env, 'DEEPSEEK_PROXY', ''),
			batchSize: intInRange(env, 'MODERATION_BATCH_SIZE', 20, 1, 50),
			intervalSec: intInRange(env, 'MODERATION_INTERVAL_SEC', 60, 1, 86400),
			maxAttempts: intInRange(env, 'MODERATION_MAX_ATTEMPTS', 3, 1, 100),
			timeoutSec: intInRange(env, 'MODERATION_TIMEOUT_SEC', 30, 1, 600)
		}
	};
}

/** Clamp a requested TTL to [1, maxTtlSeconds]; fall back to the default when absent or non-positive. */
export function clampTtl(config: Config, requestedSeconds?: number): number {
	if (requestedSeconds === undefined || !Number.isFinite(requestedSeconds) || requestedSeconds <= 0) {
		return config.defaultTtlSeconds;
	}
	return Math.min(Math.floor(requestedSeconds), config.maxTtlSeconds);
}
