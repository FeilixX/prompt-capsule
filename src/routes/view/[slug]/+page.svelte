<script lang="ts">
	import type { PageData } from './$types';
	import VoidScene from '$lib/components/VoidScene.svelte';
	import TapeCta from '$lib/components/TapeCta.svelte';
	import { tFor } from '$lib/locale';
	import { page } from '$app/state';
	import { clarityEvent, bumpCopyCount, copyText } from '$lib/client';

	let { data }: { data: PageData } = $props();
	const t = $derived(tFor(page.data.locale));
	let copied = $state('');

	// Funnel signal: how often people land on a dead (expired/deleted/off-air) tape vs a
	// live one. Keyed per target so a client-side nav to another tape (SvelteKit reuses this
	// component) re-fires the classification — $effect only runs in the browser. A program
	// off-air view counts as view_expired: same funnel meaning (arrived, nothing playable).
	$effect(() => {
		void (data.kind === 'tape' ? data.slug : data.program);
		clarityEvent(data.kind === 'tape' && data.active ? 'view_active' : 'view_expired');
	});

	// delete-with-token: only the creator (who kept the token) can delete.
	let token = $state('');
	let deleting = $state(false);
	let viewDeleted = $state(false);
	let delErr = $state('');

	// live countdown to expiry (client only, so no SSR time mismatch)
	let now = $state<number | null>(null);
	$effect(() => {
		now = Date.now();
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});
	const remaining = $derived.by(() => {
		if (data.kind !== 'tape' || now === null) return '';
		const ms = new Date(data.expiresAt).getTime() - now;
		if (ms <= 0) return '00:00:00';
		const secs = Math.floor(ms / 1000);
		const d = Math.floor(secs / 86400);
		const h = Math.floor((secs % 86400) / 3600);
		const m = Math.floor((secs % 3600) / 60);
		const s = secs % 60;
		const p = (n: number) => String(n).padStart(2, '0');
		return d > 0 ? `${d}${t('unit_day')} ${p(h)}:${p(m)}:${p(s)}` : `${p(h)}:${p(m)}:${p(s)}`;
	});

	async function copy(text: string, which: string) {
		if (data.kind !== 'tape') return; // only reachable from the tape branch markup
		const ok = await copyText(text);
		if (ok) {
			copied = which;
			setTimeout(() => (copied = ''), 1400);
		}
		clarityEvent(ok ? 'copy_' + which : 'copy_fail');
		if (ok) bumpCopyCount(data.slug);
	}

	async function doDelete() {
		if (data.kind !== 'tape') return;
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
				clarityEvent('tape_deleted');
			} else {
				const d = await res.json();
				delErr = res.status === 403 ? t('v_del_wrong') : (d.message ?? d.error ?? t('v_del_fail'));
			}
		} catch {
			delErr = t('v_net_err');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>{(data.kind === 'tape' ? data.title : data.program) ?? t('brand_name')} · Prompt Tape</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="page">
	{#if data.kind === 'program-offair'}
		<!-- Program exists but its current tape is dead: nothing about the dead tape leaks
		     here (no slug/title/dates) — just the program name and "next episode soon". -->
		<VoidScene
			line={`${data.program} — ${t('offair_line')}`}
			ctaLabel={t('void_cta')}
			ctaSub="NEW TAPE"
			ctaHref="/"
			alt={t('alt_void')}
		/>
	{:else if data.active}
		<!-- HERO: integrated pixel illustration + live text overlays -->
		<div class="hero">
			<img src="/sprites/n78/view-hero.png" alt={t('alt_view_hero')} />
			<span class="vh-title" data-clarity-mask="true">{t('v_now_playing')}{data.title || t('v_untitled')}</span>
			<span class="vh-url px">{data.display}</span>
			<span class="vh-time px">{remaining || '—'}</span>
		</div>

		<!-- CONTENT -->
		<section class="panel">
			<div class="panel-head">
				<span class="ph-title">
					<svg class="file-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l4 4v16H6z" fill="var(--teal)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/><path d="M9 12h7M9 16h7M9 8h3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
					{t('v_panel')}
				</span>
				<span class="ph-mode px">TEXT/PLAIN</span>
			</div>
			<pre class="content" data-clarity-mask="true">{data.content}</pre>
		</section>

		<!-- ACTIONS -->
		<section class="actions">
			<button class="px-btn is-teal" onclick={() => copy(data.agentText, 'agent')}>
				<svg class="ai-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8V4M9 13h.01M15 13h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
				{copied === 'agent' ? t('v_copy_agent_done') : t('v_copy_agent')}
			</button>
			<button class="px-btn is-yellow" onclick={() => copy(data.content ?? '', 'content')}>
				<svg class="cp-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 16V4h12" fill="none" stroke="currentColor" stroke-width="2"/></svg>
				{copied === 'content' ? t('v_copy_raw_done') : t('v_copy_raw')}
			</button>

			<div class="del">
				<span class="del-lab">{t('v_del_label')}</span>
				{#if viewDeleted}
					<span class="del-done px">DELETED ✔</span>
				{:else}
					<input
						class="px-well"
						bind:value={token}
						placeholder={t('v_del_ph')}
						aria-label={t('v_del_label')}
					/>
					<button
						class="trash"
						onclick={doDelete}
						disabled={deleting || token.trim() === ''}
						aria-label={t('v_cta')}
						title={t('v_cta')}
					>
						{#if deleting}…{:else}
							<svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
						{/if}
					</button>
				{/if}
			</div>
		</section>
		{#if delErr}<p class="err px">! {delErr}</p>{/if}

		<!-- MAKE YOUR OWN -->
		<div class="make-wrap">
			<TapeCta label={t('v_cta')} sub="MAKE YOUR OWN TAPE" href="/" />
		</div>
	{:else}
		<!-- EXPIRED / VOID (content cleared) -->
		<VoidScene
			line={t('void_line')}
			ctaLabel={t('void_cta')}
			ctaSub="NEW TAPE"
			ctaHref="/"
			alt={t('alt_void')}
		/>
	{/if}
</main>

<style>
	.page {
		width: min(880px, 100%);
		margin: 0 auto;
		padding: clamp(1.2rem, 4vw, 2.4rem) clamp(1rem, 4vw, 2rem) 3rem;
	}

	/* ---- hero: illustration + text overlays ----
	   overlay positions are measured against the cropped hero (1250×503);
	   font sizes use cqw so text scales + stays pinned to its slot at any width. */
	.hero {
		position: relative;
		width: min(760px, 100%);
		margin: 0.4rem auto 0;
		container-type: inline-size;
	}
	.hero > img {
		display: block;
		width: 100%;
		height: auto;
	}
	.vh-title {
		position: absolute;
		top: 12.5%;
		left: 33.3%;
		transform: translateY(-50%);
		max-width: 32.5%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-family: var(--fs);
		font-weight: 800;
		font-size: 1.82cqw;
		line-height: 1;
		color: #5a4708; /* dark brown, reads on the yellow tag */
	}
	.vh-url {
		position: absolute;
		top: 33%;
		left: 45.5%;
		transform: translate(-50%, -50%);
		font-size: 3.1cqw;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: var(--ink);
		white-space: nowrap;
	}
	.vh-time {
		position: absolute;
		top: 56.5%;
		left: 9.8%;
		transform: translate(-50%, -50%);
		font-size: 1.72cqw;
		font-weight: 600;
		letter-spacing: 0.01em;
		color: var(--red);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	/* ---- content panel ---- */
	.panel {
		margin-top: 1.4rem;
		border: 2.5px solid var(--ink);
		border-radius: var(--radius);
		background: var(--cream-lit);
		overflow: hidden;
	}
	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.6rem 0.9rem;
		border-bottom: 2.5px solid var(--ink);
		background: var(--paper);
	}
	.ph-title {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.98rem;
		font-weight: 800;
	}
	.file-i {
		width: 20px;
		height: 20px;
	}
	.ph-mode {
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		color: var(--muted);
	}
	.content {
		margin: 0;
		padding: 1rem 1.1rem;
		max-height: 56vh;
		overflow: auto;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: var(--fm);
		font-size: 0.86rem;
		line-height: 1.7;
		color: var(--ink);
		background: var(--paper);
	}

	/* ---- actions ---- */
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		gap: 0.6rem;
		margin-top: 1rem;
	}
	.actions .px-btn {
		font-size: 0.92rem;
		padding: 0.6rem 0.9rem;
	}
	.ai-i,
	.cp-i {
		width: 18px;
		height: 18px;
	}
	.del {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 240px;
		padding-left: 0.6rem;
		border-left: 2.5px dashed var(--line);
	}
	.del-lab {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--ink-2);
		white-space: nowrap;
	}
	.del .px-well {
		flex: 1;
		min-width: 90px;
		font-size: 0.8rem;
		padding: 0.5rem 0.6rem;
	}
	.del-done {
		color: var(--teal-deep);
		font-size: 0.82rem;
	}
	.trash {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		flex: none;
		border: 2.5px solid var(--red-deep);
		border-radius: var(--radius-sm);
		background: var(--cream-lit);
		color: var(--red);
		cursor: pointer;
		box-shadow: 0 3px 0 var(--red-deep);
	}
	.trash svg {
		width: 20px;
		height: 20px;
	}
	.trash:hover:not(:disabled) {
		background: var(--red);
		color: #fff;
	}
	.trash:active:not(:disabled) {
		transform: translateY(3px);
		box-shadow: none;
	}
	.trash:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.err {
		margin: 0.5rem 0 0;
		color: var(--red-deep);
		font-size: 0.82rem;
		font-weight: 700;
	}

	/* ---- make your own ---- */
	.make-wrap {
		margin-top: 1.2rem;
	}

	@media (max-width: 640px) {
		.del {
			border-left: none;
			padding-left: 0;
			flex-basis: 100%;
		}
	}
</style>
