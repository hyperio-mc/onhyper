/**
 * Navigation utilities - replaces SvelteKit's $app/navigation
 */

import { goto as routerGoto } from '../router';

/**
 * Navigate to a URL (client-side navigation)
 */
export function goto(href: string, options?: { replaceState?: boolean }) {
	routerGoto(href, options);
}

/**
 * Invalidate the current page (fetch fresh data)
 * In plain Vite, this just reloads the current page
 */
export function invalidate(url?: string) {
	// For SPA, just reload
	window.location.reload();
}

/**
 * Invalidate all data
 */
export function invalidateAll() {
	window.location.reload();
}