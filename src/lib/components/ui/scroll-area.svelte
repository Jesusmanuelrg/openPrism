<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
	}

	let { class: className = '', children }: Props & { children?: import('svelte').Snippet } = $props();
</script>

<div class={cn('relative overflow-auto', className)}>
	{@render children?.()}
</div>
