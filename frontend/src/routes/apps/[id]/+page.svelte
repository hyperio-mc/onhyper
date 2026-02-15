<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import { auth } from '$lib/stores/auth';
	import { trackAppViewed } from '$lib/analytics';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	interface App {
		id: string;
		name: string;
		slug: string;
		html: string;
		css: string;
		js: string;
		url: string;
		createdAt: string;
		updatedAt: string;
	}

	let app = $state<App | null>(null);
	let name = $state('');
	let html = $state('');
	let css = $state('');
	let js = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let error = $state('');
	let success = $state('');
	let trackedView = $state(false);

	onMount(async () => {
		if (!$auth.user) {
			goto('/login');
			return;
		}

		const appId = $page.params.id;

		try {
			const res = await fetch(`/api/apps/${appId}`, {
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (!res.ok) {
				throw new Error('App not found');
			}

			const fetchedApp = await res.json() as App;
			app = fetchedApp;
			name = fetchedApp.name;
			html = fetchedApp.html || '';
			css = fetchedApp.css || '';
			js = fetchedApp.js || '';
			
			// Track app viewed (only once per session)
			if (!trackedView) {
				trackAppViewed({
					appId: fetchedApp.id,
					appName: fetchedApp.name,
				});
				trackedView = true;
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	async function handleSave() {
		error = '';
		success = '';
		saving = true;

		try {
			const res = await fetch(`/api/apps/${app?.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${$auth.token}`
				},
				body: JSON.stringify({ name, html, css, js })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to save app');
			}

			app = { ...app, ...data };
			success = 'App saved successfully!';
			setTimeout(() => (success = ''), 3000);
		} catch (err: any) {
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this app? This cannot be undone.')) return;

		deleting = true;
		try {
			const res = await fetch(`/api/apps/${app?.id}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (res.ok) {
				goto('/apps');
			} else {
				throw new Error('Failed to delete app');
			}
		} catch (err: any) {
			error = err.message;
			deleting = false;
		}
	}
</script>

<Nav loggedIn />

<div class="min-h-[calc(100vh-4rem)] bg-background">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
			</div>
		{:else if !app}
			<div class="text-center py-12">
				<h2 class="text-xl font-semibold mb-2">App not found</h2>
				<p class="text-text-secondary mb-4">The app you're looking for doesn't exist or you don't have access.</p>
				<Button href="/apps">Back to Apps</Button>
			</div>
		{:else}
			<div class="mb-8">
				<a href="/apps" class="text-text-secondary hover:text-text text-sm mb-2 inline-block">
					← Back to Apps
				</a>
				<div class="flex items-start justify-between">
					<div>
						<h1 class="text-2xl font-bold">{app.name}</h1>
						<p class="text-text-secondary mt-1">
							<code class="bg-surface-alt px-1.5 py-0.5 rounded">/a/{app.slug}</code>
						</p>
					</div>
					<div class="flex gap-2">
						<Button 
							variant="secondary" 
							href="/a/{app.slug}"
							target="_blank"
						>
							Preview ↗
						</Button>
					</div>
				</div>
			</div>

			{#if error}
				<div class="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6 text-sm">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg mb-6 text-sm">
					{success}
				</div>
			{/if}

			<div class="space-y-6">
				<Input
					name="name"
					label="App Name"
					bind:value={name}
					placeholder="My Awesome App"
					required
				/>

				<Textarea
					name="html"
					label="HTML"
					bind:value={html}
					placeholder="<div id='app'>Hello World</div>"
					rows={8}
				/>

				<Textarea
					name="css"
					label="CSS"
					bind:value={css}
					placeholder="#app &#123; font-family: sans-serif; &#125;"
					rows={6}
				/>

				<Textarea
					name="js"
					label="JavaScript"
					bind:value={js}
					placeholder="fetch('/proxy/openai/chat/completions', &#123; ... &#125;);"
					rows={8}
				/>

				<div class="bg-surface-alt rounded-lg p-4 text-sm">
					<strong class="text-text">💡 Tips:</strong>
					<ul class="mt-2 space-y-1 text-text-secondary">
						<li>• Use proxy endpoints like <code class="bg-surface px-1 py-0.5 rounded">/proxy/openai/chat/completions</code></li>
						<li>• Your API keys are injected server-side - never exposed to the browser</li>
						<li>• CSS is scoped to your app automatically</li>
					</ul>
				</div>

				<div class="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
					<Button onclick={handleSave} loading={saving}>
						Save Changes
					</Button>
					<Button 
						variant="ghost"
						onclick={() => {
							if (confirm('Are you sure you want to delete this app? This cannot be undone.')) {
								handleDelete();
							}
						}
					}>
						Delete App
					</Button>
				</div>

				<div class="bg-surface rounded-lg border border-border p-4">
					<strong class="text-text">🌐 Your app is available at:</strong>
					<div class="mt-2 flex items-center gap-2">
						<code class="bg-surface-alt px-3 py-2 rounded text-sm flex-1 overflow-x-auto">
							{app.url}
						</code>
						<Button 
							variant="ghost" 
							size="sm"
							onclick={() => navigator.clipboard.writeText(app?.url || '')}
						>
							Copy
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>