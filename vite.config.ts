import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Self-hosted on 阿里云北京 behind Caddy; prod server runs under Bun (`bun ./build/index.js`).
// adapter-node output is Bun-compatible; Gate 0 verifies build + boot.
export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	// bun:sqlite (and any bun: builtin) is a Bun runtime module — never bundle it.
	// Left external so Bun resolves it at runtime (dev, build, and prod all run under Bun).
	ssr: { external: ['bun:sqlite'] },
	build: { rollupOptions: { external: [/^bun:/] } }
});
