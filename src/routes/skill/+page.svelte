<script lang="ts">
	import { t } from '$lib/i18n.svelte';

	// 接入 & 使用指南:通用 Skill + 远程 MCP。i18n via t()。
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

	// $derived so the t() lookups recompute when the locale flips.
	const tools = $derived([
		{
			name: 'create_prompt_tape',
			args: 'content · title? · ttl_seconds?',
			ret: 'view_url · raw_url · code · code_share_text · delete_token · expires_at · agent_text'
		},
		{ name: 'read_prompt_tape', args: t('sk_read_args'), ret: t('sk_read_ret') },
		{ name: 'delete_prompt_tape', args: 'slug · delete_token', ret: 'deleted' }
	]);
</script>

<svelte:head>
	<title>{t('sk_title')}</title>
	<meta name="description" content={t('sk_meta')} />
</svelte:head>

<main class="page">
	<header class="head">
		<p class="eyebrow px">{t('sk_eyebrow')}</p>
		<h1>{t('sk_h1a')}<span class="hl">{t('sk_h1hl')}</span>{t('sk_h1b')}</h1>
		<p class="lede">{t('sk_lede_a')}<code>/c/{'{slug}'}</code>{t('sk_lede_b')}</p>
		<div class="chips">
			<span class="px-chip is-teal"><span class="px-dot"></span>{t('sk_chip_live')}</span>
			<span class="px-chip is-yellow">{t('sk_chip_oss')}</span>
		</div>
	</header>

	<section>
		<p class="kicker px">{t('sk_k1')}</p>
		<h2>{t('sk_h2_1')}</h2>
		<div class="flow">
			<div class="step px-panel"><b>{t('sk_flow1_b')}</b><span>{t('sk_flow1_s')}</span></div>
			<span class="arrow px" aria-hidden="true">▶</span>
			<div class="step px-panel"><b>{t('sk_flow2_b')}</b><span class="mono">create_prompt_tape</span></div>
			<span class="arrow px" aria-hidden="true">▶</span>
			<div class="step px-panel"><b>{t('sk_flow3_b')}</b><span class="mono">n78.xyz/c/…</span></div>
		</div>
		<p class="note">{t('sk_note1')}</p>
	</section>

	<section>
		<p class="kicker px">{t('sk_k2')}</p>
		<h2>{t('sk_h2_2')}</h2>

		<div class="card px-panel">
			<div class="card-head">
				<h3>{t('sk_c1_title')}</h3>
				<span class="px-chip is-teal">{t('sk_c1_chip')}</span>
			</div>
			<p>{t('sk_c1_body')}</p>
			<div class="code-wrap">
				<button class="copy px" onclick={copyConfig} aria-label="copy">{copied ? '✓' : 'COPY'}</button>
				<pre><code><span class="c">{t('sk_c1_comment')}</span>
{'{'}
  <span class="k">"mcpServers"</span>: {'{'}
    <span class="k">"prompt-tape"</span>: {'{'} <span class="k">"url"</span>: <span class="s">"{MCP_URL}"</span> {'}'}
  {'}'}
{'}'}</code></pre>
			</div>
		</div>

		<div class="card px-panel">
			<div class="card-head">
				<h3>{t('sk_c2_title')}</h3>
				<span class="px-chip is-red">{t('sk_c2_chip')}</span>
			</div>
			<p>{t('sk_c2_body')}</p>
			<pre><code><span class="k">curl</span> -X POST https://n78.xyz/api/capsules \
  -H <span class="s">'content-type: application/json'</span> \
  -d <span class="s">'{'{'}"content":"{t('sk_c2_content')}","source":"api"{'}'}'</span></code></pre>
		</div>

		<div class="card px-panel">
			<div class="card-head">
				<h3>{t('sk_c3_title')}</h3>
				<span class="px-chip is-yellow mono">skills/prompt-tape</span>
			</div>
			<p>
				{t('sk_c3_body')}<a href="https://github.com/FeilixX/prompt-capsule" target="_blank" rel="noopener noreferrer">{t('sk_c3_link')}</a>。
			</p>
		</div>
	</section>

	<section>
		<p class="kicker px">{t('sk_k3')}</p>
		<h2>{t('sk_h2_3')}</h2>
		<div class="tbl-wrap px-panel">
			<table>
				<thead><tr><th>{t('sk_th_tool')}</th><th>{t('sk_th_args')}</th><th>{t('sk_th_ret')}</th></tr></thead>
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
		<div class="hl-callout">
			<span class="px-chip is-red">{t('sk_note2_tag')}</span>
			<p class="hl-h">{t('sk_note2_h')}</p>
			<p class="hl-b">{t('sk_note2')}</p>
		</div>
	</section>

	<section>
		<p class="kicker px">{t('sk_k4')}</p>
		<h2>{t('sk_h2_4')}</h2>
		<pre class="wide"><code><span class="c">{t('sk_ex_c1')}</span>
{'{'}
  <span class="k">"view_url"</span>:        <span class="s">"https://n78.xyz/view/okIdDdhU"</span>,  <span class="c">{t('sk_ex_human')}</span>
  <span class="k">"raw_url"</span>:         <span class="s">"https://n78.xyz/c/okIdDdhU"</span>,     <span class="c">{t('sk_ex_agent')}</span>
  <span class="k">"code"</span>:            <span class="s">"okIdDdhU"</span>,                       <span class="c">{t('sk_ex_code')}</span>
  <span class="k">"code_share_text"</span>: <span class="s">"…读取提示词卡带 okIdDdhU…"</span>,        <span class="c">{t('sk_ex_share')}</span>
  <span class="k">"delete_token"</span>:    <span class="s">"…"</span>,                            <span class="c">{t('sk_ex_private')}</span>
  <span class="k">"agent_text"</span>:      <span class="s">"… https://n78.xyz/c/okIdDdhU"</span>
{'}'}

