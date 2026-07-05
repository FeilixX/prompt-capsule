<script lang="ts">
	/* Shared "dead tape" scene — used by an expired /view capsule and by the
	   404 / error page. One illustration (VOID / 已过期 stamp baked in), one
	   copy line, one CTA. Keeps the two dead-ends visually identical. */
	import TapeCta from '$lib/components/TapeCta.svelte';

	interface Props {
		line: string;
		ctaLabel: string;
		ctaSub: string;
		ctaHref?: string;
		alt?: string;
	}
	let { line, ctaLabel, ctaSub, ctaHref = '/', alt = '一盘已过期的提示词卡带' }: Props = $props();
</script>

<div class="void-scene">
	<div class="void-hero">
		<img src="/sprites/n78/void-hero.png" {alt} />
	</div>
	<p class="void-line">{line}</p>
	<div class="void-cta">
		<TapeCta label={ctaLabel} sub={ctaSub} href={ctaHref} />
	</div>
</div>

<style>
	.void-scene {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.void-hero {
		width: min(680px, 100%);
	}
	.void-hero img {
		display: block;
		width: 100%;
		height: auto;
	}
	.void-line {
		margin: 1.2rem auto 1.4rem;
		max-width: 32ch;
		font-size: clamp(1rem, 3vw, 1.2rem);
		font-weight: 700;
		color: var(--ink-2);
		line-height: 1.6;
	}
	.void-cta {
		width: min(380px, 100%);
	}
</style>
