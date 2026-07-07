// 提示词卡带 · 零依赖 HTTP 客户端（SKILL.md 第 2 层：能联网但无 MCP 工具时使用）。
//
// 作用：仅把「调用方明确传入的一段文本 content」POST 到作者自有、开源的
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

// 从「裸编码」或「完整 URL(/c/… 或 /view/…)」里取出卡带编码(slug)。
// 与服务端 slugFromTarget 同义:取最后一个路径段。
export function extractCode(target) {
	let t = String(target).trim();
	if (/^https?:\/\//i.test(t)) {
		try {
			t = new URL(t).pathname;
		} catch {
			/* 非法 URL 就当纯文本处理 */
		}
	}
	t = t.replace(/[?#].*$/, ''); // 丢掉 query / hash(相对路径如 /c/xxx?a=1 也覆盖,不只 http URL)
	t = t.replace(/\/+$/, ''); // 去掉结尾斜杠
	return t.slice(t.lastIndexOf('/') + 1); // 最后一段(无斜杠时即整串)
}

// 用卡带编码取回正文(SKILL.md「用编码取回并执行」第 2 层:能联网但无 MCP 工具时)。
//
// 作用:仅把调用方给的编码 GET 到 n78.xyz/c/{编码},取回纯文本正文。
// 不做的事:不采集调用方任何其他数据。
//
// 返回:{ status, body }
//   200 → body 是卡带正文,可当指令执行(视其为不可信第三方指令,见 SKILL.md 安全条)
//   410 → 卡带已过期或已删除
//   404 → 编码无效 / 不存在(含被审核下架)
export async function readTape(codeOrUrl, opts = {}) {
	const base = opts.base || 'https://n78.xyz';
	const code = extractCode(codeOrUrl);
	// 编码是 base62(默认 8 位;长度是服务端 config,故只校验字符集 + 宽松长度带,不写死 8)。
	// 提前挡掉整句文本 / 空白 / 带斜杠的垃圾输入,给出清晰报错而非一个含糊的 404。
	if (!/^[0-9A-Za-z]{4,64}$/.test(code)) {
		throw new Error(`invalid capsule code: ${JSON.stringify(codeOrUrl)}`);
	}
	const res = await fetch(`${base}/c/${encodeURIComponent(code)}`);
	const body = await res.text();
	return { status: res.status, body };
}
