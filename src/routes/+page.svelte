<script lang="ts">
	import { tFor } from '$lib/locale';
	import { page } from '$app/state';
	import { clarityEvent, copyText } from '$lib/client';

	const t = $derived(tFor(page.data.locale));

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
	let modalOpen = $state(false);

	// delete flow (uses the just-issued token in hand)
	let confirmingDelete = $state(false);
	let deleting = $state(false);
	let deleted = $state(false);
	let deleteErr = $state('');

	// Show characters (humans think in 字/chars, not bytes). The server cap is
	// 16 KB; 5,000 chars always fits (even all-CJK ≈ 15 KB), so the char count is
	// the honest ceiling and the byte check below is just a silent backstop.
	const chars = $derived([...content].length);
	const MAX_CHARS = 5000;
	const bytes = $derived(new TextEncoder().encode(content).length);
	const MAX_BYTES = 16384;
	const overLimit = $derived(chars > MAX_CHARS || bytes > MAX_BYTES);

	const ttlLabel = $derived(ttl === 3600 ? t('seg_1h') : ttl === 86400 ? t('seg_1d') : t('seg_7d'));
	const ttlChip = $derived(ttl === 3600 ? '1H' : ttl === 86400 ? '1D' : '7D');
	const expiresText = $derived(result ? new Date(result.expires_at).toLocaleString() : '');
	const display = $derived(result ? result.url.replace(/^https?:\/\//, '') : '');
	const headerText = $derived(
		deleted ? t('m_head_del') : errorMsg ? t('m_head_err') : busy ? t('m_head_rec') : t('m_head_done')
	);

	const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

	async function record() {
		if (busy || content.trim() === '' || overLimit) return;
		// pop the sheet immediately in its recording state, THEN talk to the server
		busy = true;
		errorMsg = '';
		result = null;
		deleted = false;
		confirmingDelete = false;
		deleteErr = '';
		modalOpen = true;
		const started = performance.now();
		try {
			const res = await fetch('/api/capsules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content,
					title: title.trim() || null,
					ttl_seconds: ttl,
					source: 'web',
					lang: page.data.locale
				})
			});
			const data = await res.json();
			// keep the reels turning for a beat so "recording" reads as a real action
			const elapsed = performance.now() - started;
			if (elapsed < 650) await delay(650 - elapsed);
			if (!res.ok) {
				errorMsg = data.error ?? t('m_err_generic');
				return;
			}
			result = data as CreateResponse;
			clarityEvent('tape_created'); // the key conversion — home visit → sealed tape
		} catch {
			errorMsg = t('m_err_generic');
		} finally {
			busy = false;
		}
	}

	function retry() {
		errorMsg = '';
		record();
	}

	async function copy(text: string, which: string) {
		const ok = await copyText(text);
		if (ok) {
			copied = which;
			setTimeout(() => (copied = ''), 1400);
		}
		// Clarity captures the creation funnel (tape_created → copy_*). copy_count (DB) is NOT
		// bumped here: a creator copying their own just-issued link/agent_text isn't reader
		// interest — copy_count counts /view reader copies only.
		clarityEvent(ok ? 'copy_' + which : 'copy_fail');
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
				clarityEvent('tape_deleted');
			} else {
				const data = await res.json();
				deleteErr = data.message ?? data.error ?? t('v_del_fail');
			}
		} catch {
			deleteErr = t('v_net_err');
		} finally {
			deleting = false;
			confirmingDelete = false;
		}
	}

	// the sheet only closes on ✕ (never on a backdrop misclick — the delete key
	// shows once and is easy to lose). Closing wipes back to a fresh form.
	function reset() {
		modalOpen = false;
		result = null;
		content = '';
		title = '';
		deleted = false;
		confirmingDelete = false;
		deleteErr = '';
		errorMsg = '';
	}
</script>

<svelte:head>
	<title>{t('title_home')}</title>
	<meta name="description" content={t('meta_desc')} />
</svelte:head>

