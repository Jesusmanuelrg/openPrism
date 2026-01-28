<script lang="ts">
	import { computeDiff, type DiffLine } from '$lib/utils/diff';

	interface Props {
		oldCode: string;
		newCode: string;
		maxLines?: number;
		class?: string;
	}

	let { oldCode, newCode, maxLines = 10, class: className = '' }: Props = $props();

	const diffLines = $derived(computeDiff(oldCode || '', newCode || ''));

	// Limit displayed lines if too many
	const displayLines = $derived(() => {
		if (diffLines.length <= maxLines) return { lines: diffLines, truncated: false };

		// Show first and last lines with ellipsis
		const half = Math.floor(maxLines / 2);
		return {
			lines: [...diffLines.slice(0, half), null, ...diffLines.slice(-half)],
			truncated: true,
			hiddenCount: diffLines.length - maxLines
		};
	});

	function getLineClass(type: DiffLine['type']): string {
		switch (type) {
			case 'add':
				return 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-200';
			case 'remove':
				return 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200';
			default:
				return 'bg-muted/30 text-muted-foreground';
		}
	}

	function getPrefixClass(type: DiffLine['type']): string {
		switch (type) {
			case 'add':
				return 'text-green-600 dark:text-green-400';
			case 'remove':
				return 'text-red-600 dark:text-red-400';
			default:
				return 'text-muted-foreground/50';
		}
	}
</script>

<div class="diff-view rounded-lg overflow-hidden border border-border/50 {className}">
	<div class="font-mono text-[11px] leading-relaxed">
		{#each displayLines().lines as line, i}
			{#if line === null}
				<div class="px-3 py-1 bg-muted/50 text-center text-muted-foreground text-[10px] border-y border-border/30">
					... {displayLines().hiddenCount} more lines ...
				</div>
			{:else}
				<div class="flex {getLineClass(line.type)} border-b border-border/20 last:border-b-0">
					<!-- Line number -->
					<span class="w-8 px-2 py-0.5 text-right text-muted-foreground/60 select-none shrink-0 bg-black/5 dark:bg-white/5">
						{line.type === 'remove' ? line.oldLineNumber : line.newLineNumber || ''}
					</span>

					<!-- Prefix (+/-/space) -->
					<span class="w-5 py-0.5 text-center select-none shrink-0 font-bold {getPrefixClass(line.type)}">
						{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
					</span>

					<!-- Content -->
					<pre class="flex-1 py-0.5 pr-3 whitespace-pre-wrap break-all">{line.content || ' '}</pre>
				</div>
			{/if}
		{/each}
	</div>
</div>
