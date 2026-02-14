<script lang="ts">
	interface Props {
		name: string;
		label?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		error?: string;
		options: { value: string; label: string }[];
		class?: string;
	}

	let { name, label, value = $bindable(''), placeholder, disabled, required, error, options, class: className }: Props = $props();
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
	<select
		id={name}
		{name}
		bind:value
		{disabled}
		{required}
		class="px-4 py-2.5 text-sm border border-border rounded-lg bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:bg-surface-alt disabled:cursor-not-allowed {error ? 'border-error' : ''}"
	>
		{#if placeholder}
			<option value="" disabled>{placeholder}</option>
		{/if}
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	{#if error}
		<span class="text-xs text-error">{error}</span>
	{/if}
</div>