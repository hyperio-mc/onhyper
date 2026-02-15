import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Use adapter-node for deployment to Railway and other Node.js hosting
		adapter: adapter({
			// Precompress files for faster serving
			precompress: true
		})
	}
};

export default config;
