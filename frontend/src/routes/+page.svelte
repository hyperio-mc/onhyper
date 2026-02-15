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

	const useCases = [
		{ icon: '🤖', title: 'AI Apps', desc: 'Chatbots, assistants, image generators' },
		{ icon: '🔌', title: 'API Tools', desc: 'Dashboards, monitors, integrations' },
		{ icon: '🔐', title: 'OAuth Flows', desc: 'Secure authentication handlers' },
		{ icon: '📊', title: 'Data Viz', desc: 'Charts, reports, real-time displays' }
	];

	const metrics = [
		{ value: '500+', label: 'APIs Protected' },
		{ value: '1,200+', label: 'Apps Published' },
		{ value: '50M+', label: 'API Calls Proxied' }
	];
</script>

<svelte:head>
	<title>OnHyper — Ship Frontend Apps Without Leaking API Keys</title>
	<meta name="description" content="Secure proxy platform for frontend developers. Call OpenAI, Anthropic, and other APIs without exposing secrets to the browser. Deploy in minutes." />
	<meta name="keywords" content="API proxy, frontend security, hide API keys, OpenAI proxy, Anthropic proxy, secure API calls, static site API, AI app hosting" />
	<link rel="canonical" href="https://onhyper.io/" />
	
	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://onhyper.io/" />
	<meta property="og:title" content="OnHyper — Ship Frontend Apps Without Leaking API Keys" />
	<meta property="og:description" content="Secure proxy platform for frontend developers. Call APIs without exposing secrets. Deploy in minutes." />
	<meta property="og:image" content="https://onhyper.io/og-image.png" />
	<meta property="og:site_name" content="OnHyper" />
	
	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://onhyper.io/" />
	<meta name="twitter:title" content="OnHyper — Ship Frontend Apps Without Leaking API Keys" />
	<meta name="twitter:description" content="Secure proxy platform for frontend developers. Call APIs without exposing secrets." />
	<meta name="twitter:image" content="https://onhyper.io/og-image.png" />
</svelte:head>

<Nav />

<!-- Hero Section -->
<section class="relative py-24 px-6 text-center overflow-hidden">
	<!-- Gradient background -->
	<div class="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none"></div>
	<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>
	
	<div class="relative max-w-4xl mx-auto">
		<div class="inline-flex items-center gap-2 text-sm font-semibold text-accent uppercase tracking-wide mb-6 bg-accent/10 px-4 py-2 rounded-full">
			<span>🔐</span>
			<span>Now in Public Beta</span>
		</div>
		
		<h1 class="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
			Ship frontend apps with<br>
			<span class="bg-gradient-to-r from-accent to-cyan-500 bg-clip-text text-transparent">
				zero leaked API keys
			</span>
		</h1>
		
		<p class="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-4 leading-relaxed">
			Store API keys server-side. Publish apps with HTML/CSS/JS.
		</p>
		<p class="text-base md:text-lg text-text-muted max-w-xl mx-auto mb-10">
			We inject your secrets securely — no backend required.
		</p>
		
		<div class="flex flex-wrap items-center justify-center gap-4 mb-12">
			<Button href="/signup" size="lg">
				Start Free →
			</Button>
			<Button href="/docs" variant="secondary" size="lg">
				View Docs
			</Button>
		</div>
		
		<!-- Code Example Window -->
		<div class="max-w-3xl mx-auto">
			<div class="bg-[#0d1117] rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/20">
				<!-- Window header -->
				<div class="flex items-center gap-2 px-4 py-3 bg-[#161b22] border-b border-white/5">
					<div class="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
					<div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
					<div class="w-3 h-3 rounded-full bg-[#27c93f]"></div>
					<span class="ml-3 text-xs text-gray-500 font-mono">app.js</span>
				</div>
				
				<!-- Code content -->
				<div class="p-6 text-left">
					<pre class="text-sm font-mono leading-relaxed overflow-x-auto"><code><span class="text-gray-500">// Your app just calls the proxy — no secrets needed!</span>
