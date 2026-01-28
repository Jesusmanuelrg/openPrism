<script lang="ts">
	import { projectStore, activeFile } from '$lib/stores';
	import { createSupabaseClient } from '$lib/supabase';
	import { addToast } from '$lib/components/ui/toast.svelte';
	import { Button, Input, Dialog } from '$lib/components/ui';
	import { File, FilePlus, Trash2, FolderOpen } from 'lucide-svelte';

	interface Props {
		projectId: string;
	}

	let { projectId }: Props = $props();

	const supabase = createSupabaseClient();

	let showNewFileDialog = $state(false);
	let newFileName = $state('');
	let creating = $state(false);

	async function createFile() {
		if (!newFileName.trim()) return;

		creating = true;
		let path = newFileName.trim();

		// Add default extension based on project format
		if (!path.includes('.')) {
			const format = $projectStore.project?.format ?? 'latex';
			path += format === 'latex' ? '.tex' : '.typ';
		}

		const { data: file, error } = await supabase
			.from('project_files')
			.insert({
				project_id: projectId,
				path,
				content: '',
				type: 'document'
			} as any)
			.select()
			.single();

		if (error) {
			addToast('error', error.message);
		} else if (file) {
			projectStore.addFile(file as any);
			projectStore.setActiveFile((file as any).id);
			showNewFileDialog = false;
			newFileName = '';
		}

		creating = false;
	}

	async function deleteFile(fileId: string, e: MouseEvent) {
		e.stopPropagation();
		if (!confirm('Delete this file?')) return;

		const { error } = await supabase.from('project_files').delete().eq('id', fileId);

		if (error) {
			addToast('error', 'Failed to delete file');
		} else {
			projectStore.removeFile(fileId);
		}
	}

	function selectFile(fileId: string) {
		projectStore.setActiveFile(fileId);
	}
</script>

<div class="flex flex-col h-full">
	<div class="p-2 border-b">
		<Button variant="outline" size="sm" class="w-full" onclick={() => (showNewFileDialog = true)}>
			<FilePlus class="mr-2 h-4 w-4" />
			New File
		</Button>
	</div>

	<div class="flex-1 overflow-auto p-2">
		{#if $projectStore.files.length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
				<FolderOpen class="h-8 w-8 opacity-50" />
				<p class="mt-2 text-sm">No files yet</p>
			</div>
		{:else}
			<ul class="space-y-1">
				{#each $projectStore.files as file (file.id)}
					<li class="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent {$activeFile?.id === file.id ? 'bg-accent text-accent-foreground' : ''}">
						<button
							type="button"
							class="flex flex-1 items-center gap-2"
							onclick={() => selectFile(file.id)}
						>
							<File class="h-4 w-4 shrink-0 text-muted-foreground" />
							<span class="flex-1 truncate text-left">{file.path}</span>
						</button>
						<button
							type="button"
							class="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive"
							onclick={(e) => deleteFile(file.id, e)}
						>
							<Trash2 class="h-3 w-3" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<Dialog bind:open={showNewFileDialog} title="Create New File">
	<form onsubmit={(e) => { e.preventDefault(); createFile(); }}>
		<Input
			bind:value={newFileName}
			placeholder="filename.tex"
			disabled={creating}
			class="mb-4"
		/>
		<div class="flex justify-end gap-2">
			<Button variant="outline" onclick={() => (showNewFileDialog = false)}>Cancel</Button>
			<Button type="submit" disabled={creating || !newFileName.trim()}>Create</Button>
		</div>
	</form>
</Dialog>
