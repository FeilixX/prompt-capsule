import { test, expect } from 'bun:test';
import { checkAdminAuth } from './adminAuth';

const TOKEN = 'test-admin-token-0123456789abcdef';

test('empty ADMIN_TOKEN disables the surface no matter what the caller sends', () => {
	expect(checkAdminAuth(null, '')).toBe('disabled');
	expect(checkAdminAuth(`Bearer ${TOKEN}`, '')).toBe('disabled');
});

test('missing / malformed / wrong credentials are unauthorized', () => {
	expect(checkAdminAuth(null, TOKEN)).toBe('unauthorized');
	expect(checkAdminAuth('', TOKEN)).toBe('unauthorized');
	expect(checkAdminAuth(TOKEN, TOKEN)).toBe('unauthorized'); // no Bearer scheme
	expect(checkAdminAuth('Basic dXNlcjpwdw==', TOKEN)).toBe('unauthorized');
	expect(checkAdminAuth('Bearer wrong-token', TOKEN)).toBe('unauthorized');
	// near-miss lengths must not behave differently (digest compare is length-independent)
	expect(checkAdminAuth(`Bearer ${TOKEN}x`, TOKEN)).toBe('unauthorized');
	expect(checkAdminAuth(`Bearer ${TOKEN.slice(0, -1)}`, TOKEN)).toBe('unauthorized');
});

test('correct token passes; auth scheme is case-insensitive (RFC 7235)', () => {
	expect(checkAdminAuth(`Bearer ${TOKEN}`, TOKEN)).toBe('ok');
	expect(checkAdminAuth(`bearer ${TOKEN}`, TOKEN)).toBe('ok');
	expect(checkAdminAuth(`BEARER ${TOKEN}`, TOKEN)).toBe('ok');
});
