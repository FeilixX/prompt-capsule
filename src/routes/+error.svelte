<script lang="ts">
	import { page } from '$app/state';
	import VoidScene from '$lib/components/VoidScene.svelte';
	import { tFor } from '$lib/locale';

	const t = $derived(tFor(page.data.locale));
	const status = $derived(page.status);
	const line = $derived(status === 404 ? t('e404_line') : (page.error?.message ?? t('e404_line')));
</script>

<svelte:head>
	<title>{status} · {t('brand_name')}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="page">
	<VoidScene {line} ctaLabel={t('e404_cta')} ctaSub="HOME" ctaHref="/" alt={t('alt_404')} />
</main>

<style>
	.page {
		width: min(760px, 100%);
		margin: 0 auto;
		padding: clamp(1.6rem, 5vw, 3rem) clamp(1rem, 4vw, 2rem) 3rem;
	}
</style>
