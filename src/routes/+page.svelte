<script lang="ts">
	import CapsuleCard from '$lib/components/CapsuleCard.svelte';
	import Confetti from '$lib/components/Confetti.svelte';

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

	// seal animation
	let sealing = $state(false);
	let compBytes = $state(0);
	let displayUrl = $state('');
	let sealAnim = $state(false);
	let confettiKey = $state(0);

	// delete flow (uses the just-issued token in hand)
	let confirmingDelete = $state(false);
	let deleting = $state(false);
	let deleted = $state(false);
	let deleteErr = $state('');

	const bytes = $derived(new TextEncoder().encode(content).length);
	const MAX_BYTES = 16384;
	const SLUG_LEN = 8;

	const ttlLabel = $derived(ttl === 3600 ? '1H' : ttl === 86400 ? '24H' : '7D');
	const ttlText = $derived(ttl === 3600 ? '1 小时' : ttl === 86400 ? '1 天' : '7 天');
	const expiresText = $derived(
		result ? new Date(result.expires_at).toLocaleString() : ''
	);

	const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

	function animateCompression(from: number) {
		const start = performance.now();
		const dur = 780;
		compBytes = from;
		function tick(now: number) {
			const t = Math.min(1, (now - start) / dur);
			const eased = 1 - Math.pow(1 - t, 3);
			compBytes = Math.max(SLUG_LEN, Math.round(from - (from - SLUG_LEN) * eased));
			if (t < 1 && sealing) requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}

	function runScramble(slug: string) {
		const prefix = 'n78.xyz/c/';
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
		const steps = 14;
		let step = 0;
		displayUrl = prefix + slug;
		const id = setInterval(() => {
			step++;
			const locked = Math.floor((step / steps) * slug.length);
			let tail = '';
			for (let i = 0; i < slug.length; i++) {
				tail += i < locked ? slug[i] : chars[(Math.random() * chars.length) | 0];
			}
			displayUrl = prefix + tail;
			if (step >= steps) {
				clearInterval(id);
				displayUrl = prefix + slug;
			}
		}, 34);
	}

	async function seal() {
		if (busy || content.trim() === '' || bytes > MAX_BYTES) return;
		busy = true;
		errorMsg = '';
		sealing = true;
		sealAnim = false;
		animateCompression(bytes);
		const started = performance.now();

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
			const elapsed = performance.now() - started;
			if (elapsed < 900) await delay(900 - elapsed);

			if (!res.ok) {
				errorMsg = data.error ?? '生成失败';
				sealing = false;
				return;
			}
			result = data as CreateResponse;
			sealing = false;
			sealAnim = true;
			runScramble(result.slug);
			confettiKey++;
		} catch {
			errorMsg = '网络错误';
			sealing = false;
		} finally {
			busy = false;
		}
	}

	async function copy(text: string, which: string) {
		await navigator.clipboard.writeText(text);
		copied = which;
		setTimeout(() => (copied = ''), 1400);
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
		sealAnim = false;
		displayUrl = '';
	}
</script>

<svelte:head>
	<title>提示词胶囊 · Prompt Capsule</title>
	<meta
		name="description"
		content="把一段长 prompt 封装成一条纯文本命令链接。人能复制，Codex / Claude 打开即读取执行。短期有效。"
	/>
</svelte:head>