<main class="page">
	<!-- HERO -->
	<section class="hero">
		<div class="hero-left">
			<h1 class="wordmark">
				{#if t('wm_l1')}<span class="l1">{t('wm_l1')} <span class="sl">/</span></span>{/if}
				<span class="l2 px">PROMPT TAPE</span>
			</h1>
			<p class="tagline">{t('tagline_a')}<span class="hl">{t('tagline_hl')}</span>{t('tagline_b')}</p>

			<div class="input-card">
				<div class="ic-head">
					<span class="t px">{t('input_head')}</span>
					<span class="m px">{t('input_mode')}</span>
				</div>
				<div class="ic-body">
					<input
						class="title-in"
						bind:value={title}
						placeholder={t('title_ph')}
						maxlength="200"
						disabled={busy}
					/>
					<textarea
						class="body-in"
						bind:value={content}
						placeholder={t('body_ph')}
						disabled={busy}
					></textarea>
					<div class="bytes px" class:over={overLimit}>
						<b>{chars.toLocaleString()}</b> / {MAX_CHARS.toLocaleString()} {t('unit_char')}
					</div>
				</div>
				<div class="ic-foot">
					<div class="seg" role="group" aria-label="TTL">
						<button class:on={ttl === 3600} onclick={() => (ttl = 3600)} disabled={busy}>{t('seg_1h')}</button>
						<button class:on={ttl === 86400} onclick={() => (ttl = 86400)} disabled={busy}>{t('seg_1d')}</button>
						<button class:on={ttl === 604800} onclick={() => (ttl = 604800)} disabled={busy}>{t('seg_7d')}</button>
					</div>
					<button
						class="seal"
						onclick={record}
						disabled={busy || content.trim() === '' || overLimit}
					>
						<span class="o"></span>{busy ? t('recording') : t('record')}
					</button>
				</div>
				<div class="chips">
					<span class="chip2">TEXT/PLAIN</span>
					<span class="chip2"><span class="dot"></span>AGENT READY</span>
					<span class="chip2">{t('chip_expires')} {ttlChip}</span>
				</div>
			</div>
			<p class="privacy">{t('privacy_a')}{ttlLabel}{t('privacy_valid')}{t('privacy_b')}</p>
		</div>

		<img class="hero-img" src="/sprites/n78/hero.png" alt={t('alt_hero')} />
	</section>

	<!-- 3 STEPS -->
	<section class="band-row">
		<div class="step">
			<span class="n px">1</span>
			<img class="sicn" src="/sprites/n78/ic-content.png" alt="" />
			<div><h3>{t('step1_h')}</h3><p>{t('step1_p')}</p></div>
		</div>
		<div class="step">
			<span class="n px">2</span>
			<img class="sicn" src="/sprites/n78/url-tag.png" alt="" />
			<div><h3>{t('step2_h')}</h3><p>{t('step2_p')}</p></div>
		</div>
		<div class="step">
			<span class="n px">3</span>
			<img class="sicn" src="/sprites/n78/ic-agent.png" alt="" />
			<div><h3>{t('step3_h')}</h3><p>{t('step3_p')}</p></div>
		</div>
	</section>

	<!-- 4 FEATURES -->
	<section class="features">
		<div class="feat">
			<img class="icn" src="/sprites/n78/ic-privacy.png" alt="" />
			<div><h3>{t('feat1_h')}</h3><p>{t('feat1_p')}</p></div>
		</div>
		<div class="feat">
			<img class="icn" src="/sprites/n78/ic-secure.png" alt="" />
			<div><h3>{t('feat2_h')}</h3><p>{t('feat2_p')}</p></div>
		</div>
		<div class="feat">
			<img class="icn" src="/sprites/n78/ic-expire.png" alt="" />
			<div><h3>{t('feat3_h')}</h3><p>{t('feat3_p')}</p></div>
		</div>
		<div class="feat">
			<img class="icn" src="/sprites/n78/robot-idle.png" alt="" />
			<div><h3>{t('feat4_h')}</h3><p>{t('feat4_p')}</p></div>
		</div>
	</section>
</main>

<!-- MODAL: record → recording → sealed -->
{#if modalOpen}
	<div class="modal" role="dialog" aria-modal="true" aria-label={headerText}>
		<div class="backdrop"></div>
		<div class="sheet">
			<div class="sheet-head">
				<span class="t">{headerText}</span>
				<button class="x" onclick={reset} aria-label={t('aria_close')}>✕</button>
			</div>

			{#if deleted}
				<div class="m-deleted">
					<span class="del-done px">DELETED ✔</span>
					<p>{t('m_deleted_line')}</p>
					<button class="ghost" onclick={reset}>{t('m_again')}</button>
				</div>
			{:else if errorMsg}
				<div class="m-error">
					<p class="m-err-line">{errorMsg}</p>
					<button class="ghost" onclick={retry}>{t('m_err_retry')}</button>
				</div>
			{:else}
				<div class="m-tape-wrap">
					<img
						class="m-cassette"
						src={busy ? '/sprites/tape-spin.png' : '/sprites/tape-still.png'}
						alt={t('alt_your_tape')}
					/>
					<span class="m-url px" class:rec={busy}>{busy ? t('m_url_rec') : display}</span>
				</div>
				<div class="m-play px">
					{#if busy}<span class="rec-dot"></span>{/if}{busy ? t('m_play_rec') : t('m_play_done')}
				</div>

				{#if !busy && result}
					<div class="acts">
						<button class="teal" onclick={() => copy(result!.agent_text, 'agent')}>
							{copied === 'agent' ? t('m_copy_agent_done') : t('m_copy_agent')}
						</button>
						<button class="yellow" onclick={() => copy(result!.view_url, 'link')}>
							{copied === 'link' ? t('m_copy_link_done') : t('m_copy_link')}
						</button>
					</div>

					<div class="m-meta">
						<span><b>{t('m_meta_expires')}</b> {expiresText}</span>
						<a href={result.view_url}>{t('m_meta_open')}</a>
					</div>

					<div class="m-tok">
						{t('m_tok_label')}
						<code data-clarity-mask="true">{result.delete_token}</code>
					</div>

					<div class="m-foot">
						<button class="ghost" onclick={reset}>{t('m_again')}</button>
						{#if confirmingDelete}
							<span class="danger px">
								{t('m_del_q')}
								<button class="mini-del" onclick={doDelete} disabled={deleting}>
									{deleting ? t('m_del_yes_busy') : t('m_del_yes')}
								</button>
								<button class="linky" onclick={() => (confirmingDelete = false)}>{t('m_del_cancel')}</button>
							</span>
						{:else}
							<button class="del" onclick={() => (confirmingDelete = true)}>{t('m_delete')}</button>
						{/if}
					</div>
					{#if deleteErr}<p class="err px m-err">! {deleteErr}</p>{/if}
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.page {
		width: min(1200px, 100%);
		margin: 0 auto;
		padding: clamp(1.2rem, 3.5vw, 2.2rem) clamp(1rem, 4vw, 2.4rem) 2.4rem;
		display: flex;
		flex-direction: column;
		gap: clamp(1.1rem, 2.6vw, 1.6rem);
	}

	/* ---- hero ---- */
	.hero {
		display: grid;
		grid-template-columns: 0.94fr 1.06fr;
		gap: clamp(1.2rem, 3vw, 2.4rem);
		align-items: center;
		padding: 0.2rem 0;
	}
	.wordmark {
		margin: 0 0 0.4rem;
		line-height: 0.98;
	}
	.wordmark .l1 {
		display: block;
		font-size: clamp(2rem, 4.6vw, 3.3rem);
		font-weight: 800;
		letter-spacing: -0.01em;
	}
	.wordmark .l1 .sl {
		color: var(--muted);
		font-weight: 400;
	}
	.wordmark .l2 {
		display: block;
		font-family: var(--fp);
		color: var(--red);
		font-size: clamp(1.9rem, 4.5vw, 3.4rem);
		line-height: 1;
		margin-top: 0.1rem;
		white-space: nowrap;
	}
	.tagline {
		margin: 0.35rem 0 1rem;
		font-size: clamp(1.02rem, 2.6vw, 1.35rem);
		font-weight: 700;
		color: var(--ink-2);
	}
	.tagline .hl {
		color: #fff;
		background: var(--red);
		border: 2.5px solid var(--red-deep);
		border-radius: 7px;
		padding: 0 0.3rem;
		display: inline-block;
		transform: rotate(-1deg);
	}

	.input-card {
		border: 2.5px solid var(--ink);
		border-radius: 11px;
		background: var(--cream-lit);
		box-shadow: 0 4px 0 rgba(28, 26, 23, 0.14);
		overflow: hidden;
	}
	.ic-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.45rem 0.7rem;
		border-bottom: 2.5px solid var(--ink);
		background: var(--paper);
	}
	.ic-head .t {
		font-size: 0.78rem;
	}
	.ic-head .m {
		font-size: 0.62rem;
		color: var(--muted);
	}
	.ic-body {
		padding: 0.6rem 0.7rem 0.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.title-in {
		width: 100%;
		border: 2px solid var(--ink);
		border-radius: 6px;
		background: var(--paper);
		padding: 0.42rem 0.6rem;
		font-family: var(--fs);
		font-size: 0.82rem;
		color: var(--ink);
	}
	.title-in::placeholder {
		color: var(--muted);
	}
	.title-in:focus,
	.body-in:focus {
		outline: 3px solid var(--teal);
		outline-offset: 1px;
	}
	.body-in {
		width: 100%;
		height: 132px;
		resize: vertical;
		min-height: 96px;
		overflow: auto;
		border: 2.5px solid var(--ink);
		border-radius: 7px;
		background: var(--paper);
		box-shadow: inset 0 0 0 3px var(--paper), inset 0 0 0 4px #d8ccb8;
		padding: 0.55rem 0.7rem;
		font-family: var(--fm);
		font-size: 0.86rem;
		line-height: 1.55;
		color: var(--ink);
	}
	.bytes {
		align-self: flex-end;
		font-size: 0.66rem;
		color: var(--muted);
	}
	.bytes b {
		color: var(--ink-2);
	}
	.bytes.over,
	.bytes.over b {
		color: var(--red);
	}
	.ic-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.7rem;
		flex-wrap: wrap;
		padding: 0.55rem 0.7rem;
		border-top: 2.5px solid var(--ink);
		background: var(--paper);
	}
	.seg {
		display: inline-flex;
		gap: 5px;
	}
	.seg button {
		padding: 0.3rem 0.62rem;
		font-family: var(--fs);
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--ink-2);
		border: 2.5px solid var(--ink);
		border-radius: 6px;
		background: #fff;
		box-shadow: 0 2px 0 rgba(28, 26, 23, 0.22);
		cursor: pointer;
	}
	.seg button.on {
		background: var(--red);
		border-color: var(--red-deep);
		color: #fff;
		box-shadow: 0 2px 0 var(--red-deep);
	}
	.seg button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.seal {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border: 2.5px solid var(--red-deep);
		background: var(--red);
		color: #fff;
		font-family: var(--fs);
		font-weight: 800;
		font-size: 0.95rem;
		padding: 0.48rem 1.05rem;
		border-radius: 9px;
		box-shadow: 0 4px 0 var(--red-deep);
		cursor: pointer;
	}
	.seal:hover:not(:disabled) {
		filter: brightness(1.04);
	}
	.seal:active:not(:disabled) {
		transform: translateY(3px);
		box-shadow: 0 1px 0 var(--red-deep);
	}
	.seal:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.seal .o {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #fff;
		box-shadow: inset 0 0 0 2px var(--red);
	}
	.chips {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		padding: 0.55rem 0.7rem;
		border-top: 1.5px dashed var(--line);
	}
	.chip2 {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 2px solid var(--ink);
		border-radius: 5px;
		background: var(--cream-lit);
		padding: 0.22rem 0.5rem;
		font-family: var(--fp);
		font-size: 0.66rem;
	}
	.chip2 .dot {
		width: 7px;
		height: 7px;
		background: var(--teal);
		border: 1.5px solid var(--teal-deep);
	}
	.privacy {
		margin: 0.6rem 0 0;
		font-size: 0.72rem;
		color: var(--muted);
	}

	.hero-img {
		width: 100%;
		height: auto;
		max-height: 460px;
		object-fit: contain;
		display: block;
	}

	/* ---- 3 steps ---- */
	.band-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}
	.step {
		position: relative;
		border: 2.5px solid var(--ink);
		border-radius: 12px;
		background: var(--cream-lit);
		box-shadow: 0 4px 0 rgba(28, 26, 23, 0.14);
		padding: 1.1rem 1.1rem 1.1rem 1.2rem;
		display: flex;
		gap: 0.9rem;
		align-items: center;
		min-height: 96px;
	}
	.step .sicn {
		width: 56px;
		height: 56px;
		flex: none;
		object-fit: contain;
	}
	.step .n {
		position: absolute;
		top: -11px;
		left: -9px;
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		border: 2.5px solid var(--ink);
		border-radius: 7px;
		background: #1c1a17;
		color: #fff;
		font-size: 0.95rem;
		box-shadow: 0 3px 0 rgba(28, 26, 23, 0.3);
	}
	.step:nth-child(1) .n {
		background: var(--yellow);
		color: #3a2c05;
	}
	.step:nth-child(2) .n {
		background: var(--teal);
		color: #f2fffb;
	}
	.step:nth-child(3) .n {
		background: var(--red);
		color: #fff;
	}
	.step h3 {
		margin: 0 0 0.1rem;
		font-size: 0.9rem;
	}
	.step p {
		margin: 0;
		font-size: 0.76rem;
		color: var(--ink-2);
		line-height: 1.4;
	}

	/* ---- 4 features ---- */
	.features {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}
	.feat {
		border: 2.5px solid var(--ink);
		border-radius: 12px;
		background: var(--cream-lit);
		box-shadow: 0 4px 0 rgba(28, 26, 23, 0.14);
		padding: 1rem;
		display: flex;
		gap: 0.75rem;
		align-items: center;
		min-height: 92px;
	}
	.feat .icn {
		width: 50px;
		height: 50px;
		flex: none;
		object-fit: contain;
	}
	.feat h3 {
		margin: 0 0 0.18rem;
		font-size: 0.95rem;
	}
	.feat p {
		margin: 0;
		font-size: 0.76rem;
		color: var(--ink-2);
		line-height: 1.45;
	}

	/* ---- modal ---- */
	.modal {
		position: fixed;
		inset: 0;
		z-index: 60;
	}
	.backdrop {
		position: absolute;
		inset: 0;
		background: rgba(28, 26, 23, 0.55);
	}
	.sheet {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(440px, 92vw);
		max-height: 92vh;
		overflow: auto;
		border: 3px solid var(--ink);
		border-radius: 14px;
		background: var(--cream-lit);
		box-shadow: 0 10px 0 rgba(28, 26, 23, 0.3);
		padding: 1rem 1.1rem 1.1rem;
		animation: sheet-pop 0.16s ease-out;
	}
	@keyframes sheet-pop {
		from {
			transform: translate(-50%, -50%) scale(0.9);
		}
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.7rem;
	}
	.sheet-head .t {
		font-weight: 800;
		font-size: 1.05rem;
	}
	.sheet-head .x {
		border: 2px solid var(--ink);
		background: var(--cream);
		border-radius: 6px;
		width: 28px;
		height: 28px;
		cursor: pointer;
		font-weight: 800;
		box-shadow: 0 2px 0 var(--ink);
	}
	.sheet-head .x:active {
		transform: translateY(2px);
		box-shadow: none;
	}
	.m-tape-wrap {
		position: relative;
		width: 86%;
		margin: 0.2rem auto 0.5rem;
	}
	.m-cassette {
		display: block;
		width: 100%;
		height: auto;
	}
	.m-url {
		position: absolute;
		top: 18%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-weight: 700;
		font-size: clamp(0.82rem, 3.2vw, 1.12rem);
		color: var(--ink);
		white-space: nowrap;
		letter-spacing: 0.01em;
	}
	.m-url.rec {
		color: var(--muted);
	}
	.m-play {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		color: var(--ink-2);
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		margin-bottom: 0.8rem;
	}
	.rec-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--red);
		animation: rec-pulse 1s infinite;
	}
	@keyframes rec-pulse {
		0% {
			box-shadow: 0 0 0 0 rgba(229, 53, 43, 0.5);
		}
		70% {
			box-shadow: 0 0 0 6px rgba(229, 53, 43, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(229, 53, 43, 0);
		}
	}
	.acts {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 0.5rem;
	}
	.acts button {
		border: 2.5px solid var(--ink);
		border-radius: 8px;
		font-family: var(--fs);
		font-weight: 800;
		font-size: 0.84rem;
		padding: 0.5rem;
		cursor: pointer;
		box-shadow: 0 3px 0 var(--ink);
	}
	.acts button:active {
		transform: translateY(3px);
		box-shadow: none;
	}
	.acts .teal {
		background: var(--teal);
		border-color: var(--teal-deep);
		color: #f2fffb;
		box-shadow: 0 3px 0 var(--teal-deep);
	}
	.acts .yellow {
		background: var(--yellow);
		border-color: var(--yellow-deep);
		color: #3a2c05;
		box-shadow: 0 3px 0 var(--yellow-deep);
	}
	.m-meta {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.72rem;
		color: var(--muted);
		border-top: 2px dashed var(--line);
		margin-top: 0.8rem;
		padding-top: 0.6rem;
	}
	.m-meta b {
		color: var(--red-deep);
	}
	.m-meta a {
		color: var(--ink);
		font-weight: 700;
	}
	.m-tok {
		border: 2px dashed var(--line);
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
		margin-top: 0.6rem;
		font-size: 0.72rem;
		color: var(--muted);
	}
	.m-tok code {
		display: block;
		font-family: var(--fp);
		color: var(--ink);
		background: var(--paper);
		border: 1.5px solid var(--line);
		border-radius: 4px;
		padding: 0.35rem 0.45rem;
		margin-top: 0.3rem;
		word-break: break-all;
		letter-spacing: 0.02em;
	}
	.m-foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.8rem;
	}
	.m-foot .ghost,
	.m-deleted .ghost,
	.m-error .ghost {
		border: 2.5px solid var(--ink);
		background: transparent;
		border-radius: 7px;
		padding: 0.42rem 0.9rem;
		font-family: var(--fs);
		font-weight: 700;
		font-size: 0.82rem;
		cursor: pointer;
		color: var(--ink);
		box-shadow: 0 3px 0 var(--ink);
	}
	.m-foot .ghost:active,
	.m-deleted .ghost:active,
	.m-error .ghost:active {
		transform: translateY(3px);
		box-shadow: none;
	}
	.del {
		border: none;
		background: none;
		color: var(--muted);
		font-size: 0.76rem;
		cursor: pointer;
	}
	.del:hover {
		color: var(--red);
		text-decoration: underline;
	}
	.danger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.76rem;
		color: var(--red-deep);
	}
	.mini-del {
		border: 2px solid var(--red-deep);
		background: var(--red);
		color: #fff;
		border-radius: 6px;
		padding: 0.28rem 0.6rem;
		font-family: var(--fs);
		font-weight: 800;
		font-size: 0.76rem;
		cursor: pointer;
	}
	.linky {
		border: none;
		background: none;
		color: var(--muted);
		cursor: pointer;
		text-decoration: underline;
		font-size: 0.76rem;
	}
	.err {
		color: var(--red-deep);
		font-size: 0.82rem;
		font-weight: 700;
	}
	.m-err {
		margin: 0.5rem 0 0;
	}
	.m-deleted,
	.m-error {
		text-align: center;
		padding: 1.4rem 0 0.6rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
	}
	.del-done {
		color: var(--teal-deep);
		font-size: 1.2rem;
		letter-spacing: 0.08em;
	}
	.m-deleted p,
	.m-err-line {
		margin: 0;
		font-size: 0.9rem;
		color: var(--ink-2);
		max-width: 30ch;
		line-height: 1.6;
	}
	.m-err-line {
		color: var(--red-deep);
		font-weight: 700;
	}

	/* ---- responsive ---- */
	@media (max-width: 900px) {
		.hero {
			grid-template-columns: 1fr;
		}
		.hero-img {
			order: -1;
			max-height: 300px;
		}
		.band-row,
		.features {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 560px) {
		.band-row,
		.features {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet {
			animation: none;
		}
		.rec-dot {
			animation: none;
		}
	}
</style>
