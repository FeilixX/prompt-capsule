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

console.log(failures === 0 ? '\nALL GREEN' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
