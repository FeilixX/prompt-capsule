<script lang="ts">
	/* The hero object: a flat 2.5D "collectible command label".
	   Fully dynamic — every capsule renders its real URL live. */
	interface Props {
		/** URL string shown big in the window (no scheme). Page may feed a
		 *  scrambling value here during the seal animation. */
		urlText: string;
		slug: string;
		ttlLabel?: string; // 7D / 24H / 1H
		expiresText?: string; // human expiry
		title?: string | null;
		seal?: boolean; // run the stamp-in entrance
		tone?: 'live' | 'dead'; // expired capsules render muted
	}

	let {
		urlText,
		slug,
		ttlLabel = '7D',
		expiresText = '',
		title = null,
		seal = false,
		tone = 'live'
	}: Props = $props();

	const serial = $derived(`PC7D-${slug.toUpperCase()}`);

	// Auto-fit: shrink the URL font until it fits the window, so any domain /
	// path length renders on one line without clipping.
	let urlEl = $state<HTMLDivElement | null>(null);
	function fitUrl() {
		const el = urlEl;
		if (!el) return;
		el.style.fontSize = '';
		let size = parseFloat(getComputedStyle(el).fontSize);
		let guard = 0;
		while (el.scrollWidth > el.clientWidth + 1 && size > 11 && guard++ < 40) {
			size -= 1;
			el.style.fontSize = size + 'px';
		}
	}
	$effect(() => {
		urlText; // re-fit when the URL changes
		fitUrl();
		window.addEventListener('resize', fitUrl);
		return () => window.removeEventListener('resize', fitUrl);
	});
</script>

