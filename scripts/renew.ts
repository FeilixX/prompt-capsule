/// <reference types="bun" />
/**
 * 换带 CLI:每周一次的节目续期。用法:
 *   ADMIN_TOKEN=xxx bun scripts/renew.ts CHIBI01
 *   BASE=http://127.0.0.1:3117 ADMIN_TOKEN=xxx bun scripts/renew.ts CHIBI01   (本地)
 *
 * 做的事:调 POST /api/programs/{name}/renew —— 服务端同正文新建卡带(新 slug、新 7 天,
 * 照常进审核队列)并原子重指节目。打印新到期时间 + 可直接粘贴的置顶评论/分享文案。
 * RED 侧零动作:笔记/封面/置顶评论印的都是节目码,换带对读者不可见。
 */
export {};

const BASE = process.env.BASE ?? 'https://n78.xyz';
const TOKEN = process.env.ADMIN_TOKEN ?? '';
const name = process.argv[2];

if (!name) {
	console.error('用法: ADMIN_TOKEN=xxx bun scripts/renew.ts <节目码>');
	process.exit(2);
}
if (!TOKEN) {
	console.error('缺 ADMIN_TOKEN(env)。token 在服务器 .env / 本机 Keychain,不在 repo。');
	process.exit(2);
}

// 运维请求也带自测 UA:别把自己的操作算进外部 UV(Caddy 按它标 traffic=self)。
const res = await fetch(`${BASE}/api/programs/${encodeURIComponent(name)}/renew`, {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${TOKEN}`,
		'User-Agent': 'n78-selftest/1.0'
	}
});

const body = (await res.json()) as Record<string, string>;
if (!res.ok) {
	console.error(`换带失败 (${res.status}): ${body.error ?? JSON.stringify(body)}`);
	process.exit(1);
}

console.log(`✔ 换带完成:${body.name}`);
console.log(`  新卡带 slug : ${body.slug}`);
console.log(`  到期时间    : ${body.expires_at}`);
console.log(`  view_url    : ${body.view_url}`);
console.log('');
console.log('—— 置顶评论文案(如需更新,直接粘贴)——');
console.log(body.pinned_comment_text);
console.log('');
console.log('—— 分享串 ——');
console.log(body.code_share_text);
