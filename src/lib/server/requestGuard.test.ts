import { test, expect } from 'bun:test';
import { isCrossOrigin } from './requestGuard';

const SITE = 'https://n78.xyz';
const req = (headers: Record<string, string>) => new Request(`${SITE}/api/x`, { method: 'POST', headers });

test('same-origin fetch is allowed (Sec-Fetch-Site: same-origin + matching Origin)', () => {
	expect(isCrossOrigin(req({ 'sec-fetch-site': 'same-origin', origin: SITE }), SITE)).toBe(false);
});

test('cross-site browser forgery is blocked (Sec-Fetch-Site: cross-site)', () => {
	expect(isCrossOrigin(req({ 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }), SITE)).toBe(true);
});

test('same-site subdomain is treated as another origin', () => {
	expect(isCrossOrigin(req({ 'sec-fetch-site': 'same-site' }), SITE)).toBe(true);
});

test('mismatched Origin alone is blocked (no Sec-Fetch-Site)', () => {
	expect(isCrossOrigin(req({ origin: 'https://evil.example' }), SITE)).toBe(true);
});

test('matching Origin alone is allowed', () => {
	expect(isCrossOrigin(req({ origin: SITE }), SITE)).toBe(false);
});

test('user-initiated (Sec-Fetch-Site: none) is allowed', () => {
	expect(isCrossOrigin(req({ 'sec-fetch-site': 'none' }), SITE)).toBe(false);
});

test('header-less client is allowed (indistinguishable; rate limit bounds it)', () => {
	expect(isCrossOrigin(req({}), SITE)).toBe(false);
});

test('allowedOrigin with a trailing slash still allows same-origin (normalized)', () => {
	expect(isCrossOrigin(req({ origin: SITE }), `${SITE}/`)).toBe(false);
});

test('allowedOrigin with a path still allows same-origin (normalized to origin)', () => {
	expect(isCrossOrigin(req({ origin: SITE }), `${SITE}/base`)).toBe(false);
});
