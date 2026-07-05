<script lang="ts">
	// 接入 & 使用指南:通用 Skill + 远程 MCP。中文主,latin 标签用像素字。
	const MCP_URL = 'https://n78.xyz/mcp';
	const MCP_CONFIG = `{
  "mcpServers": {
    "prompt-tape": { "url": "https://n78.xyz/mcp" }
  }
}`;

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;
	async function copyConfig() {
		try {
			await navigator.clipboard.writeText(MCP_CONFIG);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}

	const tools = [
		{
			name: 'create_prompt_tape',
			args: 'content · title? · ttl_seconds?',
			ret: 'view_url · raw_url · delete_token · expires_at · agent_text'
		},
		{ name: 'read_prompt_tape', args: 'target(slug 或 URL)', ret: '卡带正文' },
		{ name: 'delete_prompt_tape', args: 'slug · delete_token', ret: 'deleted' }
	];
</script>

<svelte:head>
	<title>接入 & 使用 · 提示词卡带</title>
	<meta name="description" content="提示词卡带 Skill + 远程 MCP 的安装与使用:把提示词封成一次性 URL,任何 agent 能直接 fetch。" />
</svelte:head>

<main class="page">
	<header class="head">
		<p class="eyebrow px">USING · 接入指南</p>
		<h1>把提示词<span class="hl">封成卡带</span>,给任何 agent 用</h1>
		<p class="lede">
			提示词卡带 = 把一段提示词 / system prompt / 长指令封成一次性 URL。链接 <code>/c/{'{slug}'}</code>
			以纯文本返回,任何 agent 直接 fetch 就能照着执行;人也能看。有效期最长 7 天,带删除口令。
		</p>
		<div class="chips">
			<span class="px-chip is-teal"><span class="px-dot"></span>MCP · n78.xyz/mcp</span>
			<span class="px-chip is-teal"><span class="px-dot"></span>HTTP API 已上线</span>
			<span class="px-chip is-yellow">开源 · MIT</span>
		</div>
	</header>

	<section>
		<p class="kicker px">01 · 一分钟理解</p>
		<h2>你有一段好东西,封进卡带,给出去。</h2>
		<div class="flow">
			<div class="step px-panel"><b>一段提示词</b><span>你调好的 prompt / 长指令</span></div>
			<span class="arrow px" aria-hidden="true">▶</span>
			<div class="step px-panel"><b>封成卡带</b><span>create_prompt_tape</span></div>
			<span class="arrow px" aria-hidden="true">▶</span>
			<div class="step px-panel"><b>一个链接</b><span class="mono">n78.xyz/c/…</span></div>
		</div>
		<p class="note">
			链接两副面孔:<code>/c/{'{slug}'}</code> 纯文本给 agent fetch,<code>/view/{'{slug}'}</code> 给人看。到期或用删除口令销毁后即失效。
		</p>
	</section>

	<section>
		<p class="kicker px">02 · 三种接入方式</p>
		<h2>按你手上有什么,选一种。</h2>

		<div class="card px-panel">
			<div class="card-head">
				<h3>远程 MCP</h3>
				<span class="px-chip is-teal">推荐 · 零安装</span>
			</div>
			<p>把这个端点加进任何 MCP 客户端(Claude、Cursor 等),填一个 URL 就行。之后直接对 agent 说「把这段封成卡带」,它会调工具、返回链接。</p>
			<div class="code-wrap">
				<button class="copy px" onclick={copyConfig} aria-label="复制配置">{copied ? '已复制 ✓' : 'COPY'}</button>
				<pre><code><span class="c">// Claude / Cursor 的 mcp 配置</span>
{'{'}
  <span class="k">"mcpServers"</span>: {'{'}
    <span class="k">"prompt-tape"</span>: {'{'} <span class="k">"url"</span>: <span class="s">"{MCP_URL}"</span> {'}'}
  {'}'}
{'}'}</code></pre>
			</div>
		</div>

		<div class="card px-panel">
			<div class="card-head">
				<h3>HTTP API</h3>
				<span class="px-chip is-red">已上线</span>
			</div>
			<p>不想接 MCP,直接打接口。一条 <code>POST</code> 建好,返回里 <code>url</code> 给 agent、<code>view_url</code> 给人、<code>agent_text</code> 是现成话术。</p>
			<pre><code><span class="k">curl</span> -X POST https://n78.xyz/api/capsules \
  -H <span class="s">'content-type: application/json'</span> \
  -d <span class="s">'{'{'}"content":"帮我审查当前 repo 并输出诊断","source":"api"{'}'}'</span></code></pre>
		</div>

		<div class="card px-panel">
			<div class="card-head">
				<h3>Skill 包</h3>
				<span class="px-chip is-yellow mono">skills/prompt-tape</span>
			</div>
			<p>
				一个 <code>SKILL.md</code> 教 agent 三层降级:能调 MCP 就调;不能就用自带 <code>client.js</code> 打 HTTP;再不行就引导用户来 n78.xyz 手动封 + 出一段分享文案。装进支持 skill 的 agent 平台即可,源码在
				<a href="https://github.com/FeilixX/prompt-capsule" target="_blank" rel="noopener noreferrer">仓库 skills/prompt-tape/</a>。
			</p>
		</div>
	</section>

	<section>
		<p class="kicker px">03 · 三个工具</p>
		<h2>MCP 端点暴露的动作。</h2>
		<div class="tbl-wrap px-panel">
			<table>
				<thead><tr><th>工具</th><th>参数</th><th>返回</th></tr></thead>
				<tbody>
					{#each tools as tool (tool.name)}
						<tr>
							<td><span class="tool mono">{tool.name}</span></td>
							<td class="mono args">{tool.args}</td>
							<td class="mono ret">{tool.ret}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section>
		<p class="kicker px">04 · 一个完整例子</p>
		<h2>建 → 分享 / 让下游 fetch → 删。</h2>
		<pre class="wide"><code><span class="c">// 1. agent 调 create,返回:</span>
{'{'}
  <span class="k">"view_url"</span>:    <span class="s">"https://n78.xyz/view/okIdDdhU"</span>,  <span class="c">// 给人看</span>
  <span class="k">"raw_url"</span>:     <span class="s">"https://n78.xyz/c/okIdDdhU"</span>,     <span class="c">// 给 agent fetch</span>
  <span class="k">"delete_token"</span>: <span class="s">"…"</span>,                            <span class="c">// 私藏,别公开</span>
  <span class="k">"agent_text"</span>:  <span class="s">"打开这个链接，按里面的内容执行：https://n78.xyz/c/okIdDdhU"</span>
{'}'}

<span class="c">// 2. 下游 agent 直接 fetch raw_url,拿纯文本正文照做</span>
<span class="k">curl</span> https://n78.xyz/c/okIdDdhU

<span class="c">// 3. 不想留了,用口令删</span>
<span class="k">curl</span> -X POST https://n78.xyz/api/capsules/okIdDdhU/delete \
  -d <span class="s">'{'{'}"delete_token":"…"{'}'}'</span></code></pre>
	</section>

	<section>
		<p class="kicker px">05 · 约束</p>
		<h2>几条别踩的线。</h2>
		<ul class="notes">
			<li><b>正文 ≤ 16KB。</b>超了会 <code>413</code>。卡带装提示词,不装文件。</li>
			<li><b>有效期 ≤ 7 天</b>(默认 7 天,可传 <code>ttl_seconds</code> 调短),到期自动失效。</li>
			<li><b>删除口令私藏。</b>别贴进公开分享文案 —— 谁拿到谁能删。</li>
			<li><b>创建限流 10 次/分</b>(每 IP)。正常用够。</li>
			<li><b>公开匿名</b>:没有账户、没有登录。卡带临时、公开、可 fetch。</li>
		</ul>
	</section>

	<div class="cta">
		<a class="px-btn is-teal" href="/">去建一个卡带 <span class="px-sub">TRY IT</span></a>
	</div>
</main>

<style>
	.page {
		max-width: 780px;
		margin: 0 auto;
		padding: clamp(1.6rem, 4vw, 3rem) clamp(1rem, 4vw, 1.6rem) 4rem;
	}

	.head {
		padding-bottom: 1.6rem;
	}
	.eyebrow {
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		color: var(--muted);
		margin: 0 0 0.7rem;
	}
	h1 {
		font-size: clamp(1.9rem, 6vw, 2.9rem);
		line-height: 1.08;
		margin: 0 0 0.7rem;
		text-wrap: balance;
	}
	h1 .hl {
		color: var(--red);
	}
	.lede {
		font-size: 1.05rem;
		color: var(--ink-2);
		margin: 0 0 1.1rem;
		max-width: 62ch;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	section {
		padding: 1.7rem 0;
		border-top: 2.5px solid var(--ink);
		margin-top: 0.6rem;
	}
	.kicker {
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		color: var(--red);
		margin: 0 0 0.3rem;
	}
	h2 {
		font-size: clamp(1.15rem, 3.4vw, 1.5rem);
		margin: 0 0 1.1rem;
		text-wrap: balance;
	}
	h3 {
		font-size: 1.1rem;
		margin: 0;
	}
	p {
		margin: 0 0 0.9rem;
	}
	.note {
		font-size: 0.9rem;
		color: var(--muted);
		margin: 0.9rem 0 0;
	}
	.mono {
		font-family: var(--fm);
	}
	code {
		font-family: var(--fm);
		font-size: 0.86em;
		background: var(--cream-lit);
		border: 2px solid var(--line);
		border-radius: var(--radius-sm);
		padding: 0.05em 0.4em;
		color: var(--ink);
	}
	a {
		color: var(--teal-deep);
		font-weight: 700;
	}

	/* flow */
	.flow {
		display: grid;
		grid-template-columns: 1fr auto 1fr auto 1fr;
		align-items: stretch;
		gap: 0.6rem;
	}
	.flow .step {
		padding: 0.9rem 0.7rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.2rem;
	}
	.flow .step b {
		font-size: 0.98rem;
	}
	.flow .step span {
		font-size: 0.78rem;
		color: var(--muted);
	}
	.flow .arrow {
		align-self: center;
		color: var(--red);
		font-size: 0.9rem;
	}
	@media (max-width: 560px) {
		.flow {
			grid-template-columns: 1fr;
		}
		.flow .arrow {
			transform: rotate(90deg);
			justify-self: center;
		}
	}

	/* cards */
	.card {
		padding: 1.1rem 1.2rem 1.2rem;
		margin: 1rem 0;
	}
	.card-head {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-bottom: 0.5rem;
	}
	.card p {
		font-size: 0.95rem;
		color: var(--ink-2);
	}
	.card p:last-child {
		margin-bottom: 0;
	}

	/* code blocks — dark ink panel, cream text (matches footer world) */
	.code-wrap {
		position: relative;
	}
	pre {
		background: var(--ink);
		color: #efe7d4;
		border: 2.5px solid var(--ink);
		border-radius: var(--radius);
		padding: 0.9rem 1rem;
		overflow-x: auto;
		font-size: 0.82rem;
		line-height: 1.65;
		margin: 0.8rem 0 0;
	}
	pre code {
		background: none;
		border: none;
		padding: 0;
		color: inherit;
		font-size: 1em;
	}
	pre .c {
		color: #9b9075;
	}
	pre .k {
		color: var(--yellow);
	}
	pre .s {
		color: #7fd2ad;
	}
	.copy {
		position: absolute;
		top: 0.8rem;
		right: 0.6rem;
		z-index: 2;
		border: 2px solid #efe7d4;
		border-radius: var(--radius-sm);
		background: transparent;
		color: #efe7d4;
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		padding: 0.24rem 0.5rem;
		cursor: pointer;
	}
	.copy:hover {
		background: rgba(239, 231, 212, 0.14);
	}
	.copy:active {
		transform: translateY(1px);
	}

	/* tools table */
	.tbl-wrap {
		overflow-x: auto;
		padding: 0;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.86rem;
		min-width: 540px;
	}
	th,
	td {
		text-align: left;
		padding: 0.7rem 0.9rem;
		border-bottom: 2px solid var(--line);
		vertical-align: top;
	}
	thead th {
		background: var(--cream-lit);
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}
	tbody tr:last-child td {
		border-bottom: 0;
	}
	td.args,
	td.ret {
		color: var(--ink-2);
		font-size: 0.8rem;
	}
	.tool {
		font-weight: 700;
		color: var(--red);
		font-size: 0.85rem;
	}

	pre.wide {
		font-size: 0.78rem;
	}

	/* notes */
	.notes {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.65rem;
	}
	.notes li {
		position: relative;
		padding-left: 1.3rem;
		font-size: 0.95rem;
		color: var(--ink-2);
	}
	.notes li::before {
		content: '▪';
		position: absolute;
		left: 0.2rem;
		color: var(--red);
	}
	.notes li b {
		color: var(--ink);
	}

	.cta {
		margin-top: 2.2rem;
		text-align: center;
	}
</style>
