<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
</script>

<svelte:head>
	<title>Terms of Service — OnHyper</title>
	<meta name="description" content="Terms of Service for OnHyper.io - Secure API proxy platform for frontend developers." />
</svelte:head>

<Nav />

<main class="py-16 px-6 bg-surface min-h-screen">
	<div class="max-w-3xl mx-auto">
		<header class="mb-12">
			<h1 class="text-3xl md:text-4xl font-bold mb-4">Terms of Service</h1>
			<p class="text-text-muted">Last Updated: February 15, 2026</p>
		</header>

		<div class="prose prose-invert max-w-none">
			<p class="text-lg text-text-secondary mb-8">
				Welcome to OnHyper.io. These Terms of Service ("Terms") govern your use of our platform and services. By creating an account or using OnHyper, you agree to these Terms.
			</p>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">1. Acceptance of Terms</h2>
				<p class="text-text-secondary mb-4">
					By accessing or using OnHyper.io ("Service"), you agree to be bound by these Terms and our Privacy Policy. If you don't agree to these terms, please don't use our Service.
				</p>
				<p class="text-text-secondary">
					You must be at least 13 years old to use OnHyper. If you're using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">2. Account Registration</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">2.1 Account Creation</h3>
				<p class="text-text-secondary mb-4">
					To use OnHyper, you'll need to create an account with a valid email address and a secure password. You're responsible for maintaining the accuracy of your account information and keeping your password confidential.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">2.2 Account Security</h3>
				<p class="text-text-secondary">
					You are responsible for all activity under your account, keeping your login credentials secure, and notifying us immediately if you suspect unauthorized access. We reserve the right to suspend or terminate accounts that we believe have been compromised or used in violation of these Terms.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">3. Acceptable Use Policy</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">3.1 Permitted Use</h3>
				<p class="text-text-secondary mb-4">
					You may use OnHyper to create and publish web applications, store API keys securely for use in your applications, and make authorized API calls through our proxy service.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">3.2 Prohibited Activities</h3>
				<ul class="list-disc list-inside text-text-secondary space-y-2 mb-4">
					<li>Distribute malware, spyware, or other malicious code</li>
					<li>Host illegal content or facilitate illegal activities</li>
					<li>Attempt to access other users' data without authorization</li>
					<li>Overload our infrastructure or attempt to disrupt the Service</li>
					<li>Use the Service to attack, exploit, or abuse third-party APIs</li>
					<li>Scrape, harvest, or collect user data without consent</li>
					<li>Publish content that violates applicable laws</li>
				</ul>

				<h3 class="text-lg font-semibold mb-2 text-text">3.3 API Usage</h3>
				<p class="text-text-secondary">
					When using API proxy features, you must have valid authorization for each API key you store, comply with the terms of each third-party API you use, are responsible for all costs associated with your API usage, and must not exceed rate limits or terms of service of upstream providers.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">4. API Key Storage and Security</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">4.1 Your API Keys</h3>
				<p class="text-text-secondary mb-4">
					You retain full ownership of all API keys you store on OnHyper. These keys remain your property and are stored on your behalf.
				</p>
				<div class="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
					<h4 class="font-semibold text-accent mb-2">Important disclosures:</h4>
					<ul class="text-text-secondary space-y-1">
						<li>• API keys are encrypted using <strong class="text-text">AES-256-GCM</strong> encryption before storage</li>
						<li>• Keys are decrypted only when making authorized requests on your behalf</li>
						<li>• We never share, sell, or expose your API keys to third parties</li>
						<li>• We never use your API keys for any purpose other than fulfilling your requests</li>
					</ul>
				</div>

				<h3 class="text-lg font-semibold mb-2 text-text">4.2 Our Security Measures</h3>
				<p class="text-text-secondary mb-4">
					We implement industry-standard security practices including end-to-end encryption for API keys in transit and at rest, access controls and authentication requirements, regular security audits and monitoring, and encrypted backups with separate key management.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">4.3 Your Responsibilities</h3>
				<p class="text-text-secondary">
					You are responsible for ensuring you have authorization to store each API key, monitoring usage of your stored API keys, removing API keys you no longer need or authorize, and notifying us immediately if you suspect unauthorized access.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">5. User Content and App Ownership</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">5.1 Your Content</h3>
				<p class="text-text-secondary mb-4">
					You retain full ownership of all code, HTML, CSS, and JavaScript you upload, application designs and functionality, and any content or data you create or upload.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">5.2 License to OnHyper</h3>
				<p class="text-text-secondary mb-4">
					By uploading content, you grant OnHyper a limited license to store and host your applications, display your published apps at the URLs we provide, and make backups for reliability and recovery purposes. This license terminates when you delete your content or close your account.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">5.3 Public Apps</h3>
				<p class="text-text-secondary">
					If you publish apps publicly, anyone with the URL can access your app. You are responsible for the content displayed in your apps and must not expose sensitive data through public apps.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">6. Payment Terms</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">6.1 Current Status</h3>
				<p class="text-text-secondary mb-4">
					During our pilot phase, all accounts are free. Payment features are not yet enabled.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">6.2 Future Paid Plans</h3>
				<p class="text-text-secondary">
					When paid plans become available, you will be charged according to the plan you select, billed monthly or annually to your payment method on file, with upgrades taking effect immediately and downgrades at the next billing cycle.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">7. Disclaimers and Limitation of Liability</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">7.1 Service Provided "As Is"</h3>
				<p class="text-text-secondary mb-4">
					The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">7.2 Limitation of Liability</h3>
				<p class="text-text-secondary">
					To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages, loss of profits, data, or business opportunities. Our total liability shall not exceed the amount you paid (if any) in the 12 months preceding the claim.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">8. Termination</h2>
				<p class="text-text-secondary mb-4">
					You may close your account at any time through your dashboard or by contacting us. Upon termination, your published apps will become inaccessible, your API keys will be deleted from our systems, and your data will be removed within 30 days.
				</p>
				<p class="text-text-secondary">
					We may suspend or terminate your account for violation of these Terms, violation of our Acceptable Use Policy, extended periods of inactivity, abusive behavior toward staff or other users, or legal requirements.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">9. Changes to Terms</h2>
				<p class="text-text-secondary">
					We may update these Terms periodically. Changes will be posted on this page with an updated date and communicated via email for significant changes. They are effective 30 days after posting (unless immediate action is required for security or legal reasons). Continued use of the Service after changes constitutes acceptance of the new Terms.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">10. Governing Law</h2>
				<p class="text-text-secondary">
					These Terms are governed by the laws of the United States and the State of Delaware, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration in Delaware, except where prohibited by law.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">11. Contact Information</h2>
				<p class="text-text-secondary mb-2">For questions about these Terms:</p>
				<ul class="text-text-secondary">
					<li>Email: <a href="mailto:legal@onhyper.io" class="text-accent hover:underline">legal@onhyper.io</a></li>
					<li>Website: <a href="/legal/terms" class="text-accent hover:underline">onhyper.io/legal/terms</a></li>
				</ul>
			</section>
		</div>

		<div class="mt-12 pt-8 border-t border-border">
			<a href="/legal/privacy" class="text-accent hover:underline">View Privacy Policy →</a>
		</div>
	</div>
</main>

<footer class="py-8 px-6 border-t border-border bg-surface">
	<div class="max-w-6xl mx-auto text-center text-text-muted text-sm">
		<p>© 2026 OnHyper.io — Built by <a href="https://hyper.io" class="text-accent hover:underline">hyper</a></p>
	</div>
</footer>