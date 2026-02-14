<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		loading = true;

		try {
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Signup failed');
			}

			auth.login(data.user, data.token);
			goto('/dashboard');
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<Nav />

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-background">
	<div class="w-full max-w-md">
		<div class="bg-surface rounded-2xl border border-border p-8">
			<h1 class="text-2xl font-bold text-center mb-2">Create your account</h1>
			<p class="text-text-secondary text-center mb-8">Start publishing secure apps today</p>

			{#if error}
				<div class="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6 text-sm">
					{error}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-5">
				<Input
					name="email"
					type="email"
					label="Email"
					bind:value={email}
					placeholder="you@example.com"
					required
				/>
				<Input
					name="password"
					type="password"
					label="Password"
					bind:value={password}
					placeholder="At least 8 characters"
					required
				/>
				<Input
					name="confirmPassword"
					type="password"
					label="Confirm Password"
					bind:value={confirmPassword}
					placeholder="Confirm your password"
					required
				/>
				<Button type="submit" loading={loading} class="w-full">
					Create Account
				</Button>
			</form>

			<p class="text-center text-sm text-text-secondary mt-6">
				Already have an account? 
				<a href="/login" class="text-accent hover:underline">Log in</a>
			</p>
		</div>
	</div>
</div>