<script lang="ts">
	/* Tiny hand-rolled confetti. No deps.
	   Bump `key` (a monotonically increasing number) to fire a burst. */
	interface Props {
		key: number;
	}
	let { key }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let lastKey = 0;

	const COLORS = ['#cf2029', '#14b1a1', '#14110f', '#f2e8d6', '#e8b23a'];

	interface P {
		x: number;
		y: number;
		vx: number;
		vy: number;
		rot: number;
		vr: number;
		w: number;
		h: number;
		color: string;
		life: number;
	}

	function fire() {
		if (!canvas) return;
		if (
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
		) {
			return;
		}
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const W = window.innerWidth;
		const H = window.innerHeight;
		canvas.width = W * dpr;
		canvas.height = H * dpr;
		canvas.style.width = W + 'px';
		canvas.style.height = H + 'px';
		ctx.scale(dpr, dpr);

		const originX = W / 2;
		const originY = Math.min(H * 0.42, 320);
		const count = W < 640 ? 70 : 110;
		const parts: P[] = [];
		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * (0.15 + Math.random() * 0.7)) - Math.PI / 2; // upward fan
			const speed = 5 + Math.random() * 11;
			parts.push({
				x: originX + (Math.random() - 0.5) * 120,
				y: originY,
				vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1) * 0.6 + (Math.random() - 0.5) * 4,
				vy: Math.sin(angle) * speed - 2,
				rot: Math.random() * Math.PI,
				vr: (Math.random() - 0.5) * 0.4,
				w: 6 + Math.random() * 7,
				h: 4 + Math.random() * 6,
				color: COLORS[(Math.random() * COLORS.length) | 0],
				life: 1
			});
		}

		let raf = 0;
		const gravity = 0.32;
		function frame() {
			ctx!.clearRect(0, 0, W, H);
			let alive = false;
			for (const p of parts) {
				if (p.life <= 0) continue;
				p.vy += gravity;
				p.vx *= 0.99;
				p.x += p.vx;
				p.y += p.vy;
				p.rot += p.vr;
				p.life -= 0.011;
				if (p.y > H + 40) p.life = 0;
				if (p.life <= 0) continue;
				alive = true;
				ctx!.save();
				ctx!.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
				ctx!.translate(p.x, p.y);
				ctx!.rotate(p.rot);
				ctx!.fillStyle = p.color;
				ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				ctx!.restore();
			}
			if (alive) {
				raf = requestAnimationFrame(frame);
			} else {
				ctx!.clearRect(0, 0, W, H);
				cancelAnimationFrame(raf);
			}
		}
		frame();
	}

	$effect(() => {
		if (key > lastKey) {
			lastKey = key;
			fire();
		}
	});
</script>

<canvas bind:this={canvas} class="confetti" aria-hidden="true"></canvas>

<style>
	.confetti {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 60;
	}
</style>
