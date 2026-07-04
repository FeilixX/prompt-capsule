export interface Config {
	publicBaseUrl: string;
	allowedHosts: string[];
	routePrefix: string;
	maxContentBytes: number;
	defaultTtlSeconds: number;
	maxTtlSeconds: number;
	slugLength: number;
	dbPath: string;
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

/** Build the runtime config from an env bag. Pure — no process.env access, so it is testable. */
export function loadConfig(env: Env): Config {
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
		dbPath: str(env, 'DB_PATH', './data/capsules.db')
	};
}

/** Clamp a requested TTL to [1, maxTtlSeconds]; fall back to the default when absent or non-positive. */
export function clampTtl(config: Config, requestedSeconds?: number): number {
	if (requestedSeconds === undefined || !Number.isFinite(requestedSeconds) || requestedSeconds <= 0) {
		return config.defaultTtlSeconds;
	}
	return Math.min(Math.floor(requestedSeconds), config.maxTtlSeconds);
}
