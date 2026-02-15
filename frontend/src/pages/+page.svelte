<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Button from '$lib/components/Button.svelte';
	import Head from '$lib/components/Head.svelte';

	// Code sample for the hero section (stored as string to avoid Svelte 5 parsing issues)
	const codeSample = `<span class="text-gray-500">// Your AI agent publishes an app via our API</span>
<span class="text-cyan-400">const</span> <span class="text-white">response</span> <span class="text-gray-300">=</span> <span class="text-cyan-400">await</span> <span class="text-yellow-300">fetch</span><span class="text-gray-300">(</span><span class="text-green-400">"https://api.onhyper.io/v1/apps"</span><span class="text-gray-300">, {</span>
  <span class="text-orange-300">method</span><span class="text-gray-300">:</span> <span class="text-green-400">"POST"</span><span class="text-gray-300">,</span>
  <span class="text-orange-300">headers</span><span class="text-gray-300">: {</span>
    <span class="text-green-400">"Authorization"</span><span class="text-gray-300">:</span> <span class="text-green-400">"Bearer {AGENT_TOKEN}"</span><span class="text-gray-300">,</span>
    <span class="text-green-400">"Content-Type"</span><span class="text-gray-300">:</span> <span class="text-green-400">"application/json"</span>
  <span class="text-gray-300">},</span>
  <span class="text-orange-300">body</span><span class="text-gray-300">:</span> <span class="text-yellow-300">JSON</span><span class="text-gray-300">.</span><span class="text-yellow-300">stringify</span><span class="text-gray-300">({</span>
    <span class="text-orange-300">name</span><span class="text-gray-300">:</span> <span class="text-green-400">"my-ai-tool"</span><span class="text-gray-300">,</span>
    <span class="text-orange-300">files</span><span class="text-gray-300">: {</span>
      <span class="text-green-400">"index.html"</span><span class="text-gray-300">:</span> <span class="text-green-400">"&lt;!DOCTYPE html&gt;..."</span><span class="text-gray-300">,</span>
      <span class="text-green-400">"app.js"</span><span class="text-gray-300">:</span> <span class="text-green-400">"// Agent-generated code"</span>
    <span class="text-gray-300">},</span>
    <span class="text-orange-300">publish</span><span class="text-gray-300">:</span> <span class="text-cyan-400">true</span>
  <span class="text-gray-300">})</span>
<span class="text-gray-300">});</span>

<span class="text-cyan-400">const</span> <span class="text-white">app</span> <span class="text-gray-300">=</span> <span class="text-cyan-400">await</span> <span class="text-white">response</span><span class="text-gray-300">.</span><span class="text-yellow-300">json</span><span class="text-gray-300">();</span>
<span class="text-gray-500">// → app.url: "https://my-ai-tool.onhyper.live"</span>
<span class="text-gray-500">// Agent shipped it. You didn't touch a thing.</span>`;

	const features = [
		{
			icon: '🤖',
			title: 'Agent Publishing API',
			desc: 'Full REST API for autonomous app publishing. Let your AI agent ship code without you.'
		},
		{
			icon: '🔐',
			title: 'Secure by Default',
			desc: 'API keys stay server-side. Agents authenticate with scoped tokens — no secrets exposed.'
		},
		{
			icon: '⚡',
			title: 'Instant Deployment',
			desc: 'Push code, get a live URL in seconds. No servers, no CI/CD, no DevOps.'
		},
		{
			icon: '🔄',
			title: 'Draft & Approve',
			desc: 'Review apps before they go live. Draft mode + approval workflows for control.'
		},
		{
			icon: '🌐',
			title: 'CORS Handled',
			desc: 'Your apps call APIs through our proxy. No browser CORS headaches.'
		},
		{
			icon: '📊',
			title: 'Usage Tracking',
			desc: 'Monitor requests per app. Know exactly what your agents are doing.'
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

	const useCases = [
		{ icon: '🤖', title: 'AI Apps', desc: 'Chatbots, assistants, image generators' },
		{ icon: '🔌', title: 'API Tools', desc: 'Dashboards, monitors, integrations' },
		{ icon: '🔐', title: 'OAuth Flows', desc: 'Secure authentication handlers' },
		{ icon: '📊', title: 'Data Viz', desc: 'Charts, reports, real-time displays' }
	];

	const faqs = [
		{
			question: 'Can AI agents publish apps programmatically?',
			answer: 'Yes — our full REST API supports autonomous publishing. Your agent can create, update, and deploy apps without human intervention. Just give it a scoped API token.'
		},
		{
			question: 'How do agents authenticate without exposing keys?',
			answer: 'Agents use scoped API tokens (OAuth-style). These tokens can be limited to specific actions — like "publish apps" or "read usage" — without exposing your actual API keys. Your OpenAI, Anthropic, and other secrets stay encrypted server-side.'
		},
		{
			question: 'What\'s the difference from Vercel/Netlify?',
			answer: 'They\'re built for humans deploying code. We\'re built for agents publishing apps. Our API-first approach, proxy infrastructure, and approval workflows are designed specifically for AI-driven development workflows.'
		},
		{
			question: 'Can I review apps before they go live?',
			answer: 'Absolutely. Draft mode lets agents create apps without publishing. Set up approval workflows so you can review, edit, or reject before anything hits production.'
		},
		{
			question: 'What APIs can agents call?',
			answer: 'OpenAI, Anthropic, OpenRouter, Scout Atoms, Ollama, and any custom endpoint you configure. We handle CORS, rate limiting, and secret injection automatically.'
		}
	];
</script>

<Head>
	<title>OnHyper — Where Agents Ship Code</title>
	<meta name="description" content="Publish apps your AI agent creates. Secure API proxy for agent-driven development. OpenAI, Anthropic, and more — without exposing secrets." />
	<meta name="keywords" content="AI agent publishing, API proxy, frontend security, hide API keys, OpenAI proxy, Anthropic proxy, agent deployment, AI app hosting" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://onhyper.io/" />
	<meta property="og:title" content="OnHyper — Where Agents Ship Code" />
	<meta property="og:description" content="Publish apps your AI agent creates. Secure proxy for agent-driven development." />
	<meta property="og:image" content="https://onhyper.io/og-image.png" />
	<meta property="og:site_name" content="OnHyper" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://onhyper.io/" />
	<meta name="twitter:title" content="OnHyper — Where Agents Ship Code" />
	<meta name="twitter:description" content="Publish apps your AI agent creates. Secure proxy for agent-driven development." />
	<meta name="twitter:image" content="https://onhyper.io/og-image.png" />
	<link rel="canonical" href="https://onhyper.io/" />
</Head>

<Nav />

<!-- Hero Section -->
<section class="relative py-24 px-6 text-center overflow-hidden">
	<!-- Gradient background -->
	<div class="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none"></div>
	<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>
	
	<div class="relative max-w-4xl mx-auto">
		<div class="inline-flex items-center gap-2 text-sm font-semibold text-accent uppercase tracking-wide mb-6 bg-accent/10 px-4 py-2 rounded-full">
			<span>🚀</span>
			<span>Now in Public Beta</span>
		</div>
		
		<h1 class="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
			Where agents<br>
			<span class="bg-gradient-to-r from-accent to-cyan-500 bg-clip-text text-transparent">
				ship code
			</span>
		</h1>
		
		<p class="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
			Publish apps your AI agent creates. We handle security, so your agent can ship without leaking secrets.
		</p>
		
		<p class="text-sm text-text-muted mb-10">
			Built for developers who let agents ship their apps.
		</p>
		
		<div class="flex flex-wrap items-center justify-center gap-4 mb-12">
			<Button href="/signup" size="lg">
				Start Free →
			</Button>
			<Button href="/docs" variant="secondary" size="lg">
				API Docs
			</Button>
		</div>
		
		<!-- Code Example Window - Agent Publishing -->
		<div class="max-w-3xl mx-auto">
			<div class="bg-[#0d1117] rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/20">
				<!-- Window header -->
				<div class="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-white/5">
					<div class="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
					<div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
					<div class="w-3 h-3 rounded-full bg-[#27c93f]"></div>
					<span class="ml-3 text-xs text-gray-500 font-mono">agent-action.js</span>
				</div>
				
				<!-- Code content -->
				<div class="p-6 text-left">
					<pre class="text-sm font-mono leading-relaxed overflow-x-auto"><code>{@html codeSample}</code></pre>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- How It Works -->
<section id="how-it-works" class="py-20 px-6 bg-surface">
	<div class="max-w-5xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">How It Works</h2>
		<p class="text-text-secondary text-center mb-12 max-w-xl mx-auto">
			Your agent writes code → We validate & secure → Published instantly.
		</p>
		
		<div class="grid md:grid-cols-3 gap-8">
			<div class="text-center">
				<div class="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
					<span class="text-2xl">🤖</span>
				</div>
				<div class="text-sm font-bold text-accent mb-1">1</div>
				<h3 class="text-lg font-semibold mb-2">Agent Writes Code</h3>
				<p class="text-text-secondary text-sm">Your AI agent generates HTML, CSS, JS. It calls our API with a scoped token to publish.</p>
			</div>
			<div class="text-center">
				<div class="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
					<span class="text-2xl">🔐</span>
				</div>
				<div class="text-sm font-bold text-accent mb-1">2</div>
				<h3 class="text-lg font-semibold mb-2">We Validate & Secure</h3>
				<p class="text-text-secondary text-sm">Server-side key injection, CORS handling, draft mode approval if you want oversight.</p>
			</div>
			<div class="text-center">
				<div class="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
					<span class="text-2xl">🚀</span>
				</div>
				<div class="text-sm font-bold text-accent mb-1">3</div>
				<h3 class="text-lg font-semibold mb-2">Published Instantly</h3>
				<p class="text-text-secondary text-sm">Live URL in seconds. Hosted, secured, and ready to call any API your app needs.</p>
			</div>
		</div>
		
		<div class="text-center mt-12">
			<Button href="/signup" variant="secondary">
				Let Your Agent Ship →
			</Button>
		</div>
	</div>
</section>

<!-- Use Cases -->
<section class="py-20 px-6 bg-surface-alt">
	<div class="max-w-5xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">Built for Developer Agents</h2>
		<p class="text-text-secondary text-center mb-12 max-w-xl mx-auto">
			Power any app that needs secure API access.
		</p>
		
		<div class="grid md:grid-cols-4 gap-6">
			{#each useCases as useCase}
				<div class="bg-surface p-6 rounded-xl border border-border hover:border-accent/30 transition-colors">
					<div class="text-3xl mb-3">{useCase.icon}</div>
					<h3 class="text-lg font-semibold mb-1">{useCase.title}</h3>
					<p class="text-text-secondary text-sm">{useCase.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Features -->
<section class="py-20 px-6 bg-surface">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">Everything Your Agent Needs</h2>
		<p class="text-text-secondary text-center mb-12 max-w-xl mx-auto">
			Built from the ground up for agent-driven development.
		</p>
		
		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each features as feature}
				<div class="bg-surface-alt p-6 rounded-xl border border-border hover:shadow-lg hover:border-accent/20 transition-all">
					<div class="text-3xl mb-4">{feature.icon}</div>
					<h3 class="text-lg font-semibold mb-2">{feature.title}</h3>
					<p class="text-text-secondary text-sm">{feature.desc}</p>
				</div>
			{/each}
		</div>
		
		<div class="text-center mt-12">
			<Button href="#pricing" variant="secondary">
				View Pricing →
			</Button>
		</div>
	</div>
</section>

<!-- Pricing -->
<section id="pricing" class="py-20 px-6 bg-surface-alt">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
		<p class="text-text-secondary text-center mb-12">Start free, scale as your agents ship more. No hidden fees.</p>
		
		<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each plans as plan}
				<div class="bg-surface rounded-2xl p-6 border {plan.highlight ? 'border-accent ring-2 ring-accent/20 shadow-lg shadow-accent/10' : 'border-border'} transition-shadow hover:shadow-lg">
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
		
		<p class="text-center text-text-muted text-sm mt-8">
			Need enterprise or custom volume? <a href="mailto:hello@onhyper.io" class="text-accent hover:underline">Contact us</a>
		</p>
	</div>
</section>

<!-- FAQ -->
<section class="py-20 px-6 bg-surface">
	<div class="max-w-3xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">Frequently Asked Questions</h2>
		<p class="text-text-secondary text-center mb-12">Common questions from agent developers.</p>
		
		<div class="space-y-6">
			{#each faqs as faq}
				<div class="bg-surface-alt rounded-xl p-6 border border-border">
					<h3 class="text-lg font-semibold mb-3">{faq.question}</h3>
					<p class="text-text-secondary">{faq.answer}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Final CTA -->
<section class="py-20 px-6 bg-gradient-to-br from-accent/10 via-surface to-cyan-500/5">
	<div class="max-w-3xl mx-auto text-center">
		<h2 class="text-3xl md:text-4xl font-bold mb-4">
			Ready to let your agent ship?
		</h2>
		<p class="text-text-secondary mb-8 max-w-lg mx-auto">
			Join the developers who've stopped manually deploying. 
			Your AI agent ships — OnHyper secures.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-4">
			<Button href="/signup" size="lg">
				Start Free →
			</Button>
			<Button href="/docs" variant="secondary" size="lg">
				API Docs
			</Button>
		</div>
		<p class="text-text-muted text-sm mt-6">
			Free tier forever. No credit card required.
		</p>
	</div>
</section>

<!-- Footer -->
<footer class="py-12 px-6 border-t border-border bg-surface">
	<div class="max-w-6xl mx-auto">
		<div class="grid md:grid-cols-4 gap-8 mb-8">
			<div>
				<div class="flex items-center gap-2 mb-4">
					<div class="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
						<span class="text-white font-bold text-lg">H</span>
					</div>
					<span class="font-bold text-xl text-text">OnHyper</span>
				</div>
				<p class="text-text-muted text-sm">
					Where agents ship code.
				</p>
			</div>
			<div>
				<h4 class="font-semibold mb-3 text-sm">Product</h4>
				<ul class="space-y-2 text-sm text-text-secondary">
					<li><a href="#how-it-works" class="hover:text-text">How It Works</a></li>
					<li><a href="#pricing" class="hover:text-text">Pricing</a></li>
					<li><a href="/docs" class="hover:text-text">Documentation</a></li>
				</ul>
			</div>
			<div>
				<h4 class="font-semibold mb-3 text-sm">Resources</h4>
				<ul class="space-y-2 text-sm text-text-secondary">
					<li><a href="/docs" class="hover:text-text">API Reference</a></li>
					<li><a href="https://github.com/onhyper" class="hover:text-text">GitHub</a></li>
					<li><a href="https://twitter.com/onhyper" class="hover:text-text">Twitter</a></li>
				</ul>
			</div>
			<div>
				<h4 class="font-semibold mb-3 text-sm">Legal</h4>
				<ul class="space-y-2 text-sm text-text-secondary">
					<li><a href="/legal/privacy" class="hover:text-text">Privacy</a></li>
					<li><a href="/legal/terms" class="hover:text-text">Terms</a></li>
				</ul>
			</div>
		</div>
		<div class="pt-8 border-t border-border text-center text-text-muted text-sm">
			<p>© 2026 OnHyper.io — Built by <a href="https://hyper.io" class="text-accent hover:underline">hyper</a></p>
		</div>
	</div>
</footer>