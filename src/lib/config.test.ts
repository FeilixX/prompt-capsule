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
