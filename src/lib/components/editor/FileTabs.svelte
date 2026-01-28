<script lang="ts">
	import { X } from 'lucide-svelte';
	import type { ProjectFile } from '$lib/utils/database.types';

	interface Props {
		files: ProjectFile[];
		openFileIds: string[];
		activeFileId: string | null;
		onSelect: (fileId: string) => void;
		onClose: (fileId: string) => void;
	}

	let { files, openFileIds, activeFileId, onSelect, onClose }: Props = $props();

	// Get only the open files in their tab order
	const openFiles = $derived(
		openFileIds
			.map((id) => files.find((f) => f.id === id))
			.filter((f): f is ProjectFile => f !== undefined)
	);

	// Extract just the filename from path
	function getFileName(path: string): string {
		return path.split('/').pop() || path;
	}
</script>

{#if openFiles.length > 0}
	<div class="h-9 flex items-center gap-1 px-2 border-b border-border-subtle bg-muted/20 overflow-x-auto scrollbar-thin">
		{#each openFiles as file (file.id)}
			{@const isActive = file.id === activeFileId}
			<div
				class="group flex items-center gap-1 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors shrink-0 {isActive
					? 'bg-background text-foreground shadow-sm border border-border/50'
					: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}"
				title={file.path}
				role="tab"
				tabindex="0"
				aria-selected={isActive}
				onclick={() => onSelect(file.id)}
				onkeydown={(e) => e.key === 'Enter' && onSelect(file.id)}
			>
				<span class="truncate max-w-32">{getFileName(file.path)}</span>
				<button
					type="button"
					class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all {isActive ? 'opacity-60' : ''}"
					onclick={(e) => {
						e.stopPropagation();
						onClose(file.id);
					}}
					title="Close"
				>
					<X class="h-3 w-3" />
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.scrollbar-thin::-webkit-scrollbar {
		height: 4px;
	}
	.scrollbar-thin::-webkit-scrollbar-track {
		background: transparent;
	}
	.scrollbar-thin::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 2px;
	}
</style>
