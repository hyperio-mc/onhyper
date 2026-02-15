<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { pathname } from '../../router';

	interface Props {
		loggedIn?: boolean;
	}

	let { loggedIn = false }: Props = $props();

	function handleLogout() {
		auth.logout();
		window.location.href = '/';
	}

	// Reactive variable to track current path
	let currentPathname = $state('/');

	// Subscribe to the pathname store
	$effect(() => {
		const unsub = pathname.subscribe((value) => {
			currentPathname = value;
		});
		return unsub;
	});
</script>

<nav class="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2 group">
				<div class="w-8 h-8 bg-gradient-to-br from-accent to-cyan-500 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
					<span class="text-white font-bold text-lg">H</span>
				</div>
				<span class="font-bold text-xl text-text">OnHyper</span>
			</a>

			{#if loggedIn && $auth.user}
				<!-- Authenticated Nav -->
				<div class="flex items-center gap-6">
					<a 
						href="/dashboard" 
						class="text-sm font-medium {currentPathname === '/dashboard' ? 'text-accent' : 'text-text-secondary hover:text-text'} transition-colors"
					>
						Dashboard
					</a>
					<a 
						href="/apps" 
						class="text-sm font-medium {currentPathname.startsWith('/apps') ? 'text-accent' : 'text-text-secondary hover:text-text'} transition-colors"
					>
						Apps
					</a>
					<a 
						href="/keys" 
						class="text-sm font-medium {currentPathname === '/keys' ? 'text-accent' : 'text-text-secondary hover:text-text'} transition-colors"
					>
						API Keys
					</a>
					<div class="flex items-center gap-3 ml-4 pl-4 border-l border-border">
						<span class="text-sm text-text-secondary">{$auth.user.email}</span>
						<button 
							onclick={handleLogout}
							class="text-sm text-text-muted hover:text-accent transition-colors"
						>
							Logout
						</button>
					</div>
				</div>
			{:else}
				<!-- Public Nav -->
				<div class="flex items-center gap-4">
					<a 
						href="/docs" 
						class="text-sm font-medium text-text-secondary hover:text-text transition-colors hidden sm:block"
					>
						Docs
					</a>
					<a 
						href="/login" 
						class="text-sm font-medium text-text-secondary hover:text-text transition-colors"
					>
						Login
					</a>
					<a 
						href="/signup" 
						class="px-4 py-2 bg-gradient-to-r from-accent to-accent-hover text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-accent/20 transition-all"
					>
						Get Started
					</a>
				</div>
			{/if}
		</div>
	</div>
</nav>