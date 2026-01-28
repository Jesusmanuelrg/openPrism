<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		type?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		oninput?: (e: Event) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		class: className = '',
		oninput,
		onkeydown
	}: Props = $props();
</script>

<input
	{type}
	bind:value
	{placeholder}
	{disabled}
	class={cn(
		'flex h-8 w-full rounded-sm border border-border bg-background px-2.5 py-1.5 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{oninput}
	{onkeydown}
/>
