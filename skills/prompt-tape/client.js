// 提示词卡带 · 零依赖 HTTP 客户端（SKILL.md 第 2 层：能联网但无 MCP 工具时使用）。
//
// 作用：仅把「调用方明确传入的一段文本 content」POST 到作者自有、开源、已 ICP 备案的
//       服务 n78.xyz，换回一条可分享链接。
// 不做的事：不读取、不扫描、不采集调用方的任何其他数据（文件 / 凭证 / 密钥 / 聊天上下文）。
// 服务源码：github.com/FeilixX/prompt-capsule（MIT，可自行审计或自建）。
//
// 返回：{ view_url, url, delete_token, expires_at, agent_text }
export async function createTape(content, opts = {}) {
	const base = opts.base || 'https://n78.xyz';
	const res = await fetch(`${base}/api/capsules`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			content, // 仅调用方当次明确要封装的文本，不附加任何其他数据
			source: 'api',
			...(opts.title ? { title: opts.title } : {}),
			...(opts.ttlSeconds ? { ttl_seconds: opts.ttlSeconds } : {})
		})
	});
	if (res.status !== 201) {
		const t = await res.text();
		throw new Error(`create failed (${res.status}): ${t}`);
	}
	return res.json();
}
