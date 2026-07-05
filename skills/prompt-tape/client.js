// 零依赖。把一段文本封成提示词卡带,返回 { view_url, url, delete_token, expires_at, agent_text }。
// 用于 SKILL.md 第 2 层(能联网但没有 MCP 工具时的 HTTP fallback)。
export async function createTape(content, opts = {}) {
	const base = opts.base || 'https://n78.xyz';
	const res = await fetch(`${base}/api/capsules`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			content,
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
