<script lang="ts">
	interface Props {
		type?: 'button' | 'submit' | 'reset';
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		href?: string;
		target?: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children?: import('svelte').Snippet;
	}

	let { 
		type = 'button', 
		variant = 'primary', 
		size = 'md', 
		disabled = false, 
		loading = false, 
		href, 
		target,
		class: className,
		onclick,
		children 
	}: Props = $props();

	const variantClasses: Record<string, string> = {
		primary: 'bg-accent text-white hover:bg-accent-hover',
		secondary: 'bg-surface-alt text-text hover:bg-border border border-border',
		ghost: 'bg-transparent text-text-secondary hover:text-text hover:bg-surface-alt',
		danger: 'bg-error text-white hover:bg-red-600'
	};

	const sizeClasses: Record<string, string> = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	const classes = [
		'font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2',
		variantClasses[variant],
		sizeClasses[size],
		disabled || loading ? 'opacity-50 cursor-not-allowed' : '',
		className || ''
	].filter(Boolean).join(' ');
</script>

{#if href}
	<a {href} {target} class={classes}>
		{#if loading}
			<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
			</svg>
		{/if}
		{@render children?.()}
	</a>
{:else}
	<button 
		{type}
		class={classes}
		disabled={disabled || loading}
		{onclick}
	>
		{#if loading}
			<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
			</svg>
		{/if}
		{@render children?.()}
	</button>
{/if}