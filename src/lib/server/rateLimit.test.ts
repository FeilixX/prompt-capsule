import { test, expect } from 'bun:test';
import { checkRateLimit } from './rateLimit';

const T0 = 1_700_000_000_000;

test('allows up to max requests then blocks within the window', () => {
	const opts = { windowMs: 60_000, max: 3 };
	expect(checkRateLimit('a:create', T0, opts).allowed).toBe(true);
	expect(checkRateLimit('a:create', T0 + 1, opts).allowed).toBe(true);
	expect(checkRateLimit('a:create', T0 + 2, opts).allowed).toBe(true);
	const blocked = checkRateLimit('a:create', T0 + 3, opts);
	expect(blocked.allowed).toBe(false);
	expect(blocked.remaining).toBe(0);
});

test('resets after the window elapses', () => {
	const opts = { windowMs: 60_000, max: 2 };
	checkRateLimit('b:create', T0, opts);
	checkRateLimit('b:create', T0, opts);
	expect(checkRateLimit('b:create', T0 + 1, opts).allowed).toBe(false);
	expect(checkRateLimit('b:create', T0 + 60_001, opts).allowed).toBe(true);
});

test('keys are isolated from each other', () => {
	const opts = { windowMs: 60_000, max: 1 };
	expect(checkRateLimit('c1:create', T0, opts).allowed).toBe(true);
	expect(checkRateLimit('c2:create', T0, opts).allowed).toBe(true);
	expect(checkRateLimit('c1:create', T0, opts).allowed).toBe(false);
});