<span class="c">{t('sk_ex_c2')}</span>
<span class="k">curl</span> https://n78.xyz/c/okIdDdhU

<span class="c">{t('sk_ex_c3')}</span>
<span class="k">curl</span> -X POST https://n78.xyz/api/capsules/okIdDdhU/delete \
  -d <span class="s">'{'{'}"delete_token":"…"{'}'}'</span></code></pre>
	</section>

	<section>
		<p class="kicker px">{t('sk_k5')}</p>
		<h2>{t('sk_h2_5')}</h2>
		<ul class="notes">
			<li><b>{t('sk_lim1_b')}</b>{t('sk_lim1')}</li>
			<li><b>{t('sk_lim2_b')}</b>{t('sk_lim2')}</li>
			<li><b>{t('sk_lim3_b')}</b>{t('sk_lim3')}</li>
			<li><b>{t('sk_lim4_b')}</b>{t('sk_lim4')}</li>
			<li><b>{t('sk_lim5_b')}</b>{t('sk_lim5')}</li>
		</ul>
	</section>

	<div class="cta">
		<a class="px-btn is-teal" href="/">{t('sk_cta')} <span class="px-sub">TRY IT</span></a>
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

	/* reverse-flow highlight — the code-sharing / 防降权 hook. Pops off the flat
	   panels via a hard red offset shadow (on-theme for 小红书) + faint red tint. */
	.hl-callout {
		margin: 1.2rem 0 0;
		padding: 1.05rem 1.2rem 1.15rem;
		border: 3px solid var(--ink);
		border-radius: var(--radius);
		background: #fdf2ee;
		box-shadow: 5px 5px 0 var(--red);
	}
	.hl-callout .px-chip {
		margin-bottom: 0.6rem;
	}
	.hl-h {
		font-size: clamp(1.08rem, 3.2vw, 1.32rem);
		font-weight: 800;
		line-height: 1.24;
		color: var(--ink);
		margin: 0 0 0.45rem;
		text-wrap: balance;
	}
	.hl-b {
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--ink-2);
		margin: 0;
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

	/* code blocks — dark ink panel, cream text */
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
