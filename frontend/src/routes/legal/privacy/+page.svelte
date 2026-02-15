<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
</script>

<svelte:head>
	<title>Privacy Policy — OnHyper</title>
	<meta name="description" content="Privacy Policy for OnHyper.io - Learn how we protect your data and API keys." />
</svelte:head>

<Nav />

<main class="py-16 px-6 bg-surface min-h-screen">
	<div class="max-w-3xl mx-auto">
		<header class="mb-12">
			<h1 class="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
			<p class="text-text-muted">Last Updated: February 15, 2026</p>
		</header>

		<div class="prose prose-invert max-w-none">
			<p class="text-lg text-text-secondary mb-8">
				At OnHyper.io, we take your privacy seriously. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your personal information.
			</p>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">1. What Data We Collect</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">1.1 Account Information</h3>
				<p class="text-text-secondary mb-4">
					When you create an account, we collect your <strong class="text-text">email address</strong> (used for authentication and communications) and your <strong class="text-text">password</strong> (stored as a secure cryptographic hash — we never store plain text passwords).
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">1.2 API Keys</h3>
				<p class="text-text-secondary mb-4">
					You may choose to store API keys in our secure vault. These keys are encrypted using AES-256-GCM before storage, are only used to fulfill your requests to third-party APIs, and remain your property at all times.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">1.3 Application Content</h3>
				<p class="text-text-secondary mb-4">
					When you create apps on our platform, we store HTML, CSS, and JavaScript code you upload, app configuration and settings, and logs of app deployment and changes.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">1.4 Usage Data</h3>
				<p class="text-text-secondary">
					We automatically collect request logs (API proxy requests with timestamp, endpoint, success/failure), access logs (pages visited, features used), device information (browser type, OS, IP address), and performance metrics (response times, error rates).
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">2. How We Use Your Data</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">2.1 Providing the Service</h3>
				<p class="text-text-secondary mb-4">
					We use your data to create and maintain your account, authenticate your access, store and serve your applications, execute API proxy requests on your behalf, process payments (when applicable), and send service-related notifications.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">2.2 Improving the Service</h3>
				<p class="text-text-secondary">
					We use anonymized and aggregated data to identify and fix bugs, improve performance and reliability, develop new features, and understand usage patterns.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">3. API Key Security</h2>
				
				<div class="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-4">
					<h3 class="font-semibold text-accent mb-3">Our Security Commitments</h3>
					<ul class="text-text-secondary space-y-2">
						<li>✓ <strong class="text-text">AES-256-GCM</strong> encryption for all API keys at rest</li>
						<li>✓ <strong class="text-text">TLS 1.2+</strong> for all data in transit</li>
						<li>✓ Secure key management with strict access controls</li>
					</ul>
				</div>

				<h3 class="text-lg font-semibold mb-2 text-text">3.1 Access Control</h3>
				<p class="text-text-secondary mb-4">
					Your API keys are only accessed when you make an authenticated request through our proxy, you view or manage keys through your secure dashboard, or authorized support staff assist you (logged and audited).
				</p>

				<div class="bg-surface-alt border border-border rounded-lg p-4 mb-4">
					<h3 class="font-semibold text-text mb-3">We Will Never</h3>
					<ul class="text-text-secondary space-y-1">
						<li>✗ Share, sell, or rent your API keys to third parties</li>
						<li>✗ Use your API keys for purposes other than your requests</li>
						<li>✗ Expose your keys in logs, errors, or responses</li>
					</ul>
				</div>

				<h3 class="text-lg font-semibold mb-2 text-text">3.2 Your Responsibilities</h3>
				<p class="text-text-secondary">
					You should regularly review and rotate your API keys, remove keys you no longer need, and use the principle of least privilege when creating API keys.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">4. Data Storage and Security</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">4.1 Where We Store Data</h3>
				<p class="text-text-secondary mb-4">
					Your data is stored in the United States in secure data centers, encrypted databases with access controls, and geographically distributed backups.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">4.2 Security Measures</h3>
				<ul class="list-disc list-inside text-text-secondary space-y-2 mb-4">
					<li><strong class="text-text">Encryption:</strong> All sensitive data encrypted at rest and in transit</li>
					<li><strong class="text-text">Access controls:</strong> Role-based access, multi-factor authentication for staff</li>
					<li><strong class="text-text">Monitoring:</strong> 24/7 security monitoring and alerting</li>
					<li><strong class="text-text">Auditing:</strong> Regular security assessments and penetration testing</li>
					<li><strong class="text-text">Backups:</strong> Encrypted backups with separate key management</li>
				</ul>

				<h3 class="text-lg font-semibold mb-2 text-text">4.3 Data Retention</h3>
				<div class="overflow-x-auto">
					<table class="w-full text-sm text-left text-text-secondary">
						<thead class="text-text uppercase bg-surface-alt border-b border-border">
							<tr>
								<th class="px-4 py-3">Data Type</th>
								<th class="px-4 py-3">Retention Period</th>
							</tr>
						</thead>
						<tbody>
							<tr class="border-b border-border">
								<td class="px-4 py-3">Account data</td>
								<td class="px-4 py-3">While account exists + 30 days</td>
							</tr>
							<tr class="border-b border-border">
								<td class="px-4 py-3">API keys</td>
								<td class="px-4 py-3">Deleted immediately on account closure</td>
							</tr>
							<tr class="border-b border-border">
								<td class="px-4 py-3">App code</td>
								<td class="px-4 py-3">While account exists + 7 days</td>
							</tr>
							<tr class="border-b border-border">
								<td class="px-4 py-3">Request logs</td>
								<td class="px-4 py-3">90 days (anonymized after 30 days)</td>
							</tr>
							<tr class="border-b border-border">
								<td class="px-4 py-3">Error logs</td>
								<td class="px-4 py-3">30 days</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">5. Third-Party Sharing</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">5.1 Service Providers</h3>
				<p class="text-text-secondary mb-4">
					We share limited data with trusted service providers who assist us in operating the platform (cloud hosting, email provider, payment processor). All service providers are bound by confidentiality agreements and data protection requirements.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">5.2 Your API Keys and Third-Party APIs</h3>
				<p class="text-text-secondary mb-4">
					When you use our proxy service, your API key is added to requests destined for the third-party API you specify, transmitted securely over TLS to that API provider, and never shared with any party other than the API provider you designate.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">5.3 Legal Requirements</h3>
				<p class="text-text-secondary">
					We may disclose data if required by valid legal process (court order, subpoena), law enforcement requests (with appropriate legal basis), protection of our rights, safety, or property, or protection of other users. We will notify you of legal requests unless prohibited by law.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">6. Your Rights</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">6.1 Access and Export</h3>
				<p class="text-text-secondary mb-4">
					You can access your personal data at any time through your dashboard or by email request. You can export your data by downloading your app code or requesting a full export at privacy@onhyper.io. We will provide your data in a machine-readable format within 30 days.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">6.2 Correct Your Data</h3>
				<p class="text-text-secondary mb-4">
					You can update your information through account settings in your dashboard or via email request.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">6.3 Delete Your Data</h3>
				<p class="text-text-secondary mb-4">
					You can request deletion by closing your account through your dashboard or emailing privacy@onhyper.io with "Delete My Account". Upon deletion, your API keys are deleted immediately, your apps are unpublished and deleted within 7 days, and your account data is deleted within 30 days.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">6.4 Regional Rights</h3>
				<div class="bg-surface-alt border border-border rounded-lg p-4 mb-4">
					<p class="text-text-secondary mb-2"><strong class="text-text">GDPR (EU/EEA):</strong> You have the right to lodge a complaint with your local data protection authority.</p>
					<p class="text-text-secondary"><strong class="text-text">CCPA (California):</strong> You have the right to know what personal information is collected, say no to the sale of personal information, access your personal information, and receive equal service even if you exercise your privacy rights. We do not sell personal information.</p>
				</div>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">7. Cookies and Tracking</h2>
				
				<h3 class="text-lg font-semibold mb-2 text-text">7.1 Essential Cookies</h3>
				<p class="text-text-secondary mb-4">
					We use essential cookies for authentication (keeping you logged in), security (CSRF protection), and basic functionality. These cookies cannot be disabled while using the service.
				</p>

				<h3 class="text-lg font-semibold mb-2 text-text">7.2 Analytics Cookies</h3>
				<p class="text-text-secondary">
					We use analytics cookies to understand how users interact with the platform, identify errors and performance issues, and improve user experience. You can opt out of analytics cookies through your browser settings.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">8. Children's Privacy</h2>
				<p class="text-text-secondary">
					OnHyper is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">9. Data Breach Notification</h2>
				<p class="text-text-secondary">
					If we become aware of a data breach affecting your personal information, we will notify affected users within 72 hours, describe the nature of the breach, explain steps we're taking to mitigate harm, and provide recommendations for protecting yourself. Notifications will be sent via email to your registered email address.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">10. Changes to This Policy</h2>
				<p class="text-text-secondary">
					We may update this Privacy Policy periodically. Changes will be posted on this page with an updated date and communicated via email for significant changes. They are effective 30 days after posting. Continued use of the Service after changes constitutes acceptance of the updated policy.
				</p>
			</section>

			<section class="mb-10">
				<h2 class="text-xl font-bold mb-4 text-text border-b border-border pb-2">11. Contact Us</h2>
				<p class="text-text-secondary mb-2">For privacy-related questions or to exercise your rights:</p>
				<ul class="text-text-secondary">
					<li>Email: <a href="mailto:privacy@onhyper.io" class="text-accent hover:underline">privacy@onhyper.io</a></li>
					<li>Website: <a href="/legal/privacy" class="text-accent hover:underline">onhyper.io/legal/privacy</a></li>
				</ul>
				<p class="text-text-secondary mt-4">We will respond to verified requests within 30 days.</p>
			</section>
		</div>

		<div class="mt-12 pt-8 border-t border-border">
			<a href="/legal/terms" class="text-accent hover:underline">View Terms of Service →</a>
		</div>
	</div>
</main>

<footer class="py-8 px-6 border-t border-border bg-surface">
	<div class="max-w-6xl mx-auto text-center text-text-muted text-sm">
		<p>© 2026 OnHyper.io — Built by <a href="https://hyper.io" class="text-accent hover:underline">hyper</a></p>
	</div>
</footer>