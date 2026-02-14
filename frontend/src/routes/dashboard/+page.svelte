<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let stats = $state({
		appCount: 0,
		requestCount: 0,
		keysConfigured: 0
	});
	let loading = $state(true);

	onMount(async () => {
		if (!$auth.user) {
			goto('/login');
			return;
		}

		try {
			const res = await fetch('/api/dashboard/stats', {
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (res.ok) {
				stats = await res.json();
			}
		} catch (err) {
			console.error('Failed to load stats:', err);
		} finally {
			loading = false;
		}
	});
</script>

<Nav loggedIn />

<div class="min-h-[calc(100vh-4rem)] bg-background">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="mb-8">
			<h1 class="text-2xl font-bold">Dashboard</h1>
			<p class="text-text-secondary mt-1">Welcome back, {$auth.user?.email}</p>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
			</div>
		{:else}
			<!-- Stats Grid -->
			<div class="grid md:grid-cols-3 gap-6 mb-8">
				<div class="bg-surface rounded-xl border border-border p-6">
					<div class="text-text-secondary text-sm mb-2">Published Apps</div>
					<div class="text-3xl font-bold text-accent">{stats.appCount}</div>
				</div>
				<div class="bg-surface rounded-xl border border-border p-6">
					<div class="text-text-secondary text-sm mb-2">API Requests Today</div>
					<div class="text-3xl font-bold">{stats.requestCount}</div>
				</div>
				<div class="bg-surface rounded-xl border border-border p-6">
					<div class="text-text-secondary text-sm mb-2">API Keys Configured</div>
					<div class="text-3xl font-bold">{stats.keysConfigured}</div>
				</div>
			</div>

			<!-- Quick Actions -->
			<h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
			<div class="grid md:grid-cols-2 gap-6">
				<Card title="Create New App" subtitle="Build and publish a new app">
					<p class="text-text-secondary mb-4">
						Write HTML/CSS/JS and get a live URL instantly. Your app can use proxy endpoints to call external APIs securely.
					</p>
					<Button href="/apps/new">
						Create App →
					</Button>
				</Card>

				<Card title="Add API Key" subtitle="Configure a new secret">
					<p class="text-text-secondary mb-4">
						Add an API key for OpenAI, Anthropic, or other supported services. Keys are encrypted and never exposed to the browser.
					</p>
					<Button href="/keys" variant="secondary">
						Manage Keys →
					</Button>
				</Card>
			</div>

			<!-- Getting Started -->
			<div class="mt-8">
				<h2 class="text-lg font-semibold mb-4">Getting Started</h2>
				<div class="bg-surface rounded-xl border border-border p-6">
					<ol class="space-y-4">
						<li class="flex items-start gap-3">
							<span class="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-semibold shrink-0">1</span>
							<div>
								<strong>Add your API keys</strong>
								<p class="text-text-secondary text-sm">Go to API Keys and add your secrets for the services you want to use.</p>
							</div>
						</li>
						<li class="flex items-start gap-3">
							<span class="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-semibold shrink-0">2</span>
							<div>
								<strong>Create an app</strong>
								<p class="text-text-secondary text-sm">Build your app using our editor. Use proxy endpoints like <code class="bg-surface-alt px-1 py-0.5 rounded text-sm">/proxy/openai/...</code> to call APIs.</p>
							</div>
						</li>
						<li class="flex items-start gap-3">
							<span class="w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-semibold shrink-0">3</span>
							<div>
								<strong>Publish & share</strong>
								<p class="text-text-secondary text-sm">Get a live URL and share your app. All API calls go through our secure proxy.</p>
							</div>
						</li>
					</ol>
				</div>
			</div>
		{/if}
	</div>
</div>