<script lang="ts">
	import { changesStore, pendingChanges, type CodeChange } from '$lib/stores';
	import { applyCodeChange } from '$lib/utils/code-apply';
	import { findBestMatch } from '$lib/utils/fuzzy-match';
	import { Check, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface Props {
		getCurrentContent: () => string;
		onApplyChange?: (change: CodeChange, newContent: string) => void;
		onNavigateToChange?: (lineNumber: number) => void;
		class?: string;
	}

	let { getCurrentContent, onApplyChange, onNavigateToChange, class: className = '' }: Props = $props();

	// Track expanded state for each change
	let expandedChanges = $state<Set<string>>(new Set());
	// Track errors for each change
	let changeErrors = $state<Map<string, string>>(new Map());

	function toggleExpanded(id: string) {
		const newSet = new Set(expandedChanges);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedChanges = newSet;
	}

	function acceptChange(change: CodeChange) {
		const content = getCurrentContent(); // Get fresh content each time
		const result = applyCodeChange(content, change.oldCode, change.newCode);

		if (result.success) {
			changesStore.acceptChange(change.id);
			onApplyChange?.(change, result.content);
			// Clear any error
			const newErrors = new Map(changeErrors);
			newErrors.delete(change.id);
			changeErrors = newErrors;
		} else {
			// Show error
			const newErrors = new Map(changeErrors);
			newErrors.set(change.id, result.error || 'Failed to apply change');
			changeErrors = newErrors;
		}
	}

	function rejectChange(id: string) {
		changesStore.rejectChange(id);
		// Clear any error
		const newErrors = new Map(changeErrors);
		newErrors.delete(id);
		changeErrors = newErrors;
	}

	function acceptAll() {
		for (const change of $pendingChanges) {
			acceptChange(change);
		}
	}

	function rejectAll() {
		changesStore.rejectAll();
		changeErrors = new Map();
	}

	// Format diff lines with proper styling
	function getDiffLines(oldCode: string, newCode: string): { type: 'add' | 'remove' | 'context'; content: string }[] {
		const lines: { type: 'add' | 'remove' | 'context'; content: string }[] = [];

		if (oldCode && oldCode.trim()) {
			oldCode.split('\n').forEach(line => {
				lines.push({ type: 'remove', content: line });
			});
		}

		if (newCode && newCode.trim()) {
			newCode.split('\n').forEach(line => {
				lines.push({ type: 'add', content: line });
			});
		}

		return lines;
	}

	// Get a preview of the change (first few lines)
	function getPreview(change: CodeChange): string {
		const newLines = change.newCode.split('\n').filter(l => l.trim());
		if (newLines.length === 0) return 'Empty change';
		const preview = newLines[0].trim();
		return preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
	}

	// Find the line number where this change would apply
	function getChangeLineNumber(change: CodeChange): number | null {
		if (!change.oldCode || !change.oldCode.trim()) return null;

		const content = getCurrentContent();
		const contentLines = content.split('\n');
		const oldLines = change.oldCode.split('\n').filter(l => l.trim() !== '');

		if (oldLines.length === 0) return null;

		// Try exact match first
		if (content.includes(change.oldCode)) {
			const matchIndex = content.indexOf(change.oldCode);
			return content.substring(0, matchIndex).split('\n').length;
		}

		// Try fuzzy match
		const match = findBestMatch(contentLines, oldLines);
		if (match && match.score >= 0.7) {
			return match.startLine + 1; // Convert to 1-indexed
		}

		return null;
	}

	// Handle click on a change to navigate
	function handleNavigateClick(change: CodeChange) {
		const lineNumber = getChangeLineNumber(change);
		if (lineNumber !== null && onNavigateToChange) {
			onNavigateToChange(lineNumber);
		}
	}
</script>

{#if $pendingChanges.length > 0}
	<div class="rounded-xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl overflow-hidden {className}">
		<!-- Header -->
		<div class="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/30">
			<div class="flex items-center gap-2">
				<div class="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
				<span class="text-xs font-medium text-foreground">
					{$pendingChanges.length} pending change{$pendingChanges.length > 1 ? 's' : ''}
				</span>
			</div>
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
					onclick={acceptAll}
				>
					Accept all
				</button>
				<button
					type="button"
					class="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
					onclick={rejectAll}
				>
					Reject all
				</button>
			</div>
		</div>

		<!-- Changes List -->
		<div class="max-h-64 overflow-auto">
			{#each $pendingChanges as change (change.id)}
				{@const isExpanded = expandedChanges.has(change.id)}
				{@const error = changeErrors.get(change.id)}
				{@const diffLines = getDiffLines(change.oldCode, change.newCode)}
				{@const lineNumber = getChangeLineNumber(change)}

				<div class="border-b border-border/20 last:border-b-0">
					<!-- Change Header (always visible) -->
					<div class="flex items-center gap-2 px-3 py-2 bg-muted/10 hover:bg-muted/20 transition-colors">
						<!-- Expand/Collapse Toggle -->
						<button
							type="button"
							class="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
							onclick={() => toggleExpanded(change.id)}
						>
							{#if isExpanded}
								<ChevronUp class="h-3.5 w-3.5" />
							{:else}
								<ChevronDown class="h-3.5 w-3.5" />
							{/if}
						</button>

						<!-- Description/Preview (clickable for navigation) -->
						<button
							type="button"
							class="flex-1 text-left {lineNumber !== null && onNavigateToChange ? 'cursor-pointer' : ''}"
							onclick={() => handleNavigateClick(change)}
							title={lineNumber !== null ? `Go to line ${lineNumber}` : undefined}
						>
							<span class="text-xs text-foreground truncate block">
								{change.description || getPreview(change)}
								{#if lineNumber !== null}
									<span class="text-muted-foreground/60 ml-1">:L{lineNumber}</span>
								{/if}
							</span>
							{#if !isExpanded}
								<span class="text-[10px] text-muted-foreground font-mono truncate block mt-0.5">
									{getPreview(change)}
								</span>
							{/if}
						</button>

						<!-- Action Buttons -->
						<div class="flex items-center gap-1 shrink-0">
							<button
								type="button"
								class="p-1.5 text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
								onclick={() => acceptChange(change)}
								title="Accept change"
							>
								<Check class="h-4 w-4" />
							</button>
							<button
								type="button"
								class="p-1.5 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
								onclick={() => rejectChange(change.id)}
								title="Reject change"
							>
								<X class="h-4 w-4" />
							</button>
						</div>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-600 text-xs">
							<AlertCircle class="h-3.5 w-3.5 shrink-0" />
							<span>{error}</span>
						</div>
					{/if}

					<!-- Expanded Diff View -->
					{#if isExpanded}
						<div class="border-t border-border/20">
							<!-- File Path -->
							{#if change.filePath}
								<div class="px-3 py-1 bg-muted/20 text-[10px] text-muted-foreground font-mono">
									{change.filePath}
								</div>
							{/if}

							<!-- Diff Content -->
							<div class="font-mono text-xs leading-relaxed max-h-48 overflow-auto">
								{#each diffLines as line}
									<div class="flex {line.type === 'add' ? 'bg-green-500/10' : line.type === 'remove' ? 'bg-red-500/10' : ''}">
										<span class="w-6 text-center select-none shrink-0 {line.type === 'add' ? 'text-green-600 bg-green-500/20' : line.type === 'remove' ? 'text-red-600 bg-red-500/20' : 'text-muted-foreground'}">
											{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
										</span>
										<pre class="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all {line.type === 'add' ? 'text-green-700 dark:text-green-300' : line.type === 'remove' ? 'text-red-700 dark:text-red-300 line-through opacity-70' : ''}">{line.content || ' '}</pre>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
