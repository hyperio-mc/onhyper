<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import { onMount } from 'svelte';

	// State
	let isLoading = $state(true);
	let entries = $state<any[]>([]);
	let stats = $state({ total: 0, pending: 0, approved: 0, rejected: 0 });
	let pagination = $state({ page: 1, totalPages: 1, total: 0 });

	// Filters
	let statusFilter = $state('pending');
	let page = $state(1);
	const limit = 20;

	// Modal state
	let selectedEntry = $state<any | null>(null);
	let showInviteModal = $state(false);
	let newInvites = $state<string[]>([]);
	let isGeneratingInvites = $state(false);
	let inviteTier = $state('access');
	let inviteCount = $state(5);

	// Invite codes list
	let invites = $state<any[]>([]);
	let showInvitesList = $state(false);

	// Auth check - simple admin token
	let isAdmin = $state(false);
	let adminToken = $state('');

	onMount(async () => {
		// Check for admin token
		const stored = localStorage.getItem('adminToken');
		if (stored) {
			adminToken = stored;
			isAdmin = true;
			await loadData();
		}
	});

	async function login() {
		// Simple token check - in production, use real auth
		if (adminToken === 'onhyper-admin-2024' || adminToken.length > 10) {
			localStorage.setItem('adminToken', adminToken);
			isAdmin = true;
			await loadData();
		} else {
			alert('Invalid admin token');
		}
	}

	function logout() {
		localStorage.removeItem('adminToken');
		isAdmin = false;
		adminToken = '';
	}

	async function loadData() {
		isLoading = true;
		try {
			// Load entries
			const res = await fetch(`/api/waitlist/admin/all?status=${statusFilter}&page=${page}&limit=${limit}`);
			if (res.ok) {
				const data = await res.json();
				entries = data.entries;
				pagination = data.pagination;
			}

			// Load stats
			const statsRes = await fetch('/api/waitlist/stats');
			if (statsRes.ok) {
				stats = await statsRes.json();
			}
		} catch (e) {
			console.error('Failed to load data', e);
		}
		isLoading = false;
	}

	async function loadInvites() {
		try {
			const res = await fetch('/api/waitlist/admin/invites');
			if (res.ok) {
				const data = await res.json();
				invites = data.invites;
			}
		} catch (e) {
			console.error('Failed to load invites', e);
		}
	}

	async function approveEntry(id: string) {
		try {
			const res = await fetch(`/api/waitlist/admin/${id}/approve`, { method: 'POST' });
			if (res.ok) {
				await loadData();
				selectedEntry = null;
			}
		} catch (e) {
			console.error('Failed to approve', e);
		}
	}

	async function rejectEntry(id: string) {
		try {
			const res = await fetch(`/api/waitlist/admin/${id}/reject`, { method: 'POST' });
			if (res.ok) {
				await loadData();
				selectedEntry = null;
			}
		} catch (e) {
			console.error('Failed to reject', e);
		}
	}

	async function generateInvites() {
		isGeneratingInvites = true;
		try {
			const res = await fetch('/api/waitlist/admin/generate-invites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					count: inviteCount,
					tier: inviteTier
				})
			});
			if (res.ok) {
				const data = await res.json();
				newInvites = data.codes;
				await loadInvites();
			}
		} catch (e) {
			console.error('Failed to generate invites', e);
		}
		isGeneratingInvites = false;
	}

	function copyCode(code: string) {
		navigator.clipboard.writeText(code);
	}

	// Watch for filter changes
	$effect(() => {
		if (isAdmin) {
			page = 1;
			loadData();
		}
	});

	$effect(() => {
		if (isAdmin && page) {
			loadData();
		}
	});

	// Format date
	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Get score color
	function getScoreColor(score: number) {
		if (score >= 8) return 'text-green-600 bg-green-50';
		if (score >= 5) return 'text-yellow-600 bg-yellow-50';
		return 'text-red-600 bg-red-50';
	}
</script>

<svelte:head>
	<title>Admin Dashboard — OnHyper</title>
</svelte:head>

