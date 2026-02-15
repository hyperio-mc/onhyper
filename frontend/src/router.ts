/**
 * Simple client-side router for OnHyper
 * Replaces SvelteKit's $app/stores and $app/navigation
 */

import { writable, derived, get } from 'svelte/store';

// Current route state
export const pathname = writable(window.location.pathname);
export const search = writable(window.location.search);
export const hash = writable(window.location.hash);

// Full URL object
export const url = derived(
	[pathname, search, hash],
	([$pathname, $search, $hash]) => {
		const fullUrl = new URL(
			$pathname + $search + $hash,
			window.location.origin
		);
		return fullUrl;
	}
);

// Route params (for dynamic routes like /apps/[id])
export const params = writable<Record<string, string>>({});

// Current matched page component
export const currentPage = writable<any>(null);

// Initialize router
export function initRouter() {
	// Handle browser navigation (back/forward)
	window.addEventListener('popstate', () => {
		pathname.set(window.location.pathname);
		search.set(window.location.search);
		hash.set(window.location.hash);
	});

	// Handle clicks on internal links
	document.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		const anchor = target.closest('a');
		
		if (anchor && anchor.href && isInternalLink(anchor.href)) {
			// Skip if target="_blank" or has download attribute
			if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
				return;
			}
			
			// Skip if modifier key pressed (open in new tab, etc.)
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
				return;
			}
			
			e.preventDefault();
			const newUrl = new URL(anchor.href);
			goto(newUrl.pathname + newUrl.search + newUrl.hash);
		}
	});

	// Handle initial route
	matchRoute(window.location.pathname);
}

// Check if a URL is an internal link
function isInternalLink(href: string): boolean {
	try {
		const url = new URL(href, window.location.origin);
		return url.origin === window.location.origin;
	} catch {
		return false;
	}
}

// Navigate to a new URL
export function goto(href: string, options?: { replaceState?: boolean }) {
	const url = new URL(href, window.location.origin);
	
	if (url.pathname !== get(pathname)) {
		pathname.set(url.pathname);
		search.set(url.search);
		hash.set(url.hash);
		matchRoute(url.pathname);
	}
	
	if (options?.replaceState) {
		window.history.replaceState({}, '', href);
	} else {
		window.history.pushState({}, '', href);
	}
	
	// Scroll to top on navigation
	window.scrollTo(0, 0);
}

// Go back
export function goBack() {
	window.history.back();
}

// Match the current pathname to a route
function matchRoute(path: string) {
	// Extract params for dynamic routes
	const paramMatch: Record<string, string> = {};
	
	// Check for /apps/[id] pattern
	const appsIdMatch = path.match(/^\/apps\/([^/]+)$/);
	if (appsIdMatch) {
		paramMatch.id = appsIdMatch[1];
	}
	
	params.set(paramMatch);
}

// Parse search params
export function getSearchParams(): URLSearchParams {
	return new URLSearchParams(get(search));
}

// Get a single search param
export function getSearchParam(name: string): string | null {
	return getSearchParams().get(name);
}