<script lang="ts">
	interface Props {
		title?: string;
		subtitle?: string;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { title, subtitle, class: className, children }: Props = $props();
</script>

<div class="bg-surface rounded-xl border border-border overflow-hidden {className || ''}">
	{#if title}
		<div class="px-6 py-4 border-b border-border-light">
			<h3 class="text-lg font-semibold text-text">{title}</h3>
			{#if subtitle}
				<p class="text-sm text-text-secondary mt-1">{subtitle}</p>
			{/if}
		</div>
	{/if}
	<div class="p-6">
		{@render children?.()}
	</div>
</div>