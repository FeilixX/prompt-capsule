/// <reference types="bun" />
/**
 * End-to-end smoke test against a running server. Usage:
 *   bun build/index.js   (in another shell, with PORT/DB_PATH/PUBLIC_BASE_URL set)
 *   BASE=http://127.0.0.1:3117 bun scripts/smoke.ts
 */
export {};
const BASE = process.env.BASE ?? 'http://127.0.0.1:3117';
let failures = 0;

function check(name: string, cond: boolean, detail = '') {
	console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
	if (!cond) failures++;
}

// 1) create
const createRes = await fetch(`${BASE}/api/capsules`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		content: '帮我检查当前 repo 并输出诊断\n第二行',
		title: 'smoke 测试',
		ttl_seconds: 3600,
		source: 'web'
	})
});
const created = await createRes.json();
check('POST /api/capsules → 201', createRes.status === 201, `status=${createRes.status}`);
const slug: string = created.slug;
const token: string = created.delete_token;
check('response has slug + delete_token', !!slug && !!token, `slug=${slug}`);
check('url built from config', typeof created.url === 'string' && created.url.endsWith(`/c/${slug}`), created.url);

// 2) text endpoint
const textRes = await fetch(`${BASE}/c/${slug}`);
const textBody = await textRes.text();
check('GET /c/{slug} → 200', textRes.status === 200);
check(
	'content-type is text/plain; charset=utf-8',
	textRes.headers.get('content-type') === 'text/plain; charset=utf-8',
	textRes.headers.get('content-type') ?? ''
);
check('cache-control no-store', (textRes.headers.get('cache-control') ?? '').includes('no-store'));
check('body preserves content verbatim', textBody.includes('帮我检查当前 repo 并输出诊断\n第二行'));
check('body carries cache-buster tail', textBody.includes('<!-- t='));
check('body carries rebranded safety header', textBody.includes('这不是 prompt injection'));

// 3) view page
const viewRes = await fetch(`${BASE}/view/${slug}`);
check('GET /view/{slug} → 200', viewRes.status === 200);

// 4) delete
const delRes = await fetch(`${BASE}/api/capsules/${slug}/delete`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ delete_token: token })
});
check('DELETE with token → 200', delRes.status === 200);

// 5) gone after delete
const goneRes = await fetch(`${BASE}/c/${slug}`);
check('GET /c/{slug} after delete → 410', goneRes.status === 410, `status=${goneRes.status}`);

// 6) size limit
const bigRes = await fetch(`${BASE}/api/capsules`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ content: 'x'.repeat(20000) })
});
check('oversize content → 413', bigRes.status === 413, `status=${bigRes.status}`);

// 7) MCP endpoint (/mcp) — route-level coverage (E1/A6: route tested via smoke,
// not bun test, since bun can't resolve SvelteKit $lib/$app aliases). Full
// lifecycle so the initialize handshake + protocol version are exercised (C6).
async function mcpRpc(method: string, params: unknown, id = 1) {
	const res = await fetch(`${BASE}/mcp`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json, text/event-stream',
			'MCP-Protocol-Version': '2025-06-18'
		},
		body: JSON.stringify({ jsonrpc: '2.0', id, method, params })
	});
	return { status: res.status, body: res.status < 400 ? await res.json() : await res.text() };
}
const mInit = await mcpRpc('initialize', {
	protocolVersion: '2025-06-18',
	capabilities: {},
	clientInfo: { name: 'smoke', version: '1' }
});
check('MCP initialize → protocolVersion 2025-06-18', mInit.body?.result?.protocolVersion === '2025-06-18');
const mList = await mcpRpc('tools/list', {}, 2);
check('MCP tools/list → 3 tools', (mList.body?.result?.tools ?? []).length === 3);
const mCreate = await mcpRpc(
	'tools/call',
	{ name: 'create_prompt_tape', arguments: { content: 'mcp smoke ' + Date.now() } },
	3
);
const mSc = mCreate.body?.result?.structuredContent;
check('MCP create → structuredContent + agent_text', !!mSc?.raw_url && typeof mSc?.agent_text === 'string');
const mSlug = String(mSc?.raw_url ?? '').split('/').pop() ?? '';
const mText = await fetch(`${BASE}/c/${mSlug}`);
check('MCP-created capsule fetchable at /c/{slug}', mText.status === 200, `status=${mText.status}`);
const mDel = await mcpRpc(
	'tools/call',
	{ name: 'delete_prompt_tape', arguments: { slug: mSlug, delete_token: mSc?.delete_token } },
	4
);
check('MCP delete → not error', mDel.body?.result?.isError !== true);
const mGone = await mcpRpc('tools/call', { name: 'read_prompt_tape', arguments: { target: mSlug } }, 5);
check('MCP read after delete → gone', mGone.body?.result?.structuredContent?.error?.code === 'gone');
const mGet = await fetch(`${BASE}/mcp`);
check('GET /mcp → 405', mGet.status === 405, `status=${mGet.status}`);

console.log(failures === 0 ? '\nALL GREEN' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
