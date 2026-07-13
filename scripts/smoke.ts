/// <reference types="bun" />
/**
 * End-to-end smoke test against a running server. Usage:
 *   bun build/index.js   (in another shell, with PORT/DB_PATH/PUBLIC_BASE_URL set)
 *   BASE=http://127.0.0.1:3117 bun scripts/smoke.ts
 */
export {};
const BASE = process.env.BASE ?? 'http://127.0.0.1:3117';
let failures = 0;

// 自测流量必须带 n78-selftest UA:Caddy access log 按它标 traffic=self;
// 本机出口走代理(机房 IP 段),UA 是唯一可靠的自测标记。
const origFetch = globalThis.fetch;
globalThis.fetch = ((input: Parameters<typeof fetch>[0], init: RequestInit = {}) => {
	init.headers = { ...(init.headers ?? {}), 'User-Agent': 'n78-selftest/1.0' };
	return origFetch(input, init);
}) as typeof fetch;

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
check('body carries rebranded safety header', textBody.includes('This is not a prompt injection'));

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

// 8) program codes (节目码) — full lifecycle. Needs the operator token; without it the
// section SKIPs (admin surface is disabled/unreachable), it does not FAIL.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? '';
if (ADMIN_TOKEN === '') {
	console.log('SKIP  program-code section (set ADMIN_TOKEN to exercise /api/programs*)');
} else {
	const auth = { Authorization: `Bearer ${ADMIN_TOKEN}` };
	// unique per run; [A-Za-z0-9]{4,32} and never exactly 8 chars (anti-shadow rule)
	let progName = 'SMK' + Date.now().toString(36).toUpperCase();
	if (progName.length === 8) progName += 'X';

	const pCreate = await fetch(`${BASE}/api/capsules`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content: '节目码 smoke 正文 ' + progName, ttl_seconds: 3600 })
	});
	const pTape = await pCreate.json();
	check('program: setup tape created', pCreate.status === 201, `status=${pCreate.status}`);

	// admin auth three states (empty-token-404 lives in unit tests; a live site has a token)
	const noAuth = await fetch(`${BASE}/api/programs/${progName}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ slug: pTape.slug })
	});
	check('program: PUT without Authorization → 401', noAuth.status === 401, `status=${noAuth.status}`);
	const badAuth = await fetch(`${BASE}/api/programs/${progName}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
		body: JSON.stringify({ slug: pTape.slug })
	});
	check('program: PUT with wrong token → 401', badAuth.status === 401, `status=${badAuth.status}`);

	const put = await fetch(`${BASE}/api/programs/${progName}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', ...auth },
		body: JSON.stringify({ slug: pTape.slug, note: 'smoke run' })
	});
	check('program: PUT with right token → 200', put.status === 200, `status=${put.status}`);

	// resolution via /c — exact, case variant, and body equality modulo the cache-buster
	const stripBuster = (s: string) => s.replace(/<!-- t=\d+ -->/, '');
	const viaProg = await fetch(`${BASE}/c/${progName}`);
	const viaProgBody = await viaProg.text();
	check('program: GET /c/{节目码} → 200', viaProg.status === 200, `status=${viaProg.status}`);
	const viaSlug = await fetch(`${BASE}/c/${pTape.slug}`);
	check(
		'program: body matches /c/{slug} (modulo cache-buster)',
		stripBuster(viaProgBody) === stripBuster(await viaSlug.text())
	);
	const viaLower = await fetch(`${BASE}/c/${progName.toLowerCase()}`);
	check('program: case-insensitive resolve → 200', viaLower.status === 200, `status=${viaLower.status}`);

	// /view via program: 200 and share surfaces carry the PROGRAM form of the URL
	const viewProg = await fetch(`${BASE}/view/${progName}`);
	const viewProgBody = await viewProg.text();
	check('program: GET /view/{节目码} → 200', viewProg.status === 200, `status=${viewProg.status}`);
	check('program: /view shares the program-form URL', viewProgBody.includes(`/c/${progName}`));

	// renew: program resolves to a NEW tape; the old slug keeps living on its own TTL
	const renew = await fetch(`${BASE}/api/programs/${progName}/renew`, {
		method: 'POST',
		headers: auth
	});
	const renewed = await renew.json();
	check('program: POST renew → 200', renew.status === 200, `status=${renew.status}`);
	check('program: renew minted a new slug', !!renewed.slug && renewed.slug !== pTape.slug);
	check('program: renew share text carries the program code', String(renewed.code_share_text ?? '').includes(progName));
	const afterRenew = await fetch(`${BASE}/c/${progName}`);
	check(
		'program: resolves to new tape after renew',
		afterRenew.status === 200 && stripBuster(await afterRenew.text()) === stripBuster(viaProgBody)
	);
	const oldSlug = await fetch(`${BASE}/c/${pTape.slug}`);
	check('program: old slug still 200 on its own TTL', oldSlug.status === 200, `status=${oldSlug.status}`);

	// hits accumulated across the swap
	const list = await fetch(`${BASE}/api/programs`, { headers: auth });
	const listBody = await list.json();
	const entry = (listBody.programs ?? []).find((p: { name: string }) => p.name === progName);
	check('program: GET list → 200 with entry', list.status === 200 && !!entry);
	check('program: hits accumulated (≥3)', (entry?.hits ?? 0) >= 3, `hits=${entry?.hits}`);

	// MCP read via program code
	const mProg = await mcpRpc('tools/call', { name: 'read_prompt_tape', arguments: { target: progName } }, 6);
	check('program: MCP read via 节目码 → not error', mProg.body?.result?.isError !== true);

	// cleanup: delete the program pointer, then both tapes; program then 404s
	const pDel = await fetch(`${BASE}/api/programs/${progName}`, { method: 'DELETE', headers: auth });
	check('program: DELETE → 200', pDel.status === 200, `status=${pDel.status}`);
	const afterDel = await fetch(`${BASE}/c/${progName}`);
	check('program: 404 after pointer deleted', afterDel.status === 404, `status=${afterDel.status}`);
	const oldStill = await fetch(`${BASE}/c/${pTape.slug}`);
	check('program: old slug untouched by pointer delete', oldStill.status === 200, `status=${oldStill.status}`);
	// cleanup: the original tape via its token. The RENEWED tape has no exposed
	// delete_token by design (renew never returns kill credentials) — it is benign
	// self-marked test content and dies on its own TTL.
	await fetch(`${BASE}/api/capsules/${pTape.slug}/delete`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ delete_token: pTape.delete_token })
	});
}

// 9) i18n / locale — SSR locale resolution + audience-scoped headers.
// A page only carries CJK site-chrome in zh; EN chrome must be Chinese-free apart from the
// language-toggle glyph "中". User-submitted tape content is NOT chrome, so we test the
// homepage (fully controlled copy) rather than /view.
const enHome = await fetch(`${BASE}/`, { headers: { 'Accept-Language': 'en' } });
const enHtml = await enHome.text();
check('EN home → <html lang="en">', /<html lang="en"/.test(enHtml));
// strip the toggle glyph, then assert no other CJK remains in EN chrome
const enCjkLeft = enHtml.replace(/中/g, '').match(/[一-鿿]/g);
check('EN home chrome is CJK-free (bar the 中 toggle)', enCjkLeft === null, enCjkLeft ? enCjkLeft.join('') : '');
check('EN page carries Content-Language + Vary', !!enHome.headers.get('content-language') && /Accept-Language/i.test(enHome.headers.get('vary') ?? ''));

const zhHome = await fetch(`${BASE}/`, { headers: { 'Accept-Language': 'zh-CN' } });
const zhHtml = await zhHome.text();
check('ZH home → <html lang="zh-CN">', /<html lang="zh-CN"/.test(zhHtml));

// cookie beats Accept-Language
const cookieWins = await fetch(`${BASE}/`, { headers: { 'Accept-Language': 'en', Cookie: 'pt_locale=zh' } });
check('cookie pt_locale=zh overrides Accept-Language: en', /<html lang="zh-CN"/.test(await cookieWins.text()));

// machine endpoints must NOT carry the locale headers
const cNope = await fetch(`${BASE}/c/nope1234`);
check('/c does not carry Content-Language (machine audience)', cNope.headers.get('content-language') === null);

// human share strings follow explicit lang; default is English
// ttl 1h so these self-marked probes self-expire fast and don't linger on prod.
const enShare = await (await fetch(`${BASE}/api/capsules`, {
	method: 'POST', headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ content: 'x', source: 'api', ttl_seconds: 3600 })
})).json();
check('create default → English code_share_text', String(enShare.code_share_text).includes('read prompt tape'));
const zhShare = await (await fetch(`${BASE}/api/capsules`, {
	method: 'POST', headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ content: 'x', source: 'api', lang: 'zh', ttl_seconds: 3600 })
})).json();
check('create lang:zh → Chinese code_share_text', String(zhShare.code_share_text).includes('读取提示词卡带'));
check('agent_text stays English regardless of lang', String(zhShare.agent_text).includes('Open this link'));

console.log(failures === 0 ? '\nALL GREEN' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
