<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Tab {
		id: string;
		label: string;
	}

	interface Props {
		tabs: Tab[];
		activeTab?: string;
		class?: string;
		onchange?: (tabId: string) => void;
	}

	let {
		tabs,
		activeTab = $bindable(tabs[0]?.id ?? ''),
		class: className = '',
		onchange
	}: Props = $props();

	function selectTab(tabId: string) {
		activeTab = tabId;
		onchange?.(tabId);
	}
</script>

<div class={cn('inline-flex h-7 items-center justify-center rounded-sm bg-muted p-0.5 text-muted-foreground', className)}>
	{#each tabs as tab}
		<button
			type="button"
			class={cn(
				'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2.5 py-1 text-xs font-medium transition-all',
				activeTab === tab.id && 'bg-background text-foreground shadow-sm'
			)}
			onclick={() => selectTab(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
