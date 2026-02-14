<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { page } from '$app/stores';

	interface Props {
		loggedIn?: boolean;
	}

	let { loggedIn = false }: Props = $props();

	function handleLogout() {
		auth.logout();
		window.location.href = '/';
	}
</script>

<nav class="bg-surface border-b border-border sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2">
				<div class="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
					<span class="text-white font-bold text-lg">H</span>
				</div>
				<span class="font-bold text-xl text-text">OnHyper</span>
			</a>

			{#if loggedIn && $auth.user}
				<!-- Authenticated Nav -->
				<div class="flex items-center gap-6">
					<a 
						href="/dashboard" 
						class="text-sm font-medium {$page.url.pathname === '/dashboard' ? 'text-accent' : 'text-text-secondary hover:text-text'}"
					>
						Dashboard
					</a>
					<a 
						href="/apps" 
						class="text-sm font-medium {$page.url.pathname.startsWith('/apps') ? 'text-accent' : 'text-text-secondary hover:text-text'}"
					>
						Apps
					</a>
					<a 
						href="/keys" 
						class="text-sm font-medium {$page.url.pathname === '/keys' ? 'text-accent' : 'text-text-secondary hover:text-text'}"
					>
						API Keys
					</a>
					<div class="flex items-center gap-3 ml-4 pl-4 border-l border-border">
						<span class="text-sm text-text-secondary">{$auth.user.email}</span>
						<button 
							onclick={handleLogout}
							class="text-sm text-text-muted hover:text-text-secondary"
						>
							Logout
						</button>
					</div>
				</div>
			{:else}
				<!-- Public Nav -->
				<div class="flex items-center gap-4">
					<a 
						href="/login" 
						class="text-sm font-medium text-text-secondary hover:text-text"
					>
						Login
					</a>
					<a 
						href="/signup" 
						class="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
					>
						Get Started
					</a>
				</div>
			{/if}
		</div>
	</div>
</nav>