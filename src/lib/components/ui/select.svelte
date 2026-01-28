<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Option {
		value: string;
		label: string;
		group?: string;
	}

	interface Props {
		value?: string;
		options: Option[];
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		options,
		placeholder = 'Select...',
		disabled = false,
		class: className = '',
		onchange
	}: Props = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		value = target.value;
		onchange?.(target.value);
	}
</script>

<select
	{value}
	{disabled}
	class={cn(
		'flex h-8 w-full items-center rounded-sm border border-border bg-background px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-border disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	onchange={handleChange}
>
	{#if placeholder}
		<option value="" disabled>{placeholder}</option>
	{/if}
	{#each options as option}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>
