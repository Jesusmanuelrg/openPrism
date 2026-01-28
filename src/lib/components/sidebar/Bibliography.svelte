<script lang="ts">
	import { projectStore } from '$lib/stores';
	import { createSupabaseClient } from '$lib/supabase';
	import { addToast } from '$lib/components/ui/toast.svelte';
	import { Button, Input, Dialog, ScrollArea } from '$lib/components/ui';
	import { BookOpen, Plus, Trash2, Copy, Search } from 'lucide-svelte';
	import type { Bibliography } from '$lib/utils/database.types';

	interface Props {
		projectId: string;
	}

	let { projectId }: Props = $props();

	const supabase = createSupabaseClient();

	let showAddDialog = $state(false);
	let doi = $state('');
	let loading = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let searching = $state(false);

	$effect(() => {
		if (searchQuery.trim().length >= 3) {
			const timeout = setTimeout(() => searchLiterature(), 500);
			return () => clearTimeout(timeout);
		} else {
			searchResults = [];
		}
	});

	async function searchLiterature() {
		if (!searchQuery.trim()) return;

		searching = true;
		try {
			const response = await fetch(
				`/api/search?q=${encodeURIComponent(searchQuery)}`
			);
			const data = await response.json();
			searchResults = data.papers || [];
		} catch (err) {
			console.error('Search error:', err);
		}
		searching = false;
	}

	async function addByDoi() {
		if (!doi.trim()) return;

		loading = true;
		try {
			const response = await fetch('/api/bibliography', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectId, doi: doi.trim() })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to add reference');
			}

			const entry = await response.json();
			projectStore.addBibEntry(entry);
			showAddDialog = false;
			doi = '';
			addToast('success', 'Reference added');
		} catch (err) {
			addToast('error', err instanceof Error ? err.message : 'Failed to add reference');
		}
		loading = false;
	}

	async function addFromSearch(paper: any) {
		if (!paper.doi) {
			addToast('error', 'No DOI available for this paper');
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/bibliography', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectId, doi: paper.doi })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to add reference');
			}

			const entry = await response.json();
			projectStore.addBibEntry(entry);
			addToast('success', 'Reference added');
		} catch (err) {
			addToast('error', err instanceof Error ? err.message : 'Failed to add reference');
		}
		loading = false;
	}

	async function deleteEntry(entryId: string) {
		if (!confirm('Delete this reference?')) return;

		const { error } = await supabase.from('bibliography').delete().eq('id', entryId);

		if (error) {
			addToast('error', 'Failed to delete reference');
		} else {
			projectStore.removeBibEntry(entryId);
		}
	}

	function copyCiteKey(citeKey: string) {
		navigator.clipboard.writeText(`\\cite{${citeKey}}`);
		addToast('info', 'Citation copied to clipboard');
	}

	function getEntryTitle(entry: Bibliography): string {
		const metadata = entry.metadata as { title?: string };
		return metadata?.title || entry.cite_key;
	}

	function getEntryAuthors(entry: Bibliography): string {
		const metadata = entry.metadata as { authors?: Array<{ name: string }> };
		if (!metadata?.authors?.length) return '';
		const authors = metadata.authors.slice(0, 3).map((a) => a.name);
		if (metadata.authors.length > 3) authors.push('et al.');
		return authors.join(', ');
	}

	function getEntryYear(entry: Bibliography): string {
		const metadata = entry.metadata as { year?: number };
		return metadata?.year?.toString() || '';
	}
</script>

<div class="flex flex-col h-full">
	<div class="p-2 border-b">
		<Button variant="outline" size="sm" class="w-full" onclick={() => (showAddDialog = true)}>
			<Plus class="mr-2 h-4 w-4" />
			Add Reference
		</Button>
	</div>

	<ScrollArea class="flex-1 p-2">
		{#if $projectStore.bibliography.length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
				<BookOpen class="h-8 w-8 opacity-50" />
				<p class="mt-2 text-sm">No references yet</p>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each $projectStore.bibliography as entry (entry.id)}
					<li class="group rounded-md border p-2 text-sm hover:bg-accent/50">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1 min-w-0">
								<p class="font-medium truncate">{getEntryTitle(entry)}</p>
								<p class="text-xs text-muted-foreground truncate">
									{getEntryAuthors(entry)}
									{#if getEntryYear(entry)}
										({getEntryYear(entry)})
									{/if}
								</p>
								<p class="mt-1 font-mono text-xs text-primary">{entry.cite_key}</p>
							</div>
							<div class="flex gap-1 opacity-0 group-hover:opacity-100">
								<button
									type="button"
									class="p-1 hover:text-primary"
									onclick={() => copyCiteKey(entry.cite_key)}
									title="Copy citation"
								>
									<Copy class="h-3 w-3" />
								</button>
								<button
									type="button"
									class="p-1 hover:text-destructive"
									onclick={() => deleteEntry(entry.id)}
									title="Delete"
								>
									<Trash2 class="h-3 w-3" />
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</ScrollArea>
</div>

<Dialog bind:open={showAddDialog} title="Add Reference" class="max-w-lg">
	<div class="space-y-4">
		<div>
			<span class="text-sm font-medium">Add by DOI</span>
			<div class="mt-1 flex gap-2">
				<Input
					bind:value={doi}
					placeholder="10.1000/xyz123"
					disabled={loading}
					class="flex-1"
				/>
				<Button onclick={addByDoi} disabled={loading || !doi.trim()}>Add</Button>
			</div>
		</div>

		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t"></span>
			</div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-background px-2 text-muted-foreground">or search</span>
			</div>
		</div>

		<div>
			<div class="relative">
				<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					bind:value={searchQuery}
					placeholder="Search papers..."
					class="pl-9"
				/>
			</div>
		</div>

		{#if searching}
			<div class="flex justify-center py-4">
				<div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
			</div>
		{:else if searchResults.length > 0}
			<ScrollArea class="max-h-64">
				<ul class="space-y-2">
					{#each searchResults as paper}
						<li class="rounded-md border p-2 text-sm hover:bg-accent/50">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1 min-w-0">
									<p class="font-medium line-clamp-2">{paper.title}</p>
									<p class="text-xs text-muted-foreground">
										{paper.authors?.slice(0, 3).map((a: any) => a.name).join(', ')}
										{#if paper.year}
											({paper.year})
										{/if}
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									onclick={() => addFromSearch(paper)}
									disabled={loading || !paper.doi}
								>
									Add
								</Button>
							</div>
						</li>
					{/each}
				</ul>
			</ScrollArea>
		{/if}
	</div>
</Dialog>
