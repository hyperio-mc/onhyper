import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Use adapter-node for server-side rendering
		// Runs as Node.js server, proxied through Hono backend
		adapter: adapter({
			// Output to build/ directory
			out: 'build'
		})
	}
};

export default config;
