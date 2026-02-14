import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true
			},
			'/a/': {
				target: 'http://localhost:3000',
				changeOrigin: true
			},
			'/proxy': {
				target: 'http://localhost:3000',
				changeOrigin: true
			}
		}
	}
});