{#if !isAdmin}
	<!-- Login Screen -->
	<div class="min-h-screen bg-background flex items-center justify-center px-6">
		<Card title="Admin Login">
			<p class="text-text-secondary text-sm mb-4">
				Enter your admin token to access the waitlist dashboard.
			</p>
			<form onsubmit={(e) => { e.preventDefault(); login(); }}>
				<input
					type="password"
					bind:value={adminToken}
					placeholder="Admin token"
					class="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
				/>
				<div class="mt-4">
					<Button type="submit">
						Login
					</Button>
				</div>
			</form>
		</Card>
	</div>
{:else}
	<Nav />

	<div class="max-w-7xl mx-auto px-6 py-8">
		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-2xl font-bold">Waitlist Admin</h1>
				<p class="text-text-muted text-sm">Review and manage applications</p>
			</div>
			<div class="flex gap-3">
				<Button onclick={() => { showInviteModal = true; loadInvites(); }} variant="secondary">
					Generate Invites
				</Button>
				<Button onclick={() => { showInvitesList = true; loadInvites(); }} variant="ghost">
					View Invites
				</Button>
				<Button onclick={logout} variant="ghost">
					Logout
				</Button>
			</div>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-4 gap-4 mb-8">
			<div class="bg-surface rounded-xl border border-border p-4">
				<div class="text-3xl font-bold text-text">{stats.total}</div>
				<div class="text-sm text-text-muted">Total Applications</div>
			</div>
			<div class="bg-surface rounded-xl border border-border p-4">
				<div class="text-3xl font-bold text-yellow-600">{stats.pending}</div>
				<div class="text-sm text-text-muted">Pending Review</div>
			</div>
			<div class="bg-surface rounded-xl border border-border p-4">
				<div class="text-3xl font-bold text-green-600">{stats.approved}</div>
				<div class="text-sm text-text-muted">Approved</div>
			</div>
			<div class="bg-surface rounded-xl border border-border p-4">
				<div class="text-3xl font-bold text-red-600">{stats.rejected}</div>
				<div class="text-sm text-text-muted">Rejected</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="flex items-center gap-4 mb-6">
			<span class="text-sm font-medium text-text">Filter:</span>
			<div class="flex gap-2">
				{#each ['pending', 'approved', 'rejected', 'all'] as s}
					<button
						class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {statusFilter === s ? 'bg-accent text-white' : 'bg-surface-alt border border-border hover:border-accent/30'}"
						onclick={() => { statusFilter = s; page = 1; }}
					>
						{s.charAt(0).toUpperCase() + s.slice(1)}
					</button>
				{/each}
			</div>
		</div>

		<!-- Entries List -->
		<Card class="overflow-x-auto">
			{#if isLoading}
				<div class="text-center py-12 text-text-muted">
					Loading...
				</div>
			{:else if entries.length === 0}
				<div class="text-center py-12 text-text-muted">
					No entries found
				</div>
			{:else}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border">
							<th class="text-left py-3 px-4 font-medium text-text-muted">Email</th>
							<th class="text-left py-3 px-4 font-medium text-text-muted">What Building</th>
							<th class="text-center py-3 px-4 font-medium text-text-muted">Score</th>
							<th class="text-center py-3 px-4 font-medium text-text-muted">Status</th>
							<th class="text-center py-3 px-4 font-medium text-text-muted">Position</th>
							<th class="text-center py-3 px-4 font-medium text-text-muted">Date</th>
							<th class="text-center py-3 px-4 font-medium text-text-muted">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each entries as entry}
							<tr class="border-b border-border-light hover:bg-surface-alt cursor-pointer"
								onclick={() => selectedEntry = entry}
							>
								<td class="py-3 px-4">
									<div class="font-medium text-text">{entry.email}</div>
									{#if entry.name}
										<div class="text-xs text-text-muted">{entry.name}</div>
									{/if}
								</td>
								<td class="py-3 px-4 max-w-xs">
									<div class="truncate text-text-secondary">
										{entry.question_what_building}
									</div>
									{#if entry.question_project_link}
										<a 
											href={entry.question_project_link}
											target="_blank"
											class="text-xs text-accent hover:underline"
											onclick={(e) => e.stopPropagation()}
										>
											View Link →
										</a>
									{/if}
								</td>
								<td class="py-3 px-4 text-center">
									<span class="inline-block px-2 py-1 rounded text-xs font-semibold {getScoreColor(entry.auto_score)}">
										{entry.auto_score}/10
									</span>
								</td>
								<td class="py-3 px-4 text-center">
									<span class="inline-block px-2 py-1 rounded text-xs font-semibold {entry.status === 'approved' ? 'bg-green-100 text-green-700' : entry.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">
										{entry.status}
									</span>
								</td>
								<td class="py-3 px-4 text-center text-text-muted">
									#{entry.position || '-'}
								</td>
								<td class="py-3 px-4 text-center text-text-muted text-xs">
									{formatDate(entry.created_at)}
								</td>
								<td class="py-3 px-4 text-center">
									{#if entry.status === 'pending'}
										<div class="flex gap-2 justify-center">
											<button
												class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
												onclick={(e) => { e.stopPropagation(); approveEntry(entry.id); }}
											>
												Approve
											</button>
											<button
												class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
												onclick={(e) => { e.stopPropagation(); rejectEntry(entry.id); }}
											>
												Reject
											</button>
										</div>
									{:else}
										<span class="text-text-muted">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}

			<!-- Pagination -->
			{#if pagination.totalPages > 1}
				<div class="flex items-center justify-center gap-2 pt-6 border-t border-border-light mt-6">
					<Button 
						variant="ghost" 
						size="sm"
						disabled={page === 1}
						onclick={() => page--}
					>
						← Prev
					</Button>
					<span class="text-sm text-text-muted">
						Page {page} of {pagination.totalPages}
					</span>
					<Button 
						variant="ghost" 
						size="sm"
						disabled={page >= pagination.totalPages}
						onclick={() => page++}
					>
						Next →
					</Button>
				</div>
			{/if}
		</Card>
	</div>

	<!-- Entry Detail Modal -->
	{#if selectedEntry}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick={() => selectedEntry = null}>
			<div class="bg-surface rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
				<div class="p-6">
					<div class="flex items-start justify-between mb-6">
						<div>
							<h2 class="text-xl font-bold">{selectedEntry.email}</h2>
							{#if selectedEntry.name}
								<p class="text-text-muted">{selectedEntry.name}</p>
							{/if}
						</div>
						<button onclick={() => selectedEntry = null} class="text-text-muted hover:text-text">
							✕
						</button>
					</div>

					<div class="space-y-4">
						<div>
							<h3 class="text-sm font-semibold text-text-muted mb-1">What are you building?</h3>
							<p class="text-text">{selectedEntry.question_what_building}</p>
						</div>

						{#if selectedEntry.question_project_link}
							<div>
								<h3 class="text-sm font-semibold text-text-muted mb-1">Project Link</h3>
								<a 
									href={selectedEntry.question_project_link}
									target="_blank"
									class="text-accent hover:underline break-all"
								>
									{selectedEntry.question_project_link}
								</a>
							</div>
						{/if}

						<div>
							<h3 class="text-sm font-semibold text-text-muted mb-1">APIs Used</h3>
							<p class="text-text">{selectedEntry.question_apis_used?.join?.(', ') || 'None specified'}</p>
						</div>

						{#if selectedEntry.question_referral_source}
							<div>
								<h3 class="text-sm font-semibold text-text-muted mb-1">Source</h3>
								<p class="text-text">{selectedEntry.question_referral_source}</p>
							</div>
						{/if}

						<div class="grid grid-cols-3 gap-4 py-4 border-t border-border">
							<div class="text-center">
								<div class="text-2xl font-bold {getScoreColor(selectedEntry.auto_score).split(' ')[0]}">{selectedEntry.auto_score}</div>
								<div class="text-xs text-text-muted">Auto Score</div>
							</div>
							<div class="text-center">
								<div class="text-2xl font-bold text-accent">#{selectedEntry.position || '-'}</div>
								<div class="text-xs text-text-muted">Position</div>
							</div>
							<div class="text-center">
								<div class="text-2xl font-bold text-text">{selectedEntry.referral_count}</div>
								<div class="text-xs text-text-muted">Referrals</div>
							</div>
						</div>

						{#if selectedEntry.status === 'pending'}
							<div class="flex gap-3 pt-4 border-t border-border">
								<Button onclick={() => approveEntry(selectedEntry.id)} class="flex-1">
									Approve
								</Button>
								<Button onclick={() => rejectEntry(selectedEntry.id)} variant="danger" class="flex-1">
									Reject
								</Button>
							</div>
						{:else}
							<div class="pt-4 border-t border-border text-center">
								<span class="text-text-muted">This application was {selectedEntry.status}</span>
								{#if selectedEntry.approved_at}
									<span class="text-text-muted"> on {formatDate(selectedEntry.approved_at)}</span>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Generate Invites Modal -->
	{#if showInviteModal}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick={() => { showInviteModal = false; newInvites = []; }}>
			<div class="bg-surface rounded-2xl max-w-md w-full" onclick={(e) => e.stopPropagation()}>
				<div class="p-6">
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-xl font-bold">Generate Invite Codes</h2>
						<button onclick={() => { showInviteModal = false; newInvites = []; }} class="text-text-muted hover:text-text">
							✕
						</button>
					</div>

					{#if newInvites.length === 0}
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-text mb-2">Tier</label>
								<select
									bind:value={inviteTier}
									class="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-surface text-text"
								>
									<option value="access">Access</option>
									<option value="early">Early Access</option>
									<option value="founding">Founding Builder</option>
								</select>
							</div>

							<div>
								<label class="block text-sm font-medium text-text mb-2">Count</label>
								<input
									type="number"
									bind:value={inviteCount}
									min="1"
									max="50"
									class="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-surface text-text"
								/>
							</div>

							<Button onclick={generateInvites} loading={isGeneratingInvites} class="w-full">
								Generate {inviteCount} Code{inviteCount !== 1 ? 's' : ''}
							</Button>
						</div>
					{:else}
						<div class="space-y-3">
							<p class="text-sm text-text-secondary mb-4">
								Copy these codes before closing:
							</p>
							{#each newInvites as code}
								<div class="flex items-center gap-2 bg-surface-alt rounded-lg px-4 py-2">
									<code class="flex-1 text-sm font-mono">{code}</code>
									<button
										onclick={() => copyCode(code)}
										class="text-xs text-accent hover:underline"
									>
										Copy
									</button>
								</div>
							{/each}
							<Button onclick={() => navigator.clipboard.writeText(newInvites.join('\n'))} variant="secondary" class="w-full">
								Copy All
							</Button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Invites List Modal -->
	{#if showInvitesList}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onclick={() => showInvitesList = false}>
			<div class="bg-surface rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
				<div class="p-6 border-b border-border">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-bold">All Invite Codes</h2>
						<button onclick={() => showInvitesList = false} class="text-text-muted hover:text-text">
							✕
						</button>
					</div>
				</div>
				<div class="p-6 overflow-y-auto max-h-96">
					{#await loadInvites() then}
						{#if invites.length === 0}
							<p class="text-center text-text-muted">No invite codes yet</p>
						{:else}
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-border">
										<th class="text-left py-2 px-2 font-medium text-text-muted">Code</th>
										<th class="text-left py-2 px-2 font-medium text-text-muted">Tier</th>
										<th class="text-center py-2 px-2 font-medium text-text-muted">Status</th>
										<th class="text-right py-2 px-2 font-medium text-text-muted">Created</th>
									</tr>
								</thead>
								<tbody>
									{#each invites as invite}
										<tr class="border-b border-border-light">
											<td class="py-2 px-2 font-mono text-xs">{invite.code}</td>
											<td class="py-2 px-2 capitalize">{invite.tier}</td>
											<td class="py-2 px-2 text-center">
												{#if invite.is_used}
													<span class="text-red-600">Used</span>
												{:else}
													<span class="text-green-600">Available</span>
												{/if}
											</td>
											<td class="py-2 px-2 text-right text-xs text-text-muted">
												{formatDate(invite.created_at)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					{/await}
				</div>
			</div>
		</div>
	{/if}
{/if}