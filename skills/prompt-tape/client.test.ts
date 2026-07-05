import { test, expect } from 'bun:test';
import { createTape } from './client.js';

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