<div class="cc" class:is-seal={seal} class:is-dead={tone === 'dead'}>
	<div class="cc-corner pc-tone" aria-hidden="true"></div>

	<div class="cc-head">
		<div class="cc-brand">
			<svg class="cc-mark" viewBox="0 0 40 24" aria-hidden="true">
				<rect x="1" y="4.5" width="38" height="15" rx="7.5" fill="none" stroke="currentColor" stroke-width="2" />
				<path d="M20 4.5v15" stroke="currentColor" stroke-width="2" />
				<rect x="1" y="4.5" width="19.5" height="15" rx="7.5" fill="var(--red)" stroke="var(--ink)" stroke-width="2" />
			</svg>
			<div class="cc-brand-txt">
				<strong>PROMPT CAPSULE</strong>
				<span>提示词胶囊</span>
			</div>
		</div>
		<span class="cc-model">PC-7D</span>
	</div>

	<div class="cc-window">
		<div class="cc-pill" aria-hidden="true"></div>
		<div class="cc-url pc-mono" bind:this={urlEl}>{urlText}</div>
	</div>

	<p class="cc-sub pc-mono">
		<span>长提示词已封装为短链接</span>
		<span class="en">LONG PROMPT SEALED INTO SHORT URL</span>
	</p>

	{#if title}
		<p class="cc-title">「{title}」</p>
	{/if}

	<div class="cc-meta">
		<span class="cc-tag">TEXT/PLAIN</span>
		<span class="cc-tag has-dot"><span class="pc-dot"></span>AGENT READY</span>
		<span class="cc-tag is-expire">EXPIRES {ttlLabel}</span>
	</div>

	<div class="cc-foot">
		<div class="cc-barcode" aria-hidden="true"></div>
		<span class="cc-serial pc-mono">SN {serial}</span>
		<div class="cc-seal" aria-hidden="true">
			<svg viewBox="0 0 100 100">
				<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3" />
				<circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" stroke-width="1.5" />
			</svg>
			<span class="cc-seal-glyph">封</span>
		</div>
	</div>

	{#if tone === 'dead'}
		<div class="cc-void pc-mono">EXPIRED</div>
	{/if}
</div>

<style>
	.cc {
		position: relative;
		border: 2px solid var(--ink);
		border-radius: 14px;
		background: var(--paper);
		box-shadow: var(--shadow);
		padding: 1.15rem 1.25rem 1rem;
		overflow: hidden;
		isolation: isolate;
	}

	.cc-corner {
		position: absolute;
		inset: 0 0 auto auto;
		width: 120px;
		height: 120px;
		--tone-color: rgba(20, 17, 15, 0.13);
		-webkit-mask-image: linear-gradient(225deg, #000 0 42%, transparent 60%);
		mask-image: linear-gradient(225deg, #000 0 42%, transparent 60%);
		z-index: 0;
		pointer-events: none;
	}

	.cc > *:not(.cc-corner) {
		position: relative;
		z-index: 1;
	}

	/* ---- head ---- */
	.cc-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.9rem;
	}
	.cc-brand {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		color: var(--ink);
	}
	.cc-mark {
		width: 40px;
		height: 24px;
		flex: none;
	}
	.cc-brand-txt {
		display: flex;
		flex-direction: column;
		line-height: 1.05;
	}
	.cc-brand-txt strong {
		font-family: var(--mono);
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.06em;
	}
	.cc-brand-txt span {
		font-size: 0.72rem;
		color: var(--muted);
	}
	.cc-model {
		font-family: var(--mono);
		font-size: 0.72rem;
		font-weight: 800;
		color: #fff;
		background: var(--red);
		border: 1.5px solid var(--red-deep);
		padding: 0.2rem 0.5rem;
		letter-spacing: 0.04em;
		transform: rotate(0.5deg);
	}

	/* ---- window with capsule pill + URL ---- */
	.cc-window {
		position: relative;
		border: 2px solid var(--ink);
		border-radius: 999px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.15)),
			var(--paper-2);
		padding: 0.85rem 1.1rem 0.85rem 1.35rem;
		margin-bottom: 0.7rem;
		overflow: hidden;
	}
	.cc-pill {
		position: absolute;
		inset: 0;
		z-index: 0;
	}
	.cc-pill::before {
		/* red left cap of the capsule */
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 16%;
		min-width: 34px;
		background: linear-gradient(180deg, var(--red), var(--red-deep));
		border-right: 2px solid var(--ink);
	}
	.cc-pill::after {
		/* glass highlight sweep */
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			110deg,
			transparent 40%,
			rgba(255, 255, 255, 0.55) 48%,
			transparent 56%
		);
		opacity: 0.7;
	}
	.cc-url {
		position: relative;
		z-index: 1;
		font-family: var(--display);
		font-weight: 900;
		font-size: clamp(1.15rem, 4.4vw, 1.85rem);
		letter-spacing: -0.04em;
		line-height: 1.02;
		color: var(--ink);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: clip;
		padding-left: 3%;
		font-feature-settings: 'tnum' 1;
		text-shadow:
			0 1px 0 rgba(255, 255, 255, 0.75),
			0 0 3px rgba(255, 255, 255, 0.5);
	}

	.cc-sub {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem 0.6rem;
		font-size: 0.66rem;
		color: var(--ink-soft);
		letter-spacing: 0.02em;
		margin: 0 0 0.55rem;
	}
	.cc-sub .en {
		color: var(--cyan-ink);
		letter-spacing: 0.08em;
	}

	.cc-title {
		margin: 0 0 0.6rem;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--ink);
	}

	/* ---- meta chips ---- */
	.cc-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.85rem;
	}
	.cc-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1.5px solid var(--ink);
		background: var(--paper-2);
		padding: 0.28rem 0.55rem;
		font-family: var(--mono);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		line-height: 1;
	}
	.cc-tag.has-dot {
		color: var(--cyan-ink);
	}
	.cc-tag.is-expire {
		color: var(--red-deep);
		border-color: var(--red-deep);
	}

	/* ---- foot: barcode + serial ---- */
	.cc-foot {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.7rem;
		border-top: 1.5px dashed var(--line);
		padding-top: 0.6rem;
		min-height: 46px;
	}
	.cc-barcode {
		height: 22px;
		width: 96px;
		flex: none;
		background-image: repeating-linear-gradient(
			90deg,
			var(--ink) 0 1px,
			transparent 1px 3px,
			var(--ink) 3px 5px,
			transparent 5px 6px,
			var(--ink) 6px 9px,
			transparent 9px 12px
		);
	}
	.cc-serial {
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--muted);
		white-space: nowrap;
	}

	/* ---- seal stamp ---- */
	.cc-seal {
		position: relative;
		margin-left: auto;
		margin-top: -0.7rem;
		margin-bottom: -0.2rem;
		width: 60px;
		height: 60px;
		flex: none;
		color: var(--red);
		transform: rotate(-13deg);
		opacity: 0.92;
		z-index: 2;
		pointer-events: none;
	}
	.cc-seal svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.cc-seal-glyph {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: 2.5rem;
		font-weight: 900;
		color: var(--red);
		font-family: var(--sans);
	}

	/* ---- expired ---- */
	.cc.is-dead {
		filter: grayscale(0.85) contrast(0.9);
		opacity: 0.7;
	}
	.cc-void {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: 1.4rem;
		font-weight: 800;
		letter-spacing: 0.3em;
		color: var(--ink);
		background: repeating-linear-gradient(
			-45deg,
			rgba(20, 17, 15, 0.06) 0 12px,
			rgba(20, 17, 15, 0.12) 12px 24px
		);
		z-index: 3;
	}

	/* ---- seal-in entrance ---- */
	.cc.is-seal {
		animation: cc-pop 0.5s cubic-bezier(0.2, 0.9, 0.25, 1.15) both;
	}
	.cc.is-seal .cc-seal {
		animation: cc-stamp 0.5s cubic-bezier(0.3, 1.6, 0.5, 1) backwards;
	}
	.cc.is-seal .cc-url {
		animation: cc-url-in 0.4s ease backwards;
	}
	@keyframes cc-pop {
		from {
			transform: translateY(14px) scale(0.96) rotate(-0.6deg);
			opacity: 0;
			box-shadow: 0 0 0 var(--ink);
		}
		to {
			transform: none;
			opacity: 1;
			box-shadow: var(--shadow);
		}
	}
	@keyframes cc-stamp {
		0% {
			transform: rotate(-13deg) scale(2.4);
			opacity: 0;
		}
		60% {
			opacity: 1;
		}
		100% {
			transform: rotate(-13deg) scale(1);
			opacity: 0.92;
		}
	}
	@keyframes cc-url-in {
		from {
			opacity: 0;
			letter-spacing: 0.12em;
		}
		to {
			opacity: 1;
			letter-spacing: -0.03em;
		}
	}

	@media (max-width: 420px) {
		.cc-seal {
			width: 52px;
			height: 52px;
			margin-top: -0.4rem;
		}
		.cc-seal-glyph {
			font-size: 1.75rem;
		}
	}
</style>
