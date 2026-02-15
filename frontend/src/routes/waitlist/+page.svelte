<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Input from '$lib/components/Input.svelte';
	import { onMount } from 'svelte';

	// Form state
	let step = $state(1);
	let isSubmitting = $state(false);
	let submitted = $state(false);
	let error = $state('');
	let isStudent = $state(false);

	// Form data
	let email = $state('');
	let name = $state('');
	let whatBuilding = $state('');
	let projectLink = $state('');
	let apisUsed = $state<string[]>([]);
	let referralSource = $state('');
	let inviteCode = $state('');

	// URL params
	let referredBy = $state('');
	let prefillInvite = $state('');

	// Result data
	let position = $state(0);
	let referralCode = $state('');
	let score = $state(0);
	let status = $state('pending');

	// Queue stats
	let queueStats = $state({ pending: 0, approved: 0, total: 0 });

	// API options
	const apiOptions = [
		{ id: 'openai', label: 'OpenAI (GPT-4, etc.)' },
		{ id: 'anthropic', label: 'Anthropic (Claude)' },
		{ id: 'openrouter', label: 'OpenRouter' },
		{ id: 'google', label: 'Google (Gemini)' },
		{ id: 'replicate', label: 'Replicate / Hugging Face' },
		{ id: 'ollama', label: 'Ollama (local)' },
		{ id: 'custom', label: 'Custom / Other' }
	];

	// Source options
	const sourceOptions = [
		{ id: 'twitter', label: 'Twitter/X' },
		{ id: 'github', label: 'GitHub' },
		{ id: 'referral', label: 'Referral from a friend' },
		{ id: 'producthunt', label: 'Product Hunt' },
		{ id: 'search', label: 'Search' },
		{ id: 'other', label: 'Other' }
	];

	// Handle URL params on mount
	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		referredBy = params.get('ref') || '';
		prefillInvite = params.get('invite') || '';
		if (prefillInvite) {
			inviteCode = prefillInvite;
		}

		// Fetch stats
		try {
			const res = await fetch('/api/waitlist/stats');
			if (res.ok) {
				const data = await res.json();
				queueStats = {
					pending: data.pending,
					approved: data.approved,
					total: data.total
				};
			}
		} catch (e) {
			console.error('Failed to fetch stats', e);
		}
	});

	// Toggle API selection
	function toggleApi(apiId: string) {
		if (apisUsed.includes(apiId)) {
			apisUsed = apisUsed.filter(a => a !== apiId);
		} else {
			apisUsed = [...apisUsed, apiId];
		}
	}

	// Validate invite code
	async function validateInviteCode() {
		if (!inviteCode) return true;

		try {
			const res = await fetch(`/api/waitlist/invite/${inviteCode}`);
			const data = await res.json();
			return data.valid;
		} catch {
			return false;
		}
	}

	// Submit form
	async function handleSubmit() {
		if (!email || !whatBuilding) {
			error = 'Email and project description are required';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const res = await fetch('/api/waitlist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					name,
					whatBuilding,
					projectLink,
					apisUsed,
					referralSource,
					inviteCode,
					referredBy
				})
			});

			const data = await res.json();

			if (!res.ok) {
				if (data.isStudent) {
					isStudent = true;
				}
				error = data.error || 'Failed to submit application';
				isSubmitting = false;
				return;
			}

			// Success!
			position = data.entry.position;
			referralCode = data.entry.referralCode;
			score = data.entry.score;
			status = data.entry.status;
			submitted = true;

		} catch (e) {
			error = 'Failed to submit application. Please try again.';
		}

		isSubmitting = false;
	}

	// Copy referral link
	function copyReferralLink() {
		const link = `${window.location.origin}/waitlist?ref=${referralCode}`;
		navigator.clipboard.writeText(link);
	}

	// Share on Twitter
	function shareOnTwitter() {
		const text = "I just joined the @onhyper waitlist! Building AI apps securely 🔐";
		const link = `${window.location.origin}/waitlist?ref=${referralCode}`;
		window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
	}

	// Next step
	function nextStep() {
		if (step === 1) {
			if (!email) {
				error = 'Email is required';
				return;
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				error = 'Please enter a valid email';
				return;
			}
		}
		if (step === 2 && !whatBuilding) {
			error = 'Tell us what you\'re building';
			return;
		}
		error = '';
		step++;
	}

	// Previous step
	function prevStep() {
		step = Math.max(1, step - 1);
	}
