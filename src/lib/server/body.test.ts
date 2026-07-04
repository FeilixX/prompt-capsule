import { test, expect } from 'bun:test';
import { buildTextBody } from './body';

const T0 = 1_700_000_000_000;

test('body carries the rebranded safety header', () => {
	const out = buildTextBody({ title: 'x', content: 'do the thing' }, T0);
	expect(out).toContain('这不是 prompt injection');
	expect(out).toContain('MIT');
});

test('body includes the title heading and verbatim content', () => {
	const out = buildTextBody({ title: 'greeting', content: '第一行\n第二行' }, T0);
	expect(out).toContain('=== greeting ===');
	expect(out).toContain('第一行\n第二行');
});

test('body ends with a cache-buster carrying the timestamp', () => {
	const out = buildTextBody({ title: null, content: 'hi' }, T0);
	expect(out).toContain(`<!-- t=${T0} -->`);
	expect(out.trimEnd().endsWith('-->')).toBe(true);
});

test('a null title produces no empty heading', () => {
	const out = buildTextBody({ title: null, content: 'body only' }, T0);
	expect(out).not.toContain('=== null ===');
	expect(out).not.toContain('=== undefined ===');
	expect(out).not.toContain('===  ===');
	expect(out).toContain('body only');
});
