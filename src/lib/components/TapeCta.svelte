<script lang="ts">
	/* The one red "make a tape" button, shared by /view, the expired page and 404.
	   Carries the brand cassette icon (on a cream tile so it reads on red) with a
	   centered CN label + arrow over a pixel-font latin sub-label. */
	interface Props {
		label: string;
		sub: string;
		href?: string;
	}
	let { label, sub, href = '/' }: Props = $props();
</script>

<a class="tape-cta" {href}>
	<span class="cta-main">
		<span class="cta-ico"><img src="/sprites/n78/tape-icon.png" alt="" /></span>
		<span class="cta-cn">{label}</span>
		<span class="cta-arw px">→</span>
	</span>
	<span class="cta-sub px">{sub}</span>
</a>

<style>
	.tape-cta {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.36rem;
		width: 100%;
		border: 2.5px solid var(--red-deep);
		border-radius: var(--radius);
		background: var(--red);
		color: #fff;
		padding: 0.85rem 1.4rem;
		text-decoration: none;
		box-shadow: 0 5px 0 var(--red-deep);
		transition:
			transform 0.05s ease,
			box-shadow 0.05s ease,
			filter 0.12s ease;
	}
	.tape-cta:hover {
		filter: brightness(1.04);
	}
	.tape-cta:active {
		transform: translateY(4px);
		box-shadow: 0 1px 0 var(--red-deep);
	}
	.tape-cta:focus-visible {
		outline: 3px solid var(--teal);
		outline-offset: 2px;
	}
	.cta-main {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		line-height: 1;
	}
	.cta-ico {
		display: inline-grid;
		place-items: center;
		flex: none;
		background: var(--cream-lit);
		border: 2px solid #12100e;
		border-radius: 6px;
		padding: 3px 5px;
	}
	.cta-ico img {
		display: block;
		width: 26px;
		height: auto;
	}
	.cta-cn {
		font-weight: 800;
		font-size: 1.32rem;
	}
	.cta-arw {
		font-size: 1.12rem;
	}
	.cta-sub {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		opacity: 0.92;
		text-align: center;
	}
</style>
