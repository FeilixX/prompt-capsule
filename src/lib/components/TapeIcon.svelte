<script lang="ts">
	/* Brand cassette mark — the same 8bit cassette as the hero, shrunk.
	   Uses the illustrated sprite so the mark matches the world exactly. */
	interface Props {
		size?: number;
	}
	let { size = 34 }: Props = $props();
</script>

<img
	class="tape-icon"
	src="/sprites/n78/tape-icon.png"
	alt=""
	aria-hidden="true"
	width={size}
	style="height:auto"
/>

<style>
	.tape-icon {
		display: block;
		flex: none;
		user-select: none;
		-webkit-user-drag: none;
	}
</style>
