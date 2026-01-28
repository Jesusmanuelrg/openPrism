<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
	}

	let { class: className = '', children }: Props & { children?: import('svelte').Snippet } = $props();
</script>

<div class={cn('rounded-xl border bg-card text-card-foreground shadow', className)}>
	{@render children?.()}
</div>
