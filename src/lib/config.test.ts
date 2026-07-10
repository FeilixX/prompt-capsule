import { test, expect } from 'bun:test';
import { loadConfig, clampTtl } from './config';

test('loadConfig falls back to defaults on empty env', () => {
	const c = loadConfig({});
	expect(c.publicBaseUrl).toBe('https://n78.xyz');
	expect(c.allowedHosts).toEqual(['n78.xyz']);
	expect(c.routePrefix).toBe('/c');
	expect(c.maxContentBytes).toBe(16384);
	expect(c.defaultTtlSeconds).toBe(604800);
	expect(c.maxTtlSeconds).toBe(604800);
	expect(c.slugLength).toBe(8);
	expect(c.dbPath).toBe('./data/capsules.db');
});

test('loadConfig parses overrides from string env', () => {
	const c = loadConfig({
		PUBLIC_BASE_URL: 'https://promptcapsule.dev',
		ALLOWED_HOSTS: 'n78.xyz, promptcapsule.dev',
		MAX_CONTENT_BYTES: '32768',
		SLUG_LENGTH: '10'
	});
	expect(c.publicBaseUrl).toBe('https://promptcapsule.dev');
	expect(c.allowedHosts).toEqual(['n78.xyz', 'promptcapsule.dev']);
	expect(c.maxContentBytes).toBe(32768);
	expect(c.slugLength).toBe(10);
});

test('ADMIN_TOKEN: empty = disabled (legal); short = boot failure; 32+ bytes = armed', () => {
	expect(loadConfig({}).adminToken).toBe('');
	expect(() => loadConfig({ ADMIN_TOKEN: 'weak-token' })).toThrow(/32 bytes/);
	const strong = 'x'.repeat(32);
	expect(loadConfig({ ADMIN_TOKEN: strong }).adminToken).toBe(strong);
});

test('clampTtl uses default when requested is missing or non-positive', () => {
	const c = loadConfig({});
	expect(clampTtl(c, undefined)).toBe(604800);
	expect(clampTtl(c, 0)).toBe(604800);
	expect(clampTtl(c, -5)).toBe(604800);
});

test('clampTtl caps requested at maxTtlSeconds and keeps valid values', () => {
	const c = loadConfig({ MAX_TTL_SECONDS: '604800' });
	expect(clampTtl(c, 3600)).toBe(3600);
	expect(clampTtl(c, 999999999)).toBe(604800);
});

test('loadConfig: moderation defaults (disabled, no key, current model)', () => {
	const m = loadConfig({}).moderation;
	expect(m.enabled).toBe(false);
	expect(m.deepseekApiKey).toBe('');
	expect(m.deepseekBaseUrl).toBe('https://api.deepseek.com');
	expect(m.deepseekModel).toBe('deepseek-v4-flash');
	expect(m.proxyUrl).toBe('');
	expect(m.batchSize).toBe(20);
	expect(m.intervalSec).toBe(60);
	expect(m.maxAttempts).toBe(3);
	expect(m.timeoutSec).toBe(30);
});

test('loadConfig: moderation overrides parse from env', () => {
	const m = loadConfig({
		MODERATION_ENABLED: 'true',
		DEEPSEEK_API_KEY: 'sk-x',
		DEEPSEEK_MODEL: 'deepseek-v4-pro',
		DEEPSEEK_PROXY: 'http://127.0.0.1:12334',
		MODERATION_BATCH_SIZE: '5',
		MODERATION_INTERVAL_SEC: '30',
		MODERATION_MAX_ATTEMPTS: '2',
		MODERATION_TIMEOUT_SEC: '45'
	}).moderation;
	expect(m.enabled).toBe(true);
	expect(m.deepseekApiKey).toBe('sk-x');
	expect(m.deepseekModel).toBe('deepseek-v4-pro');
	expect(m.proxyUrl).toBe('http://127.0.0.1:12334');
	expect(m.batchSize).toBe(5);
	expect(m.intervalSec).toBe(30);
	expect(m.maxAttempts).toBe(2);
	expect(m.timeoutSec).toBe(45);
});

test('loadConfig: MODERATION_ENABLED accepts true/1/yes, else false', () => {
	expect(loadConfig({ MODERATION_ENABLED: '1' }).moderation.enabled).toBe(true);
	expect(loadConfig({ MODERATION_ENABLED: 'yes' }).moderation.enabled).toBe(true);
	expect(loadConfig({ MODERATION_ENABLED: 'TRUE' }).moderation.enabled).toBe(true);
	expect(loadConfig({ MODERATION_ENABLED: 'false' }).moderation.enabled).toBe(false);
	expect(loadConfig({ MODERATION_ENABLED: 'nonsense' }).moderation.enabled).toBe(false);
});

test('loadConfig: moderation numerics reject out-of-range (no hot-loop / no zero-batch footgun)', () => {
	// 0 interval would hot-loop a paid API; -1 batch / 0 attempts are nonsense → fall back to defaults.
	const bad = loadConfig({
		MODERATION_INTERVAL_SEC: '0',
		MODERATION_BATCH_SIZE: '-1',
		MODERATION_MAX_ATTEMPTS: '0',
		MODERATION_TIMEOUT_SEC: '-5'
	}).moderation;
	expect(bad.intervalSec).toBe(60);
	expect(bad.batchSize).toBe(20);
	expect(bad.maxAttempts).toBe(3);
	expect(bad.timeoutSec).toBe(30);
	// over the upper clamp also falls back
	expect(loadConfig({ MODERATION_BATCH_SIZE: '9999' }).moderation.batchSize).toBe(20);
	// non-integer floors into range
	expect(loadConfig({ MODERATION_BATCH_SIZE: '7.9' }).moderation.batchSize).toBe(7);
});
