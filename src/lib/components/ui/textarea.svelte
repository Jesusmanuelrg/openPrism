<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		rows?: number;
		class?: string;
		oninput?: (e: Event) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let {
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		rows = 3,
		class: className = '',
		oninput,
		onkeydown
	}: Props = $props();
</script>

<textarea
	bind:value
	{placeholder}
	{disabled}
	{rows}
	class={cn(
		'flex min-h-[60px] w-full rounded-sm border border-border bg-background px-2.5 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{oninput}
	{onkeydown}
></textarea>
