import { test, expect } from 'bun:test';
import { createTape, readTape, extractCode } from './client.js';

test('createTape posts content and returns urls', async () => {
	const orig = globalThis.fetch;
	globalThis.fetch = (async (url: string, init: any) => {
		const body = JSON.parse(init.body);
		expect(url).toBe('https://n78.xyz/api/capsules');
		expect(body.content).toBe('hi');
		expect(body.source).toBe('api');
		return new Response(
			JSON.stringify({
				view_url: 'https://n78.xyz/view/abc',
				url: 'https://n78.xyz/c/abc',
				delete_token: 't',
				expires_at: 'x',
				agent_text: '打开这个链接，按里面的内容执行：https://n78.xyz/c/abc'
			}),
			{ status: 201 }
		);
	}) as any;
	try {
		const r = await createTape('hi');
		expect(r.view_url).toContain('/view/');
		expect(r.delete_token).toBe('t');
		expect(r.agent_text).toContain('http');
	} finally {
		globalThis.fetch = orig;
	}
});

test('createTape throws on non-201', async () => {
	const orig = globalThis.fetch;
	globalThis.fetch = (async () => new Response('rate limited', { status: 429 })) as any;
	try {
		await expect(createTape('hi')).rejects.toThrow('429');
	} finally {
		globalThis.fetch = orig;
	}
});

test('extractCode: bare code, /c/ URL, /view/ URL, trailing slash', () => {
	expect(extractCode('k3Xf9aQ2')).toBe('k3Xf9aQ2');
	expect(extractCode('  k3Xf9aQ2  ')).toBe('k3Xf9aQ2');
	expect(extractCode('https://n78.xyz/c/k3Xf9aQ2')).toBe('k3Xf9aQ2');
	expect(extractCode('https://n78.xyz/view/k3Xf9aQ2/')).toBe('k3Xf9aQ2');
});

test('extractCode: strips query/fragment on both full URLs and relative paths', () => {
	// the RED/link-paste scenario — full URL with tracking params
	expect(extractCode('https://n78.xyz/c/k3Xf9aQ2?utm=xhs')).toBe('k3Xf9aQ2');
	expect(extractCode('https://n78.xyz/view/k3Xf9aQ2#frag')).toBe('k3Xf9aQ2');
	// relative path carrying query/hash — the case new URL() would NOT cover
	expect(extractCode('/c/k3Xf9aQ2?a=1')).toBe('k3Xf9aQ2');
	expect(extractCode('/view/k3Xf9aQ2#x')).toBe('k3Xf9aQ2');
});

test('readTape GETs /c/{code} and returns {status, body} on 200', async () => {
	const orig = globalThis.fetch;
	globalThis.fetch = (async (url: string) => {
		expect(url).toBe('https://n78.xyz/c/k3Xf9aQ2');
		return new Response('do the thing', { status: 200 });
	}) as any;
	try {
		const r = await readTape('k3Xf9aQ2');
		expect(r.status).toBe(200);
		expect(r.body).toBe('do the thing');
	} finally {
		globalThis.fetch = orig;
	}
});

test('readTape accepts a full URL (with tracking query) and resolves its code', async () => {
	const orig = globalThis.fetch;
	globalThis.fetch = (async (url: string) => {
		expect(url).toBe('https://n78.xyz/c/abc12345'); // query stripped end-to-end
		return new Response('x', { status: 200 });
	}) as any;
	try {
		await readTape('https://n78.xyz/view/abc12345?utm=xhs');
	} finally {
		globalThis.fetch = orig;
	}
});

test('readTape surfaces 410 (gone) and 404 (not found) without throwing', async () => {
	const orig = globalThis.fetch;
	globalThis.fetch = (async () => new Response('410 已过期或已删除 / Gone.', { status: 410 })) as any;
	try {
		const gone = await readTape('expired00');
		expect(gone.status).toBe(410);
	} finally {
		globalThis.fetch = orig;
	}
	globalThis.fetch = (async () => new Response('404 未找到 / Not found.', { status: 404 })) as any;
	try {
		const missing = await readTape('missing00');
		expect(missing.status).toBe(404);
	} finally {
		globalThis.fetch = orig;
	}
});

test('readTape rejects garbage before any request (empty, sentence, single char)', async () => {
	const orig = globalThis.fetch;
	globalThis.fetch = (async () => {
		throw new Error('fetch should never be called for an invalid code');
	}) as any;
	try {
		await expect(readTape('   ')).rejects.toThrow('invalid capsule code');
		await expect(readTape('把这段话翻译成藏语')).rejects.toThrow('invalid capsule code');
		await expect(readTape('/c/')).rejects.toThrow('invalid capsule code'); // -> bare 'c', too short
	} finally {
		globalThis.fetch = orig;
	}
});
