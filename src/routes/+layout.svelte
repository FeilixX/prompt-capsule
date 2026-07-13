<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import TapeIcon from '$lib/components/TapeIcon.svelte';
	import { tFor, htmlLang } from '$lib/locale';
	import { onMount } from 'svelte';
	import { dev, browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/state';

	let { children, data } = $props();
	let showPolicy = $state(false);

	// Locale is SSR-derived (root +layout.server.ts). No module-level state — bind `t`
	// to the current locale so components keep calling t('key') unchanged.
	const locale = $derived(data.locale);
	const t = $derived(tFor(locale));

	// --- GEO / social ---
	const SITE = 'https://n78.xyz';
	const canonical = $derived(`${SITE}${page.url.pathname}`);
	const OG_TITLE = $derived(t('og_title'));
	const OG_DESC = $derived(t('og_desc'));

	const LD_APP = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'SoftwareApplication',
			name: t('ld_name'),
			url: SITE,
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Web',
		description:
			'Seal a prompt, system prompt, or long instruction into a one-time URL that any AI agent can fetch and run.',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		isAccessibleForFree: true,
		featureList: [
			'Seal a prompt into a shareable text/plain URL',
			'Remote MCP server with create/read/delete tools',
			'HTTP API',
			'Auto-expiry up to 7 days',
			'Delete key'
			]
		})
	);
	const LD_FAQ = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: 'What is Prompt Tape?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Prompt Tape seals a prompt, system prompt, or long instruction into a one-time URL. The link returns plain text any AI agent can fetch and run; humans can read it too.'
				}
			},
			{
				'@type': 'Question',
				name: 'How do I use Prompt Tape with an AI agent?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Add the remote MCP endpoint https://n78.xyz/mcp to Claude, Cursor, or any MCP client, then ask your agent to seal text into a tape. Or POST to https://n78.xyz/api/capsules and share the returned URL.'
				}
			},
			{
				'@type': 'Question',
				name: 'How long does a prompt tape last?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Up to 7 days — 1 hour, 1 day, or 7 days. Each tape carries a delete key so you can remove it anytime.'
				}
			}
		]
	});

	// Microsoft Clarity — anonymous usage stats + heatmaps. Prompt content and the
	// delete token are masked (inputs auto-mask; the non-input prompt/title/token
	// carry data-clarity-mask), so nothing a user types or views is ever uploaded.
	// Set via PUBLIC_CLARITY_ID at runtime; empty/unset = analytics disabled. No baked-in
	// default on purpose: PROD_HOST follows PUBLIC_BASE_URL, so a hardcoded id would silently
	// pour every self-hoster's production traffic into the maintainer's dashboard.
	const CLARITY_ID = env.PUBLIC_CLARITY_ID ?? '';
	// Only load Clarity on the canonical production host — an allowlist, not a denylist. A
	// hostname denylist can never enumerate every non-prod host (LAN IP, staging, tunnel), so a
	// preview build served anywhere but here simply never touches the prod dashboard.
	const PROD_HOST = (() => {
		try {
			return new URL(env.PUBLIC_BASE_URL || SITE).hostname;
		} catch {
			return new URL(SITE).hostname;
		}
	})();

	// Keep <html lang> reconciled to the SSR-derived truth. transformPageChunk sets it on a
	// full document load; after a client-side invalidateAll() this effect re-syncs it.
	$effect(() => {
		if (browser) document.documentElement.lang = htmlLang(data.locale);
	});

	onMount(() => {
		// Load Clarity ONLY on the production host (allowlist). `dev` alone missed `vite preview`
		// (a prod build served on localhost:4173, dev===false) which was polluting the dashboard;
		// a hostname allowlist also covers LAN-IP / staging / tunnel previews a denylist would miss.
		if (dev || !CLARITY_ID || location.hostname !== PROD_HOST) return;
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

	// Switch locale via the SSR source of truth: write the cookie, then invalidateAll() so
	// the root layout load re-runs and page.data.locale updates everywhere (text + ICP + meta).
	async function toggleLang() {
		const next = data.locale === 'zh' ? 'en' : 'zh';
		document.cookie = `pt_locale=${next};path=/;max-age=31536000;samesite=lax`;
		document.documentElement.lang = htmlLang(next);
		await invalidateAll();
	}
</script>

<svelte:head>
	<link rel="canonical" href={canonical} />
	<link rel="icon" href={favicon} />
	<link rel="icon" href="/favicon.ico" sizes="any" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={t('ld_name')} />
	<meta property="og:title" content={OG_TITLE} />
	<meta property="og:description" content={OG_DESC} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content="{SITE}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:locale" content={locale === 'zh' ? 'zh_CN' : 'en_US'} />
	<meta property="og:locale:alternate" content={locale === 'zh' ? 'en_US' : 'zh_CN'} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={OG_TITLE} />
	<meta name="twitter:description" content={OG_DESC} />
	<meta name="twitter:image" content="{SITE}/og.png" />

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${LD_APP}</script>`}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script type="application/ld+json">${LD_FAQ}</script>`}
</svelte:head>

<div class="shell">
	<header class="topbar">
		<a class="brand" href="/">
			<TapeIcon size={34} />
			<span class="wordmark">
				{#if t('nav_brand')}<strong>{t('nav_brand')}</strong>{/if}
				<em class="px">PROMPT&nbsp;TAPE</em>
			</span>
		</a>

		<div class="top-right">
			<a class="skill-link px" href="/skill">{t('nav_skill')}</a>
			<div class="status px">
				<span>TEXT/PLAIN</span><i>·</i><span class="ok"><span class="px-dot"></span>AGENT&nbsp;READY</span>
			</div>
			<button class="lang-btn px" onclick={toggleLang} aria-label={t('aria_switch_lang')}>
				{t('nav_lang')}
			</button>
			<a
				class="gh-link"
				href="https://github.com/FeilixX/prompt-capsule"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="GitHub — {t('nav_source')}"
				title={t('nav_source')}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .5C5.7.5.5 5.8.5 12.3c0 5.2 3.4 9.6 8 11.2.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.6 8-6 8-11.2C23.5 5.8 18.3.5 12 .5z"/></svg>
			</a>
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
		<button class="policy-backdrop" aria-label={t('aria_close')} onclick={() => (showPolicy = false)}></button>
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
		<!-- ICP filing: resolved server-side and gated to locale=zh in +layout.server.ts, so the
		     Chinese filing value never enters the client public-env blob on EN pages. Compliance:
		     hiding a filed site's ICP number in EN is a product decision — needs sign-off pre-release. -->
		{#if data.icp}
			<p class="icp">
				<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">{data.icp}</a>
			</p>
		{/if}
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

	.skill-link {
		border: 2px solid var(--ink);
		border-radius: var(--radius-sm);
		background: var(--cream-lit);
		color: var(--teal-deep);
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		padding: 0.3rem 0.6rem;
		text-decoration: none;
		white-space: nowrap;
		box-shadow: 0 2px 0 var(--ink);
	}
	.skill-link:hover {
		filter: brightness(1.03);
	}
	.skill-link:active {
		transform: translateY(2px);
		box-shadow: none;
	}

	.gh-link {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		flex: none;
		border: 2px solid var(--ink);
		border-radius: var(--radius-sm);
		background: var(--cream-lit);
		color: var(--ink);
		box-shadow: 0 2px 0 var(--ink);
	}
	.gh-link svg {
		width: 18px;
		height: 18px;
		display: block;
	}
	.gh-link:hover {
		filter: brightness(1.03);
	}
	.gh-link:active {
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
	.icp {
		margin: 0.5rem 0 0;
		font-size: 0.64rem;
		letter-spacing: 0.03em;
	}
	.icp a {
		color: rgba(244, 239, 225, 0.55);
		text-decoration: none;
	}
	.icp a:hover {
		color: var(--cream);
		text-decoration: underline;
	}

	@media (max-width: 560px) {
		.status {
			display: none;
		}
	}
</style>
