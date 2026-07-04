<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let showPolicy = $state(false);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<header class="topbar">
		<a class="brand" href="/">
			<svg class="mark" viewBox="0 0 40 40" aria-hidden="true">
				<rect x="2" y="2" width="36" height="36" rx="7" fill="#14110f" />
				<rect x="6.5" y="17" width="27" height="13" rx="6.5" fill="#fbf6ec" />
				<path d="M6.5 23.5h13.5v6.5A6.5 6.5 0 0 1 6.5 23.5z" fill="#cf2029" />
				<circle cx="27" cy="10.5" r="3" fill="#cf2029" />
			</svg>
			<span class="wordmark">
				<strong>提示词胶囊</strong>
				<em>Prompt&nbsp;Capsule</em>
			</span>
		</a>

		<div class="top-right">
			<div class="status pc-mono">
				<span>PC-7D</span><i>·</i><span>TEXT/PLAIN</span><i>·</i><span class="ok"
					><span class="pc-dot"></span>AGENT&nbsp;READY</span
				>
			</div>
			<button
				class="notice-btn"
				aria-expanded={showPolicy}
				onclick={() => (showPolicy = !showPolicy)}
			>
				<span class="warn">!</span>内容须知
			</button>
		</div>
	</header>

	{#if showPolicy}
		<button class="policy-backdrop" aria-label="关闭" onclick={() => (showPolicy = false)}></button>
		<div class="policy-pop" role="dialog" aria-label="内容须知">
			<strong>内容须知</strong>
			<p>
				请勿创建或传播违法、侵权、色情、暴力、赌博、诈骗、仇恨或危害他人安全的内容。违规胶囊一经发现即删除，情节严重的将上报相关部门。你需为自己封装与分享的内容承担全部责任。
			</p>
			<button class="policy-ok" onclick={() => (showPolicy = false)}>知道了</button>
		</div>
	{/if}

	<div class="content">
		{@render children()}
	</div>

	<footer class="footbar">
		<div class="foot-brand pc-mono">
			<span>ALL SEALED. ALL YOURS.</span>
			<span class="sep">text/plain · n78.xyz</span>
		</div>
		<p class="disclaimer">
			免责声明：胶囊内容由用户自行创建与分享，与本站立场无关；本服务为临时存储，可能随时失效或删除，不保证可用性。请勿存放密码、密钥、隐私或违法信息，因使用产生的风险与损失由用户自行承担。
		</p>
	</footer>
</div>

<style>
	.shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.7rem clamp(1rem, 4vw, 2.2rem);
		border-bottom: 2px solid var(--ink);
		background: rgba(242, 237, 226, 0.9);
		backdrop-filter: blur(8px);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		color: var(--ink);
	}

	.mark {
		width: 34px;
		height: 34px;
		flex: none;
		display: block;
	}

	.wordmark {
		display: flex;
		flex-direction: column;
		line-height: 1.05;
	}

	.wordmark strong {
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: 0.01em;
	}

	.wordmark em {
		font-family: var(--mono);
		font-style: normal;
		font-size: 0.66rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: var(--ink-soft);
	}

	.status i {
		color: var(--line);
		font-style: normal;
	}

	.status .ok {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--cyan-ink);
	}

	.top-right {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.notice-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1.5px solid var(--ink);
		background: var(--paper-2);
		color: var(--ink);
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.3rem 0.6rem;
		border-radius: var(--radius);
		cursor: pointer;
		white-space: nowrap;
	}
	.notice-btn:hover {
		box-shadow: var(--shadow-sm);
	}
	.notice-btn .warn {
		display: inline-grid;
		place-items: center;
		width: 15px;
		height: 15px;
		background: var(--red);
		color: #fff;
		border-radius: 50%;
		font-size: 0.66rem;
		font-weight: 900;
		line-height: 1;
	}

	.policy-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		border: none;
		background: rgba(20, 17, 15, 0.28);
		cursor: default;
	}
	.policy-pop {
		position: fixed;
		top: 3.6rem;
		right: clamp(1rem, 4vw, 2.2rem);
		z-index: 41;
		width: min(360px, calc(100vw - 2rem));
		border: 2px solid var(--ink);
		background: var(--paper);
		box-shadow: var(--shadow);
		padding: 1rem 1.1rem 1.1rem;
	}
	.policy-pop strong {
		display: block;
		font-size: 0.95rem;
		font-weight: 800;
		margin-bottom: 0.5rem;
	}
	.policy-pop p {
		margin: 0 0 0.9rem;
		font-size: 0.8rem;
		line-height: 1.65;
		color: var(--ink-soft);
	}
	.policy-ok {
		border: 2px solid var(--ink);
		background: var(--ink);
		color: var(--code-ink);
		font-weight: 700;
		font-size: 0.82rem;
		padding: 0.45rem 1rem;
		border-radius: var(--radius);
		cursor: pointer;
	}

	.content {
		flex: 1;
	}

	.footbar {
		padding: 0.75rem clamp(1rem, 4vw, 2.2rem) 0.9rem;
		border-top: 2px solid var(--ink);
		background: var(--ink);
		color: var(--code-ink);
	}

	.foot-brand {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.66rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.foot-brand .sep {
		color: var(--cyan);
		text-transform: none;
		letter-spacing: 0.06em;
	}

	.disclaimer {
		margin: 0.55rem 0 0;
		max-width: 82ch;
		font-size: 0.64rem;
		line-height: 1.55;
		letter-spacing: 0.01em;
		color: rgba(242, 232, 214, 0.5);
	}

	@media (max-width: 560px) {
		.status {
			display: none;
		}
		.wordmark em {
			display: none;
		}
	}
</style>
