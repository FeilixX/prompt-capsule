<script lang="ts">
	interface CreateResponse {
		slug: string;
		url: string;
		view_url: string;
		expires_at: string;
		delete_token: string;
		share_text: string;
		agent_text: string;
	}

	let content = $state('');
	let title = $state('');
	let ttl = $state(604800);
	let busy = $state(false);
	let errorMsg = $state('');
	let result = $state<CreateResponse | null>(null);
	let copied = $state('');

	// delete flow (uses the just-issued token in hand)
	let confirmingDelete = $state(false);
	let deleting = $state(false);
	let deleted = $state(false);
	let deleteErr = $state('');

	const bytes = $derived(new TextEncoder().encode(content).length);
	const MAX_BYTES = 16384;

	async function create() {
		if (busy || content.trim() === '') return;
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/capsules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content,
					title: title.trim() || null,
					ttl_seconds: ttl,
					source: 'web'
				})
			});
			const data = await res.json();
			if (!res.ok) {
				errorMsg = data.error ?? '生成失败';
			} else {
				result = data as CreateResponse;
			}
		} catch {
			errorMsg = '网络错误';
		} finally {
			busy = false;
		}
	}

	async function copy(text: string, which: string) {
		await navigator.clipboard.writeText(text);
		copied = which;
		setTimeout(() => (copied = ''), 1200);
	}

	async function doDelete() {
		if (!result || deleting) return;
		deleting = true;
		deleteErr = '';
		try {
			const res = await fetch(`/api/capsules/${result.slug}/delete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ delete_token: result.delete_token })
			});
			if (res.ok) {
				deleted = true;
			} else {
				const data = await res.json();
				deleteErr = data.error ?? '删除失败';
			}
		} catch {
			deleteErr = '网络错误';
		} finally {
			deleting = false;
			confirmingDelete = false;
		}
	}

	function reset() {
		result = null;
		content = '';
		title = '';
		deleted = false;
		confirmingDelete = false;
		deleteErr = '';
	}
</script>

<svelte:head>
	<title>提示词胶囊 · Prompt Capsule</title>
</svelte:head>

<main>
	<header>
		<h1>提示词胶囊</h1>
		<p>把长 prompt 压成一个纯文本短链。人能复制,Codex / Claude 能直接读取执行。</p>
	</header>

	{#if !result}
		<label class="field">
			<span>标题(可选)</span>
			<input bind:value={title} placeholder="例如:小红书文案生成器" maxlength="200" />
		</label>

		<label class="field">
			<span>提示词内容</span>
			<textarea bind:value={content} rows="12" placeholder="粘贴你的长 prompt / agent 指令..."></textarea>
		</label>

		<div class="row">
			<label class="ttl">
				<span>有效期</span>
				<select bind:value={ttl}>
					<option value={3600}>1 小时</option>
					<option value={86400}>24 小时</option>
					<option value={604800}>7 天</option>
				</select>
			</label>
			<span class="bytes" class:over={bytes > MAX_BYTES}>{bytes} / {MAX_BYTES} 字节</span>
		</div>

		{#if errorMsg}<p class="error">{errorMsg}</p>{/if}

		<button class="primary" onclick={create} disabled={busy || content.trim() === '' || bytes > MAX_BYTES}>
			{busy ? '生成中...' : '生成胶囊'}
		</button>

		<p class="privacy">胶囊内容会存储在服务端。知道链接的人可以访问。不要存放密码、密钥或私密信息。</p>
	{:else if deleted}
		<div class="result">
			<p class="ok">已删除。这颗胶囊的链接和内容都已失效。</p>
			<button class="primary" onclick={reset}>再做一颗</button>
		</div>
	{:else}
		<div class="result">
			<p class="ok">链接已生成,可直接分享。</p>

			<div class="urlbox">
				<code>{result.url.replace(/^https?:\/\//, '')}</code>
				<button onclick={() => copy(result!.url, 'url')}>{copied === 'url' ? '已复制' : '复制链接'}</button>
			</div>

			<button onclick={() => copy(result!.agent_text, 'agent')}>
				{copied === 'agent' ? '已复制' : '复制「给 Codex / Claude 读取」文案'}
			</button>
			<button onclick={() => copy(result!.share_text, 'share')}>
				{copied === 'share' ? '已复制' : '复制小红书文案'}
			</button>

			<p class="meta">到期 {new Date(result.expires_at).toLocaleString()}</p>

			<details>
				<summary>删除令牌(保存好,用于删除这颗胶囊)</summary>
				<code class="token">{result.delete_token}</code>
			</details>

			<div class="links">
				<a href={result.view_url}>查看页 →</a>
				<button class="ghost" onclick={reset}>再做一颗</button>
			</div>

			{#if confirmingDelete}
				<div class="danger">
					<span>确定删除?不可恢复。</span>
					<button class="del" onclick={doDelete} disabled={deleting}>
						{deleting ? '删除中...' : '确认删除'}
					</button>
					<button class="ghost" onclick={() => (confirmingDelete = false)}>取消</button>
				</div>
			{:else}
				<button class="del-trigger" onclick={() => (confirmingDelete = true)}>删除这颗胶囊</button>
			{/if}
			{#if deleteErr}<p class="error">{deleteErr}</p>{/if}
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 2.5rem 1.25rem;
		font-family: system-ui, sans-serif;
		color: #1a1a1a;
	}
	header h1 {
		margin: 0 0 0.25rem;
		font-size: 1.6rem;
	}
	header p {
		margin: 0 0 1.75rem;
		color: #666;
		font-size: 0.95rem;
		line-height: 1.5;
	}
	.field {
		display: block;
		margin-bottom: 1rem;
	}
	.field span {
		display: block;
		font-size: 0.85rem;
		color: #555;
		margin-bottom: 0.35rem;
	}
	input,
	textarea,
	select {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #d5d5cd;
		border-radius: 8px;
		padding: 0.65rem 0.75rem;
		font-size: 0.95rem;
		font-family: inherit;
	}
	textarea {
		font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
		line-height: 1.5;
		resize: vertical;
	}
	.row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.ttl select {
		width: auto;
	}
	.bytes {
		font-size: 0.8rem;
		color: #999;
	}
	.bytes.over {
		color: #c0392b;
	}
	button {
		border: 1px solid #d0d0c8;
		background: #fff;
		border-radius: 8px;
		padding: 0.6rem 1rem;
		cursor: pointer;
		font-size: 0.9rem;
		margin: 0.25rem 0.25rem 0.25rem 0;
	}
	button:hover:not(:disabled) {
		background: #f0f0ec;
	}
	.primary {
		width: 100%;
		background: #1a1a1a;
		color: #fff;
		border-color: #1a1a1a;
		font-size: 1rem;
		padding: 0.75rem;
		margin: 0.5rem 0;
	}
	.primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.privacy {
		font-size: 0.8rem;
		color: #999;
		line-height: 1.5;
		margin-top: 1rem;
	}
	.error {
		color: #c0392b;
		font-size: 0.9rem;
	}
	.result .ok {
		font-weight: 600;
		margin-bottom: 1rem;
	}
	.urlbox {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		background: #f6f6f4;
		border: 1px solid #e5e5e0;
		border-radius: 8px;
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.75rem;
	}
	.urlbox code {
		flex: 1;
		font-family: ui-monospace, monospace;
		font-size: 0.95rem;
		word-break: break-all;
	}
	.meta {
		color: #888;
		font-size: 0.85rem;
		margin: 0.75rem 0;
	}
	details {
		margin: 0.75rem 0;
		font-size: 0.85rem;
	}
	.token {
		display: block;
		margin-top: 0.4rem;
		font-family: ui-monospace, monospace;
		word-break: break-all;
		color: #555;
	}
	.links {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}
	.links a {
		color: #1a1a1a;
	}
	.ghost {
		background: transparent;
	}
	.del-trigger {
		margin-top: 1rem;
		color: #c0392b;
		border-color: transparent;
		padding-left: 0;
	}
	.del-trigger:hover {
		background: transparent;
		text-decoration: underline;
	}
	.danger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 1rem;
		font-size: 0.9rem;
		color: #c0392b;
	}
	.del {
		background: #c0392b;
		color: #fff;
		border-color: #c0392b;
	}
	.del:hover:not(:disabled) {
		background: #a93226;
	}
</style>
