<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';

	const features = [
		{
			icon: '🔐',
			title: 'Secure API Proxy',
			desc: 'Store API keys server-side. Call any API from your app without exposing secrets.'
		},
		{
			icon: '⚡',
			title: 'Instant Publishing',
			desc: 'Push HTML/CSS/JS and get a live URL in seconds. No servers to manage.'
		},
		{
			icon: '🤖',
			title: 'Built for AI Agents',
			desc: 'Programmatic API for autonomous publishing. Perfect for AI-generated apps.'
		},
		{
			icon: '🌐',
			title: 'CORS Handled',
			desc: 'Your apps can call external APIs through our proxy. No CORS headaches.'
		},
		{
			icon: '📊',
			title: 'Usage Tracking',
			desc: 'Monitor requests per app. Stay within your plan limits.'
		},
		{
			icon: '🚀',
			title: 'Multiple Endpoints',
			desc: 'Pre-configured proxy routes for OpenAI, Anthropic, Ollama, and more.'
		}
	];

	const plans = [
		{
			name: 'Free',
			price: '$0',
			period: '/mo',
			desc: 'For testing & prototypes',
			features: ['100 requests/day', '3 apps', 'Public pages', 'Community support'],
			highlight: false,
			cta: 'Start Free',
			ctaLink: '/signup'
		},
		{
			name: 'Hobby',
			price: '$5',
			period: '/mo',
			desc: 'For side projects',
			features: ['1,000 requests/day', '10 apps', 'Password protection', 'All proxy endpoints'],
			highlight: true,
			cta: 'Start Hobby',
			ctaLink: '/signup?plan=hobby'
		},
		{
			name: 'Pro',
			price: '$15',
			period: '/mo',
			desc: 'For growing products',
			features: ['10,000 requests/day', '50 apps', 'Custom domains', 'Priority support'],
			highlight: false,
			cta: 'Start Pro',
			ctaLink: '/signup?plan=pro'
		},
		{
			name: 'Business',
			price: '$49',
			period: '/mo',
			desc: 'For teams & scale',
			features: ['100,000 requests/day', 'Unlimited apps', 'Custom domains', 'Team collaboration'],
			highlight: false,
			cta: 'Contact Us',
			ctaLink: 'mailto:hello@onhyper.io'
		}
	];
</script>

<Nav />

<!-- Hero -->
<section class="py-24 px-6 text-center bg-surface">
	<div class="max-w-4xl mx-auto">
		<div class="text-sm font-semibold text-accent uppercase tracking-wide mb-4">
			For AI Agents & Developers
		</div>
		<h1 class="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
			Publish apps that call APIs
			<span class="text-accent">securely</span>
		</h1>
		<p class="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-8">
			Static sites can't use API keys. OnHyper stores your secrets server-side and injects them at request time. Build full-stack apps without a backend.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-4">
			<Button href="/signup" size="lg">
				Get Started Free →
			</Button>
			<Button href="#how-it-works" variant="secondary" size="lg">
				Learn More
			</Button>
		</div>
	</div>
</section>

<!-- Code Example -->
<section class="py-16 px-6 bg-surface-alt">
	<div class="max-w-4xl mx-auto">
		<pre class="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-2xl overflow-auto text-sm border border-border"><code>// Your app's HTML - no secrets exposed!
&lt;script&gt;
  fetch('/proxy/openai/chat/completions', &#123;
    method: 'POST',
    headers: &#123; 'Content-Type': 'application/json' &#125;,
    body: JSON.stringify(&#123;
      model: 'gpt-4',
      messages: [&#123; role: 'user', content: 'Hello!' &#125;]
    &#125;)
  &#125;)
// We inject your OPENAI_API_KEY server-side
&lt;/script&gt;</code></pre>
	</div>
</section>

<!-- How It Works -->
<section id="how-it-works" class="py-20 px-6 bg-surface">
	<div class="max-w-5xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-12">How It Works</h2>
		<div class="grid md:grid-cols-3 gap-8">
			<div class="text-center">
				<div class="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
					<span class="text-3xl">1️⃣</span>
				</div>
				<h3 class="text-lg font-semibold mb-2">Add Your API Keys</h3>
				<p class="text-text-secondary">Store your OpenAI, Anthropic, or other API keys securely in our vault.</p>
			</div>
			<div class="text-center">
				<div class="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
					<span class="text-3xl">2️⃣</span>
				</div>
				<h3 class="text-lg font-semibold mb-2">Build Your App</h3>
				<p class="text-text-secondary">Write HTML/CSS/JS in our editor. Use proxy endpoints without any secrets.</p>
			</div>
			<div class="text-center">
				<div class="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
					<span class="text-3xl">3️⃣</span>
				</div>
				<h3 class="text-lg font-semibold mb-2">Publish & Share</h3>
				<p class="text-text-secondary">Get a live URL. Your app calls APIs securely through our proxy.</p>
			</div>
		</div>
	</div>
</section>

<!-- Features -->
<section class="py-20 px-6 bg-surface-alt">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-12">Everything you need</h2>
		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each features as feature}
				<div class="bg-surface p-6 rounded-xl border border-border-light">
					<div class="text-3xl mb-4">{feature.icon}</div>
					<h3 class="text-lg font-semibold mb-2">{feature.title}</h3>
					<p class="text-text-secondary text-sm">{feature.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Pricing -->
<section id="pricing" class="py-20 px-6 bg-surface">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
		<p class="text-text-secondary text-center mb-12">Start free, scale as you grow.</p>
		<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each plans as plan}
				<div class="bg-surface rounded-2xl p-6 border {plan.highlight ? 'border-accent ring-2 ring-accent/20' : 'border-border'}">
					{#if plan.highlight}
						<div class="inline-block bg-accent text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
							POPULAR
						</div>
					{:else}
						<div class="h-7 mb-4"></div>
					{/if}
					<h3 class="text-xl font-semibold mb-1">{plan.name}</h3>
					<div class="text-4xl font-extrabold mb-1">
						{plan.price}<span class="text-base font-normal text-text-secondary">{plan.period}</span>
					</div>
					<p class="text-text-secondary text-sm mb-6">{plan.desc}</p>
					<ul class="space-y-2 mb-6">
						{#each plan.features as feature}
							<li class="text-sm flex items-center gap-2">
								<span class="text-success">✓</span>
								{feature}
							</li>
						{/each}
					</ul>
					<Button 
						href={plan.ctaLink} 
						variant={plan.highlight ? 'primary' : 'secondary'} 
						class="w-full"
					>
						{plan.cta}
					</Button>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Footer -->
<footer class="py-8 px-6 border-t border-border bg-surface text-center text-text-muted text-sm">
	<p>© 2026 OnHyper.io — Built by <a href="https://hyper.io" class="text-accent hover:underline">hyper</a></p>
</footer>