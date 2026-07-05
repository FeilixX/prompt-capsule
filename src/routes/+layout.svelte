<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import TapeIcon from '$lib/components/TapeIcon.svelte';
	import { i18n, t, setLocale, initLocale } from '$lib/i18n.svelte';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { env } from '$env/dynamic/public';

	let { children } = $props();
	let showPolicy = $state(false);

	// Microsoft Clarity — anonymous usage stats + heatmaps. Prompt content and the
	// delete token are masked (inputs auto-mask; the non-input prompt/title/token
	// carry data-clarity-mask), so nothing a user types or views is ever uploaded.
	// Public, non-secret project id; override via PUBLIC_CLARITY_ID, empty to disable.
	const CLARITY_ID = env.PUBLIC_CLARITY_ID ?? 'xhnibg6pub';

	$effect(() => {
		initLocale();
	});

	onMount(() => {
		if (dev || !CLARITY_ID) return; // never send localhost sessions to the dashboard
		type ClarityApi = { (...args: unknown[]): void; q?: unknown[] };
		const w = window as Window & { clarity?: ClarityApi };
		if (!w.clarity) {
			const c: ClarityApi = (...args: unknown[]) => {
				(c.q = c.q || []).push(args);
			};
			w.clarity = c;
		}
		const s = document.createElement('script');
		s.async = true;
		s.src = 'https://www.clarity.ms/tag/' + CLARITY_ID;
		const first = document.getElementsByTagName('script')[0];
		first?.parentNode?.insertBefore(s, first);
	});

	function toggleLang() {
		setLocale(i18n.locale === 'zh' ? 'en' : 'zh');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<header class="topbar">
		<a class="brand" href="/">
			<TapeIcon size={34} />
			<span class="wordmark">
				<strong>提示词卡带</strong>
				<em class="px">PROMPT&nbsp;TAPE</em>
			</span>
		</a>

		<div class="top-right">
			<div class="status px">
				<span>TEXT/PLAIN</span><i>·</i><span class="ok"><span class="px-dot"></span>AGENT&nbsp;READY</span>
			</div>
			<button class="lang-btn px" onclick={toggleLang} aria-label="切换语言 / Switch language">
				{t('nav_lang')}
			</button>
			<button
				class="notice-btn"
				aria-expanded={showPolicy}
				onclick={() => (showPolicy = !showPolicy)}
			>
				<span class="warn">!</span>{t('nav_rules')}
			</button>
		</div>
	</header>

	{#if showPolicy}
		<button class="policy-backdrop" aria-label="关闭" onclick={() => (showPolicy = false)}></button>
		<div class="policy-pop px-panel" role="dialog" aria-label={t('policy_title')}>
			<strong>{t('policy_title')}</strong>
			<p>{t('policy_body')}</p>
			<button class="px-btn is-red policy-ok" onclick={() => (showPolicy = false)}>{t('policy_ok')}</button>
		</div>
	{/if}

	<div class="content">
		{@render children()}
	</div>

	<footer class="footbar">
		<div class="foot-brand px">
			<span><span class="rec">●</span> RECORD IT · SHARE IT · LET IT EXPIRE</span>
			<span class="sep">text/plain · n78.xyz</span>
		</div>
		<p class="disclaimer">{t('disclaimer')}</p>
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
		border-bottom: 2.5px solid var(--ink);
		background: rgba(244, 239, 225, 0.92);
		backdrop-filter: blur(8px);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		text-decoration: none;
		color: var(--ink);
	}
	.wordmark {
		display: flex;
		flex-direction: column;
		line-height: 1.02;
	}
	.wordmark strong {
		font-size: 1.16rem;
		font-weight: 800;
		letter-spacing: 0.02em;
	}
	.wordmark em {
		font-style: normal;
		font-size: 0.64rem;
		letter-spacing: 0.16em;
		color: var(--muted);
		margin-top: 2px;
	}

	.top-right {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.66rem;
		letter-spacing: 0.04em;
		color: var(--muted);
	}
	.status i {
		color: var(--line);
		font-style: normal;
	}
	.status .ok {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--teal-deep);
	}

	.notice-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 2px solid var(--ink);
		border-radius: var(--radius-sm);
		background: var(--cream-lit);
		color: var(--ink);
		font-family: var(--fs);
		font-size: 0.74rem;
		font-weight: 700;
		padding: 0.32rem 0.6rem;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 2px 0 var(--ink);
	}
	.notice-btn:hover {
		filter: brightness(1.03);
	}
	.notice-btn:active {
		transform: translateY(2px);
		box-shadow: none;
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

	.lang-btn {
		border: 2px solid var(--ink);
		border-radius: var(--radius-sm);
		background: var(--cream-lit);
		color: var(--ink);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 0.3rem 0.55rem;
		min-width: 34px;
		cursor: pointer;
		box-shadow: 0 2px 0 var(--ink);
	}
	.lang-btn:hover {
		filter: brightness(1.03);
	}
	.lang-btn:active {
		transform: translateY(2px);
		box-shadow: none;
	}

	.policy-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		border: none;
		background: rgba(28, 26, 23, 0.3);
		cursor: default;
	}
	.policy-pop {
		position: fixed;
		top: 3.7rem;
		right: clamp(1rem, 4vw, 2.2rem);
		z-index: 41;
		width: min(360px, calc(100vw - 2rem));
		box-shadow: 0 8px 0 rgba(28, 26, 23, 0.18);
		padding: 1rem 1.1rem 1.1rem;
	}
	.policy-pop strong {
		display: block;
		font-size: 0.98rem;
		font-weight: 800;
		margin-bottom: 0.5rem;
	}
	.policy-pop p {
		margin: 0 0 0.9rem;
		font-size: 0.82rem;
		line-height: 1.7;
		color: var(--ink-2);
	}
	.policy-ok {
		font-size: 0.85rem;
		padding: 0.5rem 1.1rem;
	}

	.content {
		flex: 1;
	}

	.footbar {
		padding: 0.8rem clamp(1rem, 4vw, 2.2rem) 1rem;
		border-top: 2.5px solid var(--ink);
		background: var(--ink);
		color: var(--cream);
	}
	.foot-brand {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.64rem;
		letter-spacing: 0.1em;
	}
	.foot-brand .rec {
		color: var(--red);
	}
	.foot-brand .sep {
		color: var(--teal);
		letter-spacing: 0.06em;
	}
	.disclaimer {
		margin: 0.55rem 0 0;
		max-width: 82ch;
		font-size: 0.64rem;
		line-height: 1.6;
		color: rgba(244, 239, 225, 0.5);
	}

	@media (max-width: 560px) {
		.status {
			display: none;
		}
	}
</style>
