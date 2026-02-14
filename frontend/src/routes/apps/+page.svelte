<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	interface App {
		id: string;
		name: string;
		slug: string;
		createdAt: string;
		updatedAt: string;
	}

	let apps = $state<App[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		if (!$auth.user) {
			goto('/login');
			return;
		}

		try {
			const res = await fetch('/api/apps', {
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (res.ok) {
				const data = await res.json();
				apps = data.apps || [];
			} else {
				throw new Error('Failed to load apps');
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<Nav loggedIn />

<div class="min-h-[calc(100vh-4rem)] bg-background">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-2xl font-bold">My Apps</h1>
				<p class="text-text-secondary mt-1">Manage your published apps</p>
			</div>
			<Button href="/apps/new">
				Create App →
			</Button>
		</div>

		{#if error}
			<div class="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6 text-sm">
				{error}
			</div>
		{/if}

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
			</div>
		{:else if apps.length === 0}
			<div class="bg-surface rounded-xl border border-border p-12 text-center">
				<div class="text-4xl mb-4">🚀</div>
				<h3 class="text-lg font-semibold mb-2">No apps yet</h3>
				<p class="text-text-secondary mb-6">
					Create your first app to get started. Write HTML/CSS/JS and publish instantly.
				</p>
				<Button href="/apps/new">
					Create Your First App
				</Button>
			</div>
		{:else}
			<div class="space-y-4">
				{#each apps as app}
					<a 
						href="/apps/{app.id}" 
						class="block bg-surface rounded-xl border border-border p-5 hover:border-accent/50 transition-colors"
					>
						<div class="flex items-start justify-between">
							<div>
								<h3 class="text-lg font-semibold">{app.name}</h3>
								<p class="text-text-secondary text-sm mt-1">
									<code class="bg-surface-alt px-1.5 py-0.5 rounded">/a/{app.slug}</code>
								</p>
							</div>
						</div>
						<div class="flex items-center gap-6 mt-4 text-sm text-text-secondary">
							<span>Created {formatDate(app.createdAt)}</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>