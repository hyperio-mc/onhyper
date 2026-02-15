import type { Handle } from '@sveltejs/kit';

// Backend server URL (running on port 3001)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Routes that should be proxied to the backend
const PROXIED_ROUTES = ['/api', '/proxy', '/a', '/health', '/unsubscribe'];

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request } = event;
	const path = url.pathname;

	// Check if this route should be proxied to backend
	const shouldProxy = PROXIED_ROUTES.some(route => path.startsWith(route));

	if (shouldProxy) {
		try {
			// Forward the request to the backend
			const backendRequest = new Request(`${BACKEND_URL}${path}${url.search}`, {
				method: request.method,
				headers: request.headers,
				body: request.body,
				duplex: 'half'
			});

			const response = await fetch(backendRequest);

			// Return the backend response directly
			return response;
		} catch (error) {
			console.error('Proxy error:', error);
			return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	// For all other routes, let SvelteKit handle them
	return resolve(event);
};