<main class="page">
	<section class="intro">
		<h1>把一段长 prompt<br />封装成一条 <span class="hl">命令链接</span>。</h1>
		<p>
			人一键复制，把链接发给 AI，它打开就能读取里面的内容并执行。纯文本、短期有效、拿到就是一颗你自己的胶囊。
		</p>
		<p class="vendors">任何能读链接的 AI 都行：Codex · Claude · 豆包 · Kimi · DeepSeek · 通义…</p>
	</section>

	<div class="bay">
		<!-- LEFT — command input -->
		<section class="panel input-panel">
			<div class="panel-head">
				<span class="ph-title pc-mono">&gt;_ COMMAND INPUT</span>
				<span class="ph-mode pc-mono">TXT MODE <b>■</b></span>
			</div>
			<div class="panel-body">
				<label class="field">
					<span class="flabel pc-mono">标题 · TITLE <i>optional</i></span>
					<input
						bind:value={title}
						placeholder="例如：AI 编程代理、周报生成器…"
						maxlength="200"
						disabled={busy}
					/>
				</label>
				<label class="field grow">
					<span class="flabel pc-mono">提示词内容 · PROMPT</span>
					<textarea
						bind:value={content}
						rows="12"
						placeholder="粘贴你的长提示词 / AI 指令…"
						disabled={busy}
					></textarea>
				</label>
			</div>
			<div class="panel-foot">
				<div class="foot-left">
					<div class="bytes pc-mono" class:over={bytes > MAX_BYTES}>
						<b>{bytes.toLocaleString()}</b> / {MAX_BYTES.toLocaleString()} bytes
					</div>
					<div class="ttl">
						<span class="ttl-lab">有效期</span>
						<div class="seg">
							<button class:on={ttl === 3600} onclick={() => (ttl = 3600)} disabled={busy}>1 小时</button>
							<button class:on={ttl === 86400} onclick={() => (ttl = 86400)} disabled={busy}>1 天</button>
							<button class:on={ttl === 604800} onclick={() => (ttl = 604800)} disabled={busy}>7 天</button>
						</div>
					</div>
				</div>
				<button
					class="seal-btn"
					onclick={seal}
					disabled={busy || content.trim() === '' || bytes > MAX_BYTES}
				>
					{busy ? '封装中…' : '封装胶囊'}
					<span class="chev">»</span>
				</button>
			</div>
			{#if errorMsg}<p class="error pc-mono">! {errorMsg}</p>{/if}
			<p class="expiry-hint"><b>{ttlText}后自动删除</b>：到期链接立即失效、内容清除，不可恢复。</p>
			<p class="privacy">
				内容存储在服务端。知道链接的人都能打开，别放密码、密钥或私密信息。
			</p>
		</section>

		<!-- RIGHT — result / specimen -->
		<section class="panel out-panel">
			<div class="panel-head dark">
				<span class="ph-title pc-mono">
					■ {result && !deleted ? '胶囊已生成' : sealing ? '封装中' : deleted ? '已删除' : '样品 · SPECIMEN'}
				</span>
				<span class="ph-mode pc-mono">{result && !deleted ? 'OBTAINED ✦' : '//////'}</span>
			</div>
			<div class="panel-body out-body">
				{#if sealing}
					<div class="sealing">
						<div class="comp-num pc-mono">{compBytes.toLocaleString()}</div>
						<div class="comp-unit pc-mono">bytes → {SLUG_LEN} chars</div>
						<div class="comp-label pc-mono">COMPRESSING · 封装中</div>
						<div class="comp-bar"><i></i></div>
					</div>
				{:else if deleted}
					<div class="dead-state">
						<p class="ok pc-mono">✔ 已删除。链接与内容都已失效。</p>
						<button class="ghost-btn" onclick={reset}>再做一颗 →</button>
					</div>
				{:else if result}
					<CapsuleCard
						urlText={displayUrl}
						slug={result.slug}
						{ttlLabel}
						{expiresText}
						title={title.trim() || null}
						seal={sealAnim}
					/>

					<div class="out-actions">
						<button class="act primary" onclick={() => copy(result!.agent_text, 'agent')}>
							<span class="ai">›_</span>
							{copied === 'agent' ? '✔ 已复制，粘给 AI 就行' : '复制给 AI 用'}
						</button>
						<button class="act" onclick={() => copy(result!.view_url, 'link')}>
							{copied === 'link' ? '✔ 分享链接已复制' : '复制分享链接（发给别人）'}
						</button>
					</div>

					<div class="out-meta">
						<span><b>有效期至</b> {expiresText}</span>
						<a href={result.view_url}>打开查看页 →</a>
					</div>

					<details class="tokbox">
						<summary>删除口令（想删掉这颗胶囊时用）</summary>
						<p class="tokhint">存好它，只有你能用它删掉这颗胶囊：</p>
						<code class="token pc-mono">{result.delete_token}</code>
					</details>

					<div class="out-foot">
						<button class="ghost-btn" onclick={reset}>再做一颗 →</button>
						{#if confirmingDelete}
							<span class="danger pc-mono">
								确定删除？不可恢复。
								<button class="del" onclick={doDelete} disabled={deleting}>
									{deleting ? '删除中…' : '确认删除'}
								</button>
								<button class="linky" onclick={() => (confirmingDelete = false)}>取消</button>
							</span>
						{:else}
							<button class="del-trigger" onclick={() => (confirmingDelete = true)}>删除这颗胶囊</button>
						{/if}
					</div>
					{#if deleteErr}<p class="error pc-mono">! {deleteErr}</p>{/if}
				{:else}
					<div class="specimen">
						<CapsuleCard
							urlText="n78.xyz/c/a8K2mQp9"
							slug="a8K2mQp9"
							ttlLabel="7D"
						/>
						<p class="specimen-note pc-mono">
							<span class="tag">SPECIMEN</span>
							写完左边点「封装胶囊」，右边这颗会换成<b>你自己的</b>。
						</p>
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>

<Confetti key={confettiKey} />

<style>
	.page {
		width: min(1120px, 100%);
		margin: 0 auto;
		padding: clamp(1.4rem, 4vw, 2.6rem) clamp(1rem, 4vw, 2.2rem) 3rem;
	}

	.intro {
		margin-bottom: 1.6rem;
	}
	.intro h1 {
		margin: 0 0 0.6rem;
		font-size: clamp(1.8rem, 5.4vw, 3rem);
		line-height: 1.06;
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.intro .hl {
		color: var(--red);
		position: relative;
		white-space: nowrap;
	}
	.intro .hl::after {
		content: '';
		position: absolute;
		left: -2px;
		right: -2px;
		bottom: 0.02em;
		height: 0.34em;
		background: rgba(207, 32, 41, 0.16);
		z-index: -1;
	}
	.intro p {
		margin: 0;
		max-width: 44ch;
		color: var(--ink-soft);
		font-size: clamp(0.95rem, 2.4vw, 1.05rem);
	}
	.intro .vendors {
		margin-top: 0.55rem;
		max-width: none;
		font-size: 0.78rem;
		color: var(--muted);
		letter-spacing: 0.01em;
	}

	.bay {
		display: grid;
		grid-template-columns: 1.02fr 0.98fr;
		gap: clamp(1rem, 2.5vw, 1.6rem);
		align-items: start;
	}

	.panel {
		border: 2px solid var(--ink);
		background: var(--paper);
		box-shadow: var(--shadow);
		display: flex;
		flex-direction: column;
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
	.panel-head.dark {
		background: var(--ink);
		color: var(--code-ink);
	}
	.ph-title {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}
	.ph-mode {
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.panel-head.dark .ph-mode {
		color: var(--cyan);
	}
	.ph-mode b {
		color: var(--red);
	}

	.panel-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		flex: 1;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.field.grow {
		flex: 1;
	}
	.flabel {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--ink-soft);
	}
	.flabel i {
		font-style: normal;
		color: var(--muted);
		font-weight: 400;
	}
	input,
	textarea {
		width: 100%;
		border: 2px solid var(--ink);
		border-radius: var(--radius);
		background: var(--paper-2);
		padding: 0.6rem 0.7rem;
		font-size: 0.95rem;
		font-family: inherit;
		color: var(--ink);
	}
	textarea {
		font-family: var(--mono);
		font-size: 0.86rem;
		line-height: 1.55;
		resize: vertical;
		min-height: 220px;
	}
	input:focus,
	textarea:focus {
		outline: none;
		box-shadow: var(--shadow-sm);
		border-color: var(--ink);
	}
	input:disabled,
	textarea:disabled {
		opacity: 0.6;
	}

	.panel-foot {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.85rem 1rem;
		border-top: 2px solid var(--ink);
		background: var(--paper-2);
	}
	.foot-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.bytes {
		font-size: 0.75rem;
		color: var(--muted);
	}
	.bytes b {
		color: var(--ink);
	}
	.bytes.over b,
	.bytes.over {
		color: var(--red);
	}
	.ttl {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.ttl-lab {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--ink-soft);
	}
	.seg {
		display: inline-flex;
		border: 2px solid var(--ink);
		border-radius: var(--radius);
		overflow: hidden;
	}
	.seg button {
		border: none;
		background: var(--paper);
		padding: 0.35rem 0.7rem;
		font-family: var(--sans);
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		color: var(--ink-soft);
		border-right: 2px solid var(--ink);
	}
	.seg button:last-child {
		border-right: none;
	}
	.seg button.on {
		background: var(--red);
		color: #fff;
	}

	.seal-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border: 2px solid var(--red-deep);
		background: var(--red);
		color: #fff;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		padding: 0.7rem 1.3rem;
		border-radius: var(--radius);
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition: transform 0.06s ease, box-shadow 0.06s ease;
	}
	.seal-btn .chev {
		font-family: var(--mono);
	}
	.seal-btn:hover:not(:disabled) {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 var(--ink);
	}
	.seal-btn:active:not(:disabled) {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 var(--ink);
	}
	.seal-btn:disabled {
		opacity: 0.42;
		cursor: not-allowed;
		box-shadow: none;
	}

	.error {
		margin: 0.6rem 1rem 0;
		color: var(--red-deep);
		font-size: 0.82rem;
		font-weight: 700;
	}
	.expiry-hint {
		margin: 0.75rem 1rem 0;
		font-size: 0.76rem;
		color: var(--ink-soft);
		line-height: 1.5;
	}
	.expiry-hint b {
		color: var(--red-deep);
		font-weight: 800;
	}
	.privacy {
		margin: 0.35rem 1rem 1rem;
		font-size: 0.72rem;
		color: var(--muted);
		line-height: 1.5;
	}

	/* ---- output body ---- */
	.out-body {
		gap: 0.9rem;
	}

	.specimen {
		position: relative;
	}
	.specimen :global(.cc) {
		opacity: 0.86;
	}
	.specimen-note {
		margin: 0.9rem 0 0;
		font-size: 0.78rem;
		color: var(--ink-soft);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		line-height: 1.5;
	}
	.specimen-note .tag {
		background: var(--ink);
		color: var(--code-ink);
		padding: 0.15rem 0.45rem;
		font-size: 0.62rem;
		letter-spacing: 0.14em;
	}
	.specimen-note b {
		color: var(--red);
	}

	/* sealing / compression */
	.sealing {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 260px;
		text-align: center;
	}
	.comp-num {
		font-size: clamp(2.4rem, 9vw, 3.6rem);
		font-weight: 900;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		line-height: 1;
		animation: comp-pulse 0.78s ease;
	}
	@keyframes comp-pulse {
		0% {
			transform: scale(1.15);
			color: var(--red);
		}
		100% {
			transform: scale(1);
			color: var(--ink);
		}
	}
	.comp-unit {
		font-size: 0.82rem;
		color: var(--cyan-ink);
		letter-spacing: 0.06em;
	}
	.comp-label {
		margin-top: 0.6rem;
		font-size: 0.72rem;
		letter-spacing: 0.24em;
		color: var(--muted);
	}
	.comp-bar {
		margin-top: 0.5rem;
		width: 180px;
		max-width: 70%;
		height: 6px;
		border: 1.5px solid var(--ink);
		background: var(--paper-2);
		overflow: hidden;
	}
	.comp-bar i {
		display: block;
		height: 100%;
		background: var(--red);
		animation: comp-fill 0.9s ease forwards;
	}
	@keyframes comp-fill {
		from {
			width: 8%;
		}
		to {
			width: 100%;
		}
	}

	/* actions */
	.out-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		color: var(--ink);
	}
	.act:hover {
		background: var(--paper);
		box-shadow: var(--shadow-sm);
	}
	.act.primary {
		background: var(--ink);
		color: var(--code-ink);
	}
	.act.primary:hover {
		background: #000;
	}
	.act .ai {
		font-family: var(--mono);
		color: var(--cyan);
	}

	.out-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.72rem;
		color: var(--muted);
		border-top: 1.5px dashed var(--line);
		padding-top: 0.6rem;
	}
	.out-meta b {
		color: var(--red-deep);
	}
	.out-meta a {
		color: var(--ink);
		font-weight: 700;
	}

	.tokbox {
		border: 1.5px dashed var(--line);
		padding: 0.5rem 0.7rem;
		font-size: 0.8rem;
	}
	.tokbox summary {
		cursor: pointer;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}
	.tokhint {
		margin: 0.5rem 0 0.3rem;
		font-size: 0.72rem;
		color: var(--muted);
	}
	.token {
		display: block;
		word-break: break-all;
		font-size: 0.76rem;
		color: var(--ink);
		background: var(--paper-2);
		border: 1px solid var(--line);
		padding: 0.4rem 0.5rem;
	}

	.out-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.ghost-btn {
		border: 2px solid var(--ink);
		background: transparent;
		border-radius: var(--radius);
		padding: 0.5rem 0.9rem;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
		color: var(--ink);
	}
	.ghost-btn:hover {
		background: var(--paper-2);
	}
	.del-trigger {
		border: none;
		background: none;
		color: var(--muted);
		font-size: 0.78rem;
		cursor: pointer;
		padding: 0.5rem 0;
	}
	.del-trigger:hover {
		color: var(--red);
		text-decoration: underline;
	}
	.danger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.78rem;
		color: var(--red-deep);
	}
	.del {
		border: 2px solid var(--red-deep);
		background: var(--red);
		color: #fff;
		border-radius: var(--radius);
		padding: 0.35rem 0.7rem;
		font-weight: 700;
		cursor: pointer;
	}
	.del:disabled {
		opacity: 0.5;
	}
	.linky {
		border: none;
		background: none;
		color: var(--muted);
		cursor: pointer;
		text-decoration: underline;
	}

	.dead-state {
		min-height: 240px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}
	.dead-state .ok {
		font-weight: 700;
		color: var(--cyan-ink);
	}

	/* ---- responsive ---- */
	@media (max-width: 820px) {
		.bay {
			grid-template-columns: 1fr;
		}
		.out-panel {
			order: -1;
		}
		textarea {
			min-height: 160px;
		}
	}
	@media (max-width: 480px) {
		.panel-foot {
			flex-direction: column;
			align-items: stretch;
		}
		.seal-btn {
			justify-content: center;
		}
	}
</style>
