<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copied = $state('');

	// delete-with-token: only the creator (who kept the token) can delete
	let token = $state('');
	let deleting = $state(false);
	let viewDeleted = $state(false);
	let delErr = $state('');

	async function copy(text: string, which: string) {
		await navigator.clipboard.writeText(text);
		copied = which;
		setTimeout(() => (copied = ''), 1200);
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

<main>
	<a class="home" href="/">← 提示词胶囊</a>

	{#if data.active}
		<h1>{data.title ?? '未命名胶囊'}</h1>
		<p class="meta">到期 {new Date(data.expiresAt).toLocaleString()} · 知道链接的人可访问</p>

		<pre>{data.content}</pre>

		<div class="actions">
			<button onclick={() => copy(data.content ?? '', 'content')}>
				{copied === 'content' ? '已复制' : '复制原文'}
			</button>
			<button onclick={() => copy(data.agentText, 'agent')}>
				{copied === 'agent' ? '已复制' : '复制「给 Codex 读取」'}
			</button>
		</div>

		<p class="raw">纯文本地址(给 agent):<code>{data.display}</code></p>

		<details class="del-box">
			<summary>删除这颗胶囊</summary>
			{#if viewDeleted}
				<p class="done">已删除。刷新后此页将不再可用。</p>
			{:else}
				<p class="hint">粘贴创建时给你的删除令牌:</p>
				<div class="del-row">
					<input bind:value={token} placeholder="delete token" />
					<button class="del" onclick={doDelete} disabled={deleting || token.trim() === ''}>
						{deleting ? '删除中...' : '确认删除'}
					</button>
				</div>
				{#if delErr}<p class="err">{delErr}</p>{/if}
			{/if}
		</details>
	{:else}
		<h1>胶囊已过期或已删除</h1>
		<p class="meta">这颗胶囊不再可用。</p>
	{/if}
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1.25rem;
		font-family: system-ui, sans-serif;
	}
	.home {
		color: #666;
		text-decoration: none;
		font-size: 0.9rem;
	}
	h1 {
		margin: 1rem 0 0.25rem;
		font-size: 1.4rem;
	}
	.meta {
		color: #888;
		font-size: 0.85rem;
		margin: 0 0 1rem;
	}
	pre {
		white-space: pre-wrap;
		word-break: break-word;
		background: #f6f6f4;
		border: 1px solid #e5e5e0;
		border-radius: 8px;
		padding: 1rem;
		font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin: 1rem 0;
	}
	button {
		border: 1px solid #d0d0c8;
		background: #fff;
		border-radius: 6px;
		padding: 0.5rem 0.9rem;
		cursor: pointer;
		font-size: 0.9rem;
	}
	button:hover {
		background: #f0f0ec;
	}
	.raw code {
		font-family: ui-monospace, monospace;
		background: #f0f0ec;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
	}
	.del-box {
		margin-top: 2rem;
		font-size: 0.9rem;
	}
	.del-box summary {
		color: #c0392b;
		cursor: pointer;
	}
	.hint {
		color: #888;
		font-size: 0.85rem;
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
		border: 1px solid #d5d5cd;
		border-radius: 6px;
		padding: 0.5rem 0.6rem;
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
	}
	.del {
		background: #c0392b;
		color: #fff;
		border-color: #c0392b;
	}
	.del:hover:not(:disabled) {
		background: #a93226;
	}
	.del:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.err {
		color: #c0392b;
		font-size: 0.85rem;
		margin-top: 0.4rem;
	}
	.done {
		color: #1a7a3a;
		font-size: 0.9rem;
		margin-top: 0.5rem;
	}
</style>