</script>

<svelte:head>
	<title>Join the Waitlist — OnHyper</title>
	<meta name="description" content="Join the OnHyper waitlist for Early Access. Ship AI-powered web apps without exposing API keys." />
	<meta property="og:title" content="Join the Waitlist — OnHyper" />
	<meta property="og:description" content="Join the OnHyper waitlist for Early Access. Ship AI-powered web apps without exposing API keys." />
</svelte:head>

<Nav />

{#if submitted}
	<!-- Success State -->
	<section class="py-24 px-6">
		<div class="max-w-2xl mx-auto text-center">
			{#if status === 'approved'}
				<div class="text-6xl mb-6">🎉</div>
				<h1 class="text-3xl md:text-4xl font-bold mb-4">You're In!</h1>
				<p class="text-text-secondary text-lg mb-6">
					Your application stood out. Welcome to Early Access!
				</p>
				<div class="bg-surface-alt rounded-xl border border-border p-6 mb-8">
					<div class="text-sm text-text-muted mb-2">Your referral code</div>
					<code class="text-2xl font-mono text-accent">{referralCode}</code>
				</div>
				<p class="text-text-muted text-sm mb-6">
					Check your email for next steps and your invite codes.
				</p>
			{:else}
				<div class="text-6xl mb-6">🔮</div>
				<h1 class="text-3xl md:text-4xl font-bold mb-4">You're on the Waitlist!</h1>
				<p class="text-text-secondary text-lg mb-2">
					Your position in line:
				</p>
				<div class="text-6xl font-extrabold text-accent mb-2">
					#{position}
				</div>
				<p class="text-text-muted text-sm mb-8">
					(Quality score: {score}/10 • {queueStats.pending} ahead of you)
				</p>
			{/if}

			<!-- Referral Section -->
			<Card title="⬆️ Jump the Queue" class="text-left mb-8">
				<p class="text-text-secondary text-sm mb-4">
					Share your referral link. Every friend who joins moves you up <strong class="text-accent">10 spots</strong>.
				</p>
				<div class="bg-surface-alt rounded-lg p-4 mb-4">
					<code class="text-sm font-mono break-all">
						{`${typeof window !== 'undefined' ? window.location.origin : ''}/waitlist?ref=${referralCode}`}
					</code>
				</div>
				<div class="flex gap-3">
					<Button onclick={copyReferralLink} variant="secondary">
						Copy Link
					</Button>
					<Button onclick={shareOnTwitter} variant="secondary">
						Share on X
					</Button>
				</div>
			</Card>

			<!-- What's Next -->
			<Card title="What Happens Next">
				<ol class="space-y-3 text-left text-sm">
					<li class="flex gap-3">
						<span class="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-accent text-xs font-bold">1</span>
						<span class="text-text-secondary">We review your application within 1-2 days</span>
					</li>
					<li class="flex gap-3">
						<span class="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-accent text-xs font-bold">2</span>
						<span class="text-text-secondary">If approved, you'll get early access plus 3 invite codes</span>
					</li>
					<li class="flex gap-3">
						<span class="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center text-accent text-xs font-bold">3</span>
						<span class="text-text-secondary">Share invites with builders you trust</span>
					</li>
				</ol>
			</Card>

			<div class="mt-8">
				<Button href="/" variant="ghost">
					← Back to Home
				</Button>
			</div>
		</div>
	</section>
{:else}
	<!-- Application Form -->
	<section class="py-24 px-6">
		<div class="max-w-2xl mx-auto">
			<!-- Hero -->
			<div class="text-center mb-12">
				<div class="inline-flex items-center gap-2 text-sm font-semibold text-accent uppercase tracking-wide mb-6 bg-accent/10 px-4 py-2 rounded-full">
					<span>🔐</span>
					<span>Early Access</span>
				</div>
				<h1 class="text-3xl md:text-4xl font-bold mb-4">
					Join the Waitlist
				</h1>
				<p class="text-text-secondary text-lg mb-2">
					OnHyper is building for active builders only.
				</p>
				<p class="text-text-muted text-sm">
					Application takes ~60 seconds. Quality matters more than timing.
				</p>
			</div>

			<!-- Stats Bar -->
			<div class="bg-surface-alt rounded-xl border border-border p-4 mb-8 flex justify-around text-center">
				<div>
					<div class="text-2xl font-bold text-accent">{queueStats.pending}</div>
					<div class="text-xs text-text-muted">On Waitlist</div>
				</div>
				<div class="border-l border-border"></div>
				<div>
					<div class="text-2xl font-bold text-success">{queueStats.approved}</div>
					<div class="text-xs text-text-muted">Approved</div>
				</div>
				<div class="border-l border-border"></div>
				<div>
					<div class="text-2xl font-bold text-text-muted">{queueStats.total}</div>
					<div class="text-xs text-text-muted">Total Apps</div>
				</div>
			</div>

			{#if referredBy}
				<div class="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 mb-6 text-sm text-cyan-600">
					👋 You were referred by a friend! You'll get a +5 position boost.
				</div>
			{/if}

			<!-- Error Message -->
			{#if error}
				<div class="bg-error/10 border border-error/20 rounded-lg p-4 mb-6 text-sm text-error">
					{error}
				</div>
			{/if}

			{#if isStudent}
				<!-- Student Rejection -->
				<Card class="text-center">
					<div class="text-5xl mb-4">👋</div>
					<h3 class="text-xl font-semibold mb-2">Hey Student!</h3>
					<p class="text-text-secondary mb-4">
						OnHyper is built for active builders with live projects. You're learning, which is awesome! 
						<br><br>
						Join us when you're ready to ship something real. We'll be here.
					</p>
					<Button href="/" variant="secondary">
						Got it, thanks!
					</Button>
				</Card>
			{:else}
				<!-- Multi-step Form -->
				<Card class="overflow-visible">
					<!-- Progress Indicator -->
					<div class="flex items-center mb-8">
						{#each [1, 2, 3] as s}
							<button 
								class="flex-1 h-1 rounded-full {s <= step ? 'bg-accent' : 'bg-border'} transition-colors"
								onclick={() => s < step && (step = s)}
							></button>
						{/each}
					</div>

					{#if step === 1}
						<!-- Step 1: Email & Name -->
						<h2 class="text-xl font-semibold mb-6">Let's start with the basics</h2>
						
						<div class="space-y-4">
							<Input
								name="email"
								type="email"
								label="Your email"
								placeholder="you@company.com"
								bind:value={email}
								required
							/>
							
							<Input
								name="name"
								label="Your name (optional)"
								placeholder="Jane Developer"
								bind:value={name}
							/>

							<Input
								name="inviteCode"
								label="Invite code (if you have one)"
								placeholder="ONHYPER-XXXX-XXXX-XXXX"
								bind:value={inviteCode}
							/>
						</div>

						<div class="flex justify-end mt-6">
							<Button onclick={nextStep}>
								Next →
							</Button>
						</div>

					{:else if step === 2}
						<!-- Step 2: What Are You Building -->
						<h2 class="text-xl font-semibold mb-2">Tell us about your project</h2>
						<p class="text-text-muted text-sm mb-6">
							This is the most important part. Be specific.
						</p>
						
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-text mb-1.5">
									What are you building? <span class="text-error">*</span>
								</label>
								<textarea
									name="whatBuilding"
									class="w-full px-4 py-3 text-sm border border-border rounded-lg bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
									rows="4"
									placeholder="I'm building an AI-powered resume builder that uses GPT-4 to analyze and improve resumes. I have a working prototype at..."
									bind:value={whatBuilding}
								></textarea>
								<p class="text-xs text-text-muted mt-1">
									Mention specific AI APIs you're using for bonus points.
								</p>
							</div>

							<Input
								name="projectLink"
								label="Link to your work (GitHub, live app, demo)"
								placeholder="https://github.com/yourname/project"
								bind:value={projectLink}
							/>
						</div>

						<div class="flex justify-between mt-6">
							<Button onclick={prevStep} variant="ghost">
								← Back
							</Button>
							<Button onclick={nextStep}>
								Next →
							</Button>
						</div>

					{:else if step === 3}
						<!-- Step 3: APIs & Source -->
						<h2 class="text-xl font-semibold mb-6">Last few questions</h2>
						
						<div class="space-y-6">
							<div>
								<label class="block text-sm font-medium text-text mb-3">
									Which AI APIs are you using?
								</label>
								<div class="grid grid-cols-2 gap-2">
									{#each apiOptions as api}
										<button
											class="text-left px-4 py-2.5 rounded-lg border text-sm transition-all {apisUsed.includes(api.id) ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/30'}"
											onclick={() => toggleApi(api.id)}
										>
											{api.label}
										</button>
									{/each}
								</div>
							</div>

							<div>
								<label class="block text-sm font-medium text-text mb-3">
									How did you hear about OnHyper?
								</label>
								<div class="flex flex-wrap gap-2">
									{#each sourceOptions as source}
										<button
											class="px-4 py-2 rounded-lg border text-sm transition-all {referralSource === source.id ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/30'}"
											onclick={() => referralSource = source.id}
										>
											{source.label}
										</button>
									{/each}
								</div>
							</div>
						</div>

						<div class="flex justify-between mt-8">
							<Button onclick={prevStep} variant="ghost">
								← Back
							</Button>
							<Button onclick={handleSubmit} loading={isSubmitting}>
								Submit Application
							</Button>
						</div>
					{/if}
				</Card>

				<!-- Fine Print -->
				<p class="text-center text-text-muted text-xs mt-6">
					By submitting, you agree to receive occasional emails about your waitlist status.
					<br>No spam, ever. Unsubscribe anytime.
				</p>
			{/if}
		</div>
	</section>
{/if}

<!-- Why the Application? -->
<section class="py-16 px-6 bg-surface-alt">
	<div class="max-w-3xl mx-auto">
		<h2 class="text-2xl font-bold text-center mb-8">Why the Application?</h2>
		<div class="grid md:grid-cols-2 gap-6">
			<div class="bg-surface p-6 rounded-xl border border-border">
				<div class="text-2xl mb-3">🎯</div>
				<h3 class="font-semibold mb-2">Quality Community</h3>
				<p class="text-text-secondary text-sm">
					We're building a community of serious builders, not tire-kickers. 
					Your answers help us find people who will actually use and love OnHyper.
				</p>
			</div>
			<div class="bg-surface p-6 rounded-xl border border-border">
				<div class="text-2xl mb-3">⚡</div>
				<h3 class="font-semibold mb-2">Auto-Scoring</h3>
				<p class="text-text-secondary text-sm">
					High-quality applications (score 8+) get auto-approved for Early Access. 
					Score 5-7? We review manually within 1-2 days.
				</p>
			</div>
			<div class="bg-surface p-6 rounded-xl border border-border">
				<div class="text-2xl mb-3">🎁</div>
				<h3 class="font-semibold mb-2">Invite Codes</h3>
				<p class="text-text-secondary text-sm">
					Approved Early Access members get invite codes to share.
					Your friends skip the waitlist entirely.
				</p>
			</div>
			<div class="bg-surface p-6 rounded-xl border border-border">
				<div class="text-2xl mb-3">📈</div>
				<h3 class="font-semibold mb-2">Referral Boosts</h3>
				<p class="text-text-secondary text-sm">
					Share your link. Every friend who joins moves you up 10 positions.
					Climb faster, get access sooner.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Footer Teaser -->
<section class="py-16 px-6 text-center">
	<h2 class="text-2xl font-bold mb-4">What You'll Get</h2>
	<div class="max-w-md mx-auto text-left space-y-3">
		<div class="flex items-start gap-3">
			<span class="text-success mt-1">✓</span>
			<span class="text-text-secondary">90-day free trial of Pro plan</span>
		</div>
		<div class="flex items-start gap-3">
			<span class="text-success mt-1">✓</span>
			<span class="text-text-secondary">Early Adopter badge on your profile</span>
		</div>
		<div class="flex items-start gap-3">
			<span class="text-success mt-1">✓</span>
			<span class="text-text-secondary">3 invite codes to share</span>
		</div>
		<div class="flex items-start gap-3">
			<span class="text-success mt-1">✓</span>
			<span class="text-text-secondary">Access to private Discord community</span>
		</div>
		<div class="flex items-start gap-3">
			<span class="text-success mt-1">✓</span>
			<span class="text-text-secondary">30% off pricing for first year</span>
		</div>
	</div>
</section>