<span class="text-cyan-400">const</span> <span class="text-white">res</span> <span class="text-gray-300">=</span> <span class="text-cyan-400">await</span> <span class="text-yellow-300">fetch</span><span class="text-gray-300">(</span><span class="text-green-400">"/proxy/openai/v1/chat/completions"</span><span class="text-gray-300">, &#123;</span>
  <span class="text-orange-300">method</span><span class="text-gray-300">:</span> <span class="text-green-400">"POST"</span><span class="text-gray-300">,</span>
  <span class="text-orange-300">headers</span><span class="text-gray-300">: &#123;</span> <span class="text-green-400">"Content-Type"</span><span class="text-gray-300">:</span> <span class="text-green-400">"application/json"</span> <span class="text-gray-300">&#125;,</span>
  <span class="text-orange-300">body</span><span class="text-gray-300">:</span> <span class="text-yellow-300">JSON</span><span class="text-gray-300">.</span><span class="text-yellow-300">stringify</span><span class="text-gray-300">(&#123;</span>
    <span class="text-orange-300">model</span><span class="text-gray-300">:</span> <span class="text-green-400">"gpt-4"</span><span class="text-gray-300">,</span>
    <span class="text-orange-300">messages</span><span class="text-gray-300">:</span> <span class="text-gray-300">[&#123;</span> <span class="text-orange-300">role</span><span class="text-gray-300">:</span> <span class="text-green-400">"user"</span><span class="text-gray-300">,</span> <span class="text-orange-300">content</span><span class="text-gray-300">:</span> <span class="text-green-400">"Hello!"</span> <span class="text-gray-300">&#125;]</span>
  <span class="text-gray-300">&#125;)</span>
<span class="text-gray-300">&#125;);</span>

<span class="text-gray-500">// ↑ We inject your API key securely on the server</span></code></pre>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Social Proof: Metrics -->
<section class="py-16 px-6 bg-surface-alt border-y border-border">
	<div class="max-w-5xl mx-auto">
		<div class="grid grid-cols-3 gap-8 text-center">
			{#each metrics as metric}
				<div>
					<div class="text-3xl md:text-4xl font-extrabold text-accent mb-1">{metric.value}</div>
					<div class="text-sm text-text-muted">{metric.label}</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- How It Works -->
<section id="how-it-works" class="py-20 px-6 bg-surface">
	<div class="max-w-5xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">How It Works</h2>
		<p class="text-text-secondary text-center mb-12 max-w-xl mx-auto">
			Get started in minutes. No complex setup required.
		</p>
		
		<div class="grid md:grid-cols-4 gap-8">
			<div class="text-center">
				<div class="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
					<span class="text-2xl">🔑</span>
				</div>
				<div class="text-sm font-bold text-accent mb-1">Step 1</div>
				<h3 class="text-lg font-semibold mb-2">Add Your Keys</h3>
				<p class="text-text-secondary text-sm">Store API keys securely in our vault. Encrypted, never exposed.</p>
			</div>
			<div class="text-center">
				<div class="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
					<span class="text-2xl">📝</span>
				</div>
				<div class="text-sm font-bold text-accent mb-1">Step 2</div>
				<h3 class="text-lg font-semibold mb-2">Write Your App</h3>
				<p class="text-text-secondary text-sm">HTML, CSS, JS — any framework. Call /proxy/:endpoint directly.</p>
			</div>
			<div class="text-center">
				<div class="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
					<span class="text-2xl">🔄</span>
				</div>
				<div class="text-sm font-bold text-accent mb-1">Step 3</div>
				<h3 class="text-lg font-semibold mb-2">We Proxy & Inject</h3>
				<p class="text-text-secondary text-sm">Your request hits our server. We add your key, forward to API.</p>
			</div>
			<div class="text-center">
				<div class="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
					<span class="text-2xl">🚀</span>
				</div>
				<div class="text-sm font-bold text-accent mb-1">Step 4</div>
				<h3 class="text-lg font-semibold mb-2">Publish Instantly</h3>
				<p class="text-text-secondary text-sm">One click to live. Hosted, secured, and scaled automatically.</p>
			</div>
		</div>
		
		<div class="text-center mt-12">
			<Button href="/signup" variant="secondary">
				Get Started in 2 Minutes →
			</Button>
		</div>
	</div>
</section>

<!-- Use Cases -->
<section class="py-20 px-6 bg-surface-alt">
	<div class="max-w-5xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">Built for Developers</h2>
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
		<h2 class="text-3xl font-bold text-center mb-4">Everything You Need</h2>
		<p class="text-text-secondary text-center mb-12 max-w-xl mx-auto">
			All the tools to ship secure frontend apps.
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
		<p class="text-text-secondary text-center mb-12">Start free, scale as you grow. No hidden fees.</p>
		
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

<!-- Final CTA -->
<section class="py-20 px-6 bg-gradient-to-br from-accent/10 via-surface to-cyan-500/5">
	<div class="max-w-3xl mx-auto text-center">
		<h2 class="text-3xl md:text-4xl font-bold mb-4">
			Ready to ship without the leaks?
		</h2>
		<p class="text-text-secondary mb-8 max-w-lg mx-auto">
			Join hundreds of developers shipping secure frontend apps. 
			Start free in under 2 minutes.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-4">
			<Button href="/signup" size="lg">
				Start Free →
			</Button>
			<Button href="/docs" variant="secondary" size="lg">
				View Docs
			</Button>
		</div>
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
					Ship frontend apps without leaking API keys.
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
					<li><a href="/privacy" class="hover:text-text">Privacy</a></li>
					<li><a href="/terms" class="hover:text-text">Terms</a></li>
				</ul>
			</div>
		</div>
		<div class="pt-8 border-t border-border text-center text-text-muted text-sm">
			<p>© 2026 OnHyper.io — Built by <a href="https://hyper.io" class="text-accent hover:underline">hyper</a></p>
		</div>
	</div>
</footer>