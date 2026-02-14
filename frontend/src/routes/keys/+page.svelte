<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Select from '$lib/components/Select.svelte';
	import Input from '$lib/components/Input.svelte';
	import { auth, type User } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	interface Secret {
		id: string;
		name: string;
		maskedValue: string;
		createdAt: string;
	}

	let secrets = $state<Secret[]>([]);
	let loading = $state(true);
	let showAddForm = $state(false);
	let newSecretName = $state('');
	let newSecretValue = $state('');
	let saving = $state(false);
	let error = $state('');

	const endpointOptions = [
		{ value: 'OPENAI_API_KEY', label: 'OpenAI' },
		{ value: 'ANTHROPIC_API_KEY', label: 'Anthropic' },
		{ value: 'SCOUT_API_KEY', label: 'Scout OS' },
		{ value: 'OLLAMA_API_KEY', label: 'Ollama' },
		{ value: 'OPENROUTER_API_KEY', label: 'OpenRouter' }
	];

	onMount(async () => {
		if (!$auth.user) {
			goto('/login');
			return;
		}
		await loadSecrets();
	});

	async function loadSecrets() {
		try {
			const res = await fetch('/api/secrets', {
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (res.ok) {
				secrets = await res.json();
			}
		} catch (err) {
			console.error('Failed to load secrets:', err);
		} finally {
			loading = false;
		}
	}

	async function handleAddSecret(e: Event) {
		e.preventDefault();
		error = '';
		saving = true;

		try {
			const res = await fetch('/api/secrets', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${$auth.token}`
				},
				body: JSON.stringify({
					name: newSecretName,
					value: newSecretValue
				})
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to add secret');
			}

			secrets.push(data);
			showAddForm = false;
			newSecretName = '';
			newSecretValue = '';
		} catch (err: any) {
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this API key?')) return;

		try {
			const res = await fetch(`/api/secrets/${id}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${$auth.token}`
				}
			});

			if (res.ok) {
				secrets = secrets.filter(s => s.id !== id);
			}
		} catch (err) {
			console.error('Failed to delete secret:', err);
		}
	}
</script>

<Nav loggedIn />

<div class="min-h-[calc(100vh-4rem)] bg-background">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-2xl font-bold">API Keys</h1>
				<p class="text-text-secondary mt-1">Manage your secrets for proxy endpoints</p>
			</div>
			<Button onclick={() => showAddForm = !showAddForm}>
				{showAddForm ? 'Cancel' : 'Add Key'}
			</Button>
		</div>

		{#if error}
			<div class="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6 text-sm">
				{error}
			</div>
		{/if}

		{#if showAddForm}
			<Card title="Add New API Key" class="mb-6">
				<form onsubmit={handleAddSecret} class="space-y-4">
					<Select
						name="endpoint"
						label="Service"
						options={endpointOptions}
						bind:value={newSecretName}
						placeholder="Select a service"
						required
					/>
					<Input
						name="apiKey"
						type="password"
						label="API Key"
						bind:value={newSecretValue}
						placeholder="sk_... or your API key"
						required
					/>
					<div class="flex gap-3 pt-2">
						<Button type="submit" loading={saving}>
							Save Key
						</Button>
						<Button type="button" variant="ghost" onclick={() => showAddForm = false}>
							Cancel
						</Button>
					</div>
				</form>
			</Card>
		{/if}

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
			</div>
		{:else if secrets.length === 0}
			<div class="bg-surface rounded-xl border border-border p-12 text-center">
				<div class="text-4xl mb-4">🔐</div>
				<h3 class="text-lg font-semibold mb-2">No API keys configured</h3>
				<p class="text-text-secondary mb-6">
					Add your first API key to start using proxy endpoints in your apps.
				</p>
				<Button onclick={() => showAddForm = true}>
					Add Your First Key
				</Button>
			</div>
		{:else}
			<div class="space-y-4">
				{#each secrets as secret}
					<div class="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
						<div>
							<div class="font-semibold">{secret.name}</div>
							<div class="text-sm text-text-muted font-mono">{secret.maskedValue}</div>
						</div>
						<Button 
							variant="ghost" 
							size="sm"
							onclick={() => handleDelete(secret.id)}
						>
							Delete
						</Button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Supported Endpoints -->
		<div class="mt-12">
			<h2 class="text-lg font-semibold mb-4">Supported Endpoints</h2>
			<div class="bg-surface rounded-xl border border-border overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-surface-alt border-b border-border">
						<tr>
							<th class="text-left px-4 py-3 font-semibold">Proxy Path</th>
							<th class="text-left px-4 py-3 font-semibold">Target API</th>
							<th class="text-left px-4 py-3 font-semibold">Required Key</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border-light">
						<tr>
							<td class="px-4 py-3 font-mono text-accent">/proxy/openai/*</td>
							<td class="px-4 py-3">OpenAI API</td>
							<td class="px-4 py-3 font-mono text-sm">OPENAI_API_KEY</td>
						</tr>
						<tr>
							<td class="px-4 py-3 font-mono text-accent">/proxy/anthropic/*</td>
							<td class="px-4 py-3">Anthropic API</td>
							<td class="px-4 py-3 font-mono text-sm">ANTHROPIC_API_KEY</td>
						</tr>
						<tr>
							<td class="px-4 py-3 font-mono text-accent">/proxy/scout-atoms/*</td>
							<td class="px-4 py-3">Scout OS Atoms</td>
							<td class="px-4 py-3 font-mono text-sm">SCOUT_API_KEY</td>
						</tr>
						<tr>
							<td class="px-4 py-3 font-mono text-accent">/proxy/ollama/*</td>
							<td class="px-4 py-3">Ollama API</td>
							<td class="px-4 py-3 font-mono text-sm">OLLAMA_API_KEY</td>
						</tr>
						<tr>
							<td class="px-4 py-3 font-mono text-accent">/proxy/openrouter/*</td>
							<td class="px-4 py-3">OpenRouter API</td>
							<td class="px-4 py-3 font-mono text-sm">OPENROUTER_API_KEY</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>