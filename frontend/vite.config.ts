import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(),
		svelte()
	],
	resolve: {
		alias: {
			$lib: resolve('./src/lib')
		}
	},
	build: {
		outDir: 'dist',
		emptyDirBeforeWrite: true,
		// SPA fallback for client-side routing
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html')
			}
		}
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true
			},
			'/a/': {
				target: 'http://localhost:3001',
				changeOrigin: true
			},
			'/proxy': {
				target: 'http://localhost:3001',
				changeOrigin: true
			}
		}
	}
});