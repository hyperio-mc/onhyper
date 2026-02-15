<script lang="ts">
	import { onMount } from 'svelte';
	import { pathname, params } from './router';
	import { initAnalytics } from '$lib/analytics';
	
	// Import all page components
	import HomePage from './pages/+page.svelte';
	import LoginPage from './pages/login/+page.svelte';
	import SignupPage from './pages/signup/+page.svelte';
	import DashboardPage from './pages/dashboard/+page.svelte';
	import AppsPage from './pages/apps/+page.svelte';
	import AppNewPage from './pages/apps/new/+page.svelte';
	import AppDetailPage from './pages/apps/[id]/+page.svelte';
	import KeysPage from './pages/keys/+page.svelte';
	import WaitlistPage from './pages/waitlist/+page.svelte';
	import AdminWaitlistPage from './pages/admin/waitlist/+page.svelte';
	import PrivacyPage from './pages/legal/privacy/+page.svelte';
	import TermsPage from './pages/legal/terms/+page.svelte';
	
	// Route mapping
	const routes: Record<string, any> = {
		'/': HomePage,
		'/login': LoginPage,
		'/signup': SignupPage,
		'/dashboard': DashboardPage,
		'/apps': AppsPage,
		'/apps/new': AppNewPage,
		'/apps/[id]': AppDetailPage,
		'/keys': KeysPage,
		'/waitlist': WaitlistPage,
		'/admin/waitlist': AdminWaitlistPage,
		'/legal/privacy': PrivacyPage,
		'/legal/terms': TermsPage
	};
	
	// Current page component
	let Page = $state<any>(HomePage);
	let routeParams = $state<Record<string, string>>({});
	
	// Track current path
	let currentPath = $state('/');
	
	// Initialize analytics on mount
	onMount(() => {
		initAnalytics();
	});
	
	// Subscribe to the router stores
	$effect(() => {
		const unsubPath = pathname.subscribe((value) => {
			currentPath = value;
		});
		const unsubParams = params.subscribe((value) => {
			routeParams = value;
		});
		return () => {
			unsubPath();
			unsubParams();
		};
	});

	// React to route changes
	$effect(() => {
		const path = currentPath;
		
		// Check for dynamic routes first
		// /apps/[id] pattern
		if (path.startsWith('/apps/') && path !== '/apps/new' && path !== '/apps') {
			const parts = path.split('/');
			const id = parts[2];
			if (id) {
				routeParams = { id };
				Page = routes['/apps/[id]'];
				return;
			}
		}
		
		// Exact route match
		if (routes[path]) {
			routeParams = {};
			Page = routes[path];
		} else {
			// Fallback to home page (SPA behavior)
			routeParams = {};
			Page = HomePage;
		}
	});
</script>

{#if Page}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	{#key currentPath}
		<Page params={routeParams} />
	{/key}
{/if}