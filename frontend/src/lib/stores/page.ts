/**
 * Page store - replaces SvelteKit's $app/stores page store
 */

import { derived, get } from 'svelte/store';
import { pathname, search, hash, url, params } from '../../router';

// Create a page store object that matches SvelteKit's interface
export const page = derived(
	[pathname, search, hash, params, url],
	([$pathname, $search, $hash, $params, $url]) => ({
		url: $url,
		pathname: $pathname,
		search: $search,
		hash: $hash,
		params: $params,
		// Route info (minimal for our use case)
		route: {
			id: $pathname
		},
		// Status and error (minimal for our use case)
		status: 200,
		error: null,
		data: {},
		state: {},
		form: undefined
	})
);

// Re-export url for convenience
export { url };