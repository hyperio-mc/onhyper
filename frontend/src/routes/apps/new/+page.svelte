<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let name = $state('');
	let html = $state('');
	let css = $state('');
	let js = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/apps', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${$auth.token}`
				},
				body: JSON.stringify({ name, html, css, js })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to create app');
			}

			goto(`/apps/${data.id}`);
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (!$auth.user) {
			goto('/login');
		}
	});
</script>

<Nav loggedIn />

<div class="min-h-[calc(100vh-4rem)] bg-background">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="mb-8">
			<a href="/apps" class="text-text-secondary hover:text-text text-sm mb-2 inline-block">
				← Back to Apps
			</a>
			<h1 class="text-2xl font-bold">Create New App</h1>
			<p class="text-text-secondary mt-1">Write HTML, CSS, and JavaScript for your app</p>
		</div>

		{#if error}
			<div class="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6 text-sm">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-6">
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

			<div class="flex gap-3">
				<Button type="submit" loading={loading}>
					Create App
				</Button>
				<Button type="button" variant="ghost" href="/apps">
					Cancel
				</Button>
			</div>
		</form>
	</div>
</div>