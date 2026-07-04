<script lang="ts">
	import type { PageData } from './$types';
	import CapsuleCard from '$lib/components/CapsuleCard.svelte';

	let { data }: { data: PageData } = $props();
	let copied = $state('');

	// delete-with-token: only the creator (who kept the token) can delete
	let token = $state('');
	let deleting = $state(false);
	let viewDeleted = $state(false);
	let delErr = $state('');

	function ttlLabel(expiresAt: string): string {
		const ms = new Date(expiresAt).getTime() - Date.now();
		if (ms <= 0) return '0';
		const h = ms / 3_600_000;
		if (h >= 24) return `${Math.round(h / 24)}D`;
		if (h >= 1) return `${Math.round(h)}H`;
		return `${Math.max(1, Math.round(ms / 60_000))}M`;
	}

	async function copy(text: string, which: string) {
		await navigator.clipboard.writeText(text);
		copied = which;
		setTimeout(() => (copied = ''), 1400);
	}

	async function doDelete() {
		if (deleting || token.trim() === '') return;
		deleting = true;
		delErr = '';
		try {
			const res = await fetch(`/api/capsules/${data.slug}/delete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ delete_token: token.trim() })
			});
			if (res.ok) {
				viewDeleted = true;
			} else {
				const d = await res.json();
				delErr = res.status === 403 ? '删除令牌不正确' : (d.error ?? '删除失败');
			}
		} catch {
			delErr = '网络错误';
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>{data.title ?? '提示词胶囊'} · Prompt Capsule</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="page">
	{#if data.active}
		<div class="grid">
			<div class="hero-col">
				<CapsuleCard
					urlText={data.display}
					slug={data.slug}
					title={data.title}
					ttlLabel={ttlLabel(data.expiresAt)}
					seal={true}
				/>
				<div class="hero-actions">
					<button class="act primary" onclick={() => copy(data.agentText, 'agent')}>
						<span class="ai">›_</span>
						{copied === 'agent' ? '✔ 已复制，粘给 AI 就行' : '复制给 AI 用'}
					</button>
					<button class="act" onclick={() => copy(data.content ?? '', 'content')}>
						{copied === 'content' ? '✔ 原文已复制' : '复制原文'}
					</button>
				</div>
				<p class="raw pc-mono">
					纯文本地址（给 AI 读取）：<code>{data.display}</code>
				</p>
			</div>

			<div class="body-col">
				<div class="panel">
					<div class="panel-head">
						<span class="ph-title pc-mono">■ 原文内容 · PLAIN TEXT</span>
						<span class="ph-mode pc-mono">到期 {new Date(data.expiresAt).toLocaleString()}</span>
					</div>
					<pre class="content pc-mono">{data.content}</pre>
				</div>

				<details class="del-box">
					<summary class="pc-mono">删除这颗胶囊</summary>
					{#if viewDeleted}
						<p class="done pc-mono">✔ 已删除。刷新后此页将不再可用。</p>
					{:else}
						<p class="hint">粘贴创建时给你的删除口令：</p>
						<div class="del-row">
							<input bind:value={token} placeholder="delete token" class="pc-mono" />
							<button class="del" onclick={doDelete} disabled={deleting || token.trim() === ''}>
								{deleting ? '删除中…' : '确认删除'}
							</button>
						</div>
						{#if delErr}<p class="err pc-mono">! {delErr}</p>{/if}
					{/if}
				</details>

				<a class="mk-own" href="/">封一颗自己的胶囊 →</a>
			</div>
		</div>
	{:else}
		<div class="expired">
			<CapsuleCard
				urlText={data.display}
				slug={data.slug}
				title={data.title}
				ttlLabel="0"
				tone="dead"
			/>
			<h1>胶囊已过期或已删除</h1>
			<p>这颗胶囊不再可用。它的内容在到期时被清除，这正是短期封装的意义。</p>
			<a class="mk-own" href="/">封一颗新的 →</a>
		</div>
	{/if}
</main>

<style>
	.page {
		width: min(1080px, 100%);
		margin: 0 auto;
		padding: clamp(1.4rem, 4vw, 2.6rem) clamp(1rem, 4vw, 2.2rem) 3rem;
	}

	.grid {
		display: grid;
		grid-template-columns: 0.92fr 1.08fr;
		gap: clamp(1rem, 2.5vw, 1.6rem);
		align-items: start;
	}

	.hero-col {
		position: sticky;
		top: 5rem;
	}
	.hero-actions {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
		margin-top: 0.9rem;
	}
	.act {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		border: 2px solid var(--ink);
		background: var(--paper-2);
		border-radius: var(--radius);
		padding: 0.6rem 0.8rem;
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
		color: var(--ink);
	}
	.act:hover {
		box-shadow: var(--shadow-sm);
	}
	.act.primary {
		background: var(--ink);
		color: var(--code-ink);
	}
	.act .ai {
		font-family: var(--mono);
		color: var(--cyan);
	}
	.raw {
		margin: 0.8rem 0 0;
		font-size: 0.72rem;
		color: var(--muted);
	}
	.raw code {
		color: var(--ink);
		background: var(--paper-2);
		border: 1px solid var(--line);
		padding: 0.12rem 0.4rem;
		word-break: break-all;
	}

	.panel {
		border: 2px solid var(--ink);
		background: var(--paper);
		box-shadow: var(--shadow);
	}
	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.9rem;
		border-bottom: 2px solid var(--ink);
		background: var(--paper-2);
	}
	.ph-title {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.06em;
	}
	.ph-mode {
		font-size: 0.66rem;
		color: var(--muted);
		letter-spacing: 0.04em;
	}
	.content {
		margin: 0;
		padding: 1rem;
		max-height: 62vh;
		overflow: auto;
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.84rem;
		line-height: 1.6;
		color: var(--ink);
		background: var(--paper);
	}

	.del-box {
		margin-top: 1rem;
		border: 1.5px dashed var(--line);
		padding: 0.6rem 0.8rem;
		font-size: 0.88rem;
	}
	.del-box summary {
		cursor: pointer;
		color: var(--muted);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.04em;
	}
	.del-box summary:hover {
		color: var(--red);
	}
	.hint {
		color: var(--muted);
		font-size: 0.78rem;
		margin: 0.6rem 0 0.4rem;
	}
	.del-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.del-row input {
		flex: 1;
		min-width: 200px;
		border: 2px solid var(--ink);
		border-radius: var(--radius);
		padding: 0.5rem 0.6rem;
		font-size: 0.8rem;
		background: var(--paper-2);
		color: var(--ink);
	}
	.del {
		border: 2px solid var(--red-deep);
		background: var(--red);
		color: #fff;
		border-radius: var(--radius);
		padding: 0.5rem 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}
	.del:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.err {
		color: var(--red-deep);
		font-size: 0.78rem;
		margin-top: 0.4rem;
		font-weight: 700;
	}
	.done {
		color: var(--cyan-ink);
		font-size: 0.85rem;
		margin-top: 0.5rem;
		font-weight: 700;
	}

	.mk-own {
		display: inline-block;
		margin-top: 1.1rem;
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--red);
		text-decoration: none;
	}
	.mk-own:hover {
		text-decoration: underline;
	}

	.expired {
		max-width: 480px;
		margin: 2rem auto;
		text-align: center;
	}
	.expired h1 {
		margin: 1.4rem 0 0.5rem;
		font-size: 1.4rem;
	}
	.expired p {
		color: var(--ink-soft);
		font-size: 0.92rem;
		margin: 0;
	}

	@media (max-width: 820px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.hero-col {
			position: static;
		}
	}
</style>
