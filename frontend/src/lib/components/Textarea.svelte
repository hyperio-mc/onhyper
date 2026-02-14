<script lang="ts">
	interface Props {
		name: string;
		label?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		error?: string;
		rows?: number;
		class?: string;
	}

	let { name, label, value = $bindable(''), placeholder, disabled, required, error, rows = 6, class: className }: Props = $props();
</script>

<div class="flex flex-col gap-1.5 {className || ''}">
	{#if label}
		<label for={name} class="text-sm font-medium text-text">
			{label}
			{#if required}
				<span class="text-error">*</span>
			{/if}
		</label>
	{/if}
	<textarea
		id={name}
		{name}
		bind:value
		{placeholder}
		{disabled}
		{required}
		{rows}
		class="px-4 py-2.5 text-sm font-mono border border-border rounded-lg bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-surface-alt disabled:cursor-not-allowed resize-y {error ? 'border-error' : ''}"
	></textarea>
	{#if error}
		<span class="text-xs text-error">{error}</span>
	{/if}
</div>