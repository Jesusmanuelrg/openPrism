<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { X } from 'lucide-svelte';

	interface Props {
		open?: boolean;
		title?: string;
		description?: string;
		class?: string;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title = '',
		description = '',
		class: className = '',
		onclose,
		children
	}: Props & { children?: import('svelte').Snippet } = $props();

	function close() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			close();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class={cn(
				'relative w-full max-w-sm rounded-sm border border-border bg-background p-5 shadow-lg',
				className
			)}
		>
			<button
				type="button"
				class="absolute right-3 top-3 p-1 rounded-sm hover:bg-muted transition-colors"
				onclick={close}
			>
				<X class="h-3.5 w-3.5 text-muted-foreground" />
				<span class="sr-only">Close</span>
			</button>
			{#if title}
				<h2 class="text-sm font-medium">{title}</h2>
			{/if}
			{#if description}
				<p class="mt-1 text-xs text-muted-foreground">{description}</p>
			{/if}
			<div class="mt-4">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
