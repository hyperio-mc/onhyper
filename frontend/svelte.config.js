import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Use adapter-static to build as static files served by Hono backend
		adapter: adapter({
			// Precompress files for faster serving
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // SPA fallback for client-side routing
			precompress: true,
			strict: false // Don't error on pages not found during crawling (SPA will handle them)
		}),
		// Prerender all pages for static hosting
		prerender: {
			entries: ['*'] // Prerender all reachable routes
		}
	}
};

export default config;
