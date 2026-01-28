<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { settingsStore } from '$lib/stores';
	import { Settings, Sun, Moon, Keyboard, RefreshCw, Code, WrapText, Pin, GitCompare, MessageSquareText } from 'lucide-svelte';

	let open = $state(false);
	let dropdownRef: HTMLDivElement;

	function handleClickOutside(e: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
			open = false;
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleClickOutside);
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('mousedown', handleClickOutside);
		}
	});

	function toggleDropdown() {
		open = !open;
	}
</script>

<div bind:this={dropdownRef} class="relative z-[100]">
	<button
		type="button"
		class="p-1.5 hover:bg-muted rounded-lg transition-all duration-200"
		onclick={toggleDropdown}
		title="Editor settings"
	>
		<Settings class="h-4 w-4 text-muted-foreground" />
	</button>

	{#if open}
		<div class="absolute top-full left-0 mt-2 w-72 bg-background border border-border rounded-xl shadow-2xl z-[100] overflow-hidden">
			<div class="px-4 py-3 border-b border-border-subtle">
				<span class="text-sm font-medium">Editor Settings</span>
			</div>

			<div class="p-2 space-y-1">
				<!-- Light Mode -->
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
					onclick={() => settingsStore.toggleLightMode()}
				>
					<div class="flex items-center gap-3">
						{#if $settingsStore.editor.lightMode}
							<Sun class="h-4 w-4 text-amber-500" />
						{:else}
							<Moon class="h-4 w-4 text-blue-400" />
						{/if}
						<div class="text-left">
							<div class="text-sm font-medium">Light Mode</div>
							<div class="text-xs text-muted-foreground">Switch to light color scheme</div>
						</div>
					</div>
					<div class="w-10 h-6 rounded-full transition-colors duration-200 {$settingsStore.editor.lightMode ? 'bg-primary' : 'bg-muted'} relative">
						<div class="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all duration-200 {$settingsStore.editor.lightMode ? 'left-5' : 'left-1'}"></div>
					</div>
				</button>

				<!-- Vim Mode -->
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
					onclick={() => settingsStore.toggleVimMode()}
				>
					<div class="flex items-center gap-3">
						<Keyboard class="h-4 w-4 text-muted-foreground" />
						<div class="text-left">
							<div class="text-sm font-medium">Vim Mode</div>
							<div class="text-xs text-muted-foreground">Enable vim keybindings</div>
						</div>
					</div>
					<div class="w-10 h-6 rounded-full transition-colors duration-200 {$settingsStore.editor.vimMode ? 'bg-primary' : 'bg-muted'} relative">
						<div class="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all duration-200 {$settingsStore.editor.vimMode ? 'left-5' : 'left-1'}"></div>
					</div>
				</button>

				<!-- Realtime Compilation -->
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
					onclick={() => settingsStore.toggleRealtimeCompilation()}
				>
					<div class="flex items-center gap-3">
						<RefreshCw class="h-4 w-4 text-muted-foreground" />
						<div class="text-left">
							<div class="text-sm font-medium">Realtime Compilation</div>
							<div class="text-xs text-muted-foreground">Compile as you type (2s delay)</div>
						</div>
					</div>
					<div class="w-10 h-6 rounded-full transition-colors duration-200 {$settingsStore.editor.realtimeCompilation ? 'bg-primary' : 'bg-muted'} relative">
						<div class="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all duration-200 {$settingsStore.editor.realtimeCompilation ? 'left-5' : 'left-1'}"></div>
					</div>
				</button>

				<!-- Auto Formatting -->
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
					onclick={() => settingsStore.toggleAutoFormatting()}
				>
					<div class="flex items-center gap-3">
						<Code class="h-4 w-4 text-muted-foreground" />
						<div class="text-left">
							<div class="text-sm font-medium">Auto Formatting</div>
							<div class="text-xs text-muted-foreground">Format code on save</div>
						</div>
					</div>
					<div class="w-10 h-6 rounded-full transition-colors duration-200 {$settingsStore.editor.autoFormatting ? 'bg-primary' : 'bg-muted'} relative">
						<div class="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all duration-200 {$settingsStore.editor.autoFormatting ? 'left-5' : 'left-1'}"></div>
					</div>
				</button>

				<!-- Word Wrap -->
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
					onclick={() => settingsStore.toggleWordWrap()}
				>
					<div class="flex items-center gap-3">
						<WrapText class="h-4 w-4 text-muted-foreground" />
						<div class="text-left">
							<div class="text-sm font-medium">Word Wrap</div>
							<div class="text-xs text-muted-foreground">Wrap long lines</div>
						</div>
					</div>
					<div class="w-10 h-6 rounded-full transition-colors duration-200 {$settingsStore.editor.wordWrap ? 'bg-primary' : 'bg-muted'} relative">
						<div class="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all duration-200 {$settingsStore.editor.wordWrap ? 'left-5' : 'left-1'}"></div>
					</div>
				</button>

				<!-- Sticky Scroll -->
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
					onclick={() => settingsStore.toggleStickyScroll()}
				>
					<div class="flex items-center gap-3">
						<Pin class="h-4 w-4 text-muted-foreground" />
						<div class="text-left">
							<div class="text-sm font-medium">Sticky Scroll</div>
							<div class="text-xs text-muted-foreground">Pin parent structures</div>
						</div>
					</div>
					<div class="w-10 h-6 rounded-full transition-colors duration-200 {$settingsStore.editor.stickyScroll ? 'bg-primary' : 'bg-muted'} relative">
						<div class="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all duration-200 {$settingsStore.editor.stickyScroll ? 'left-5' : 'left-1'}"></div>
					</div>
				</button>

				<!-- Inline Diffs -->
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
					onclick={() => settingsStore.toggleInlineDiffs()}
				>
					<div class="flex items-center gap-3">
						<GitCompare class="h-4 w-4 text-muted-foreground" />
						<div class="text-left">
							<div class="text-sm font-medium">Inline Diffs</div>
							<div class="text-xs text-muted-foreground">Show AI suggestions in editor</div>
						</div>
					</div>
					<div class="w-10 h-6 rounded-full transition-colors duration-200 {$settingsStore.editor.inlineDiffs ? 'bg-primary' : 'bg-muted'} relative">
						<div class="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all duration-200 {$settingsStore.editor.inlineDiffs ? 'left-5' : 'left-1'}"></div>
					</div>
				</button>

				<!-- Selection Popover -->
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-200"
					onclick={() => settingsStore.toggleSelectionPopover()}
				>
					<div class="flex items-center gap-3">
						<MessageSquareText class="h-4 w-4 text-muted-foreground" />
						<div class="text-left">
							<div class="text-sm font-medium">Selection Chat</div>
							<div class="text-xs text-muted-foreground">Ask about highlighted text</div>
						</div>
					</div>
					<div class="w-10 h-6 rounded-full transition-colors duration-200 {$settingsStore.editor.selectionPopover ? 'bg-primary' : 'bg-muted'} relative">
						<div class="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm transition-all duration-200 {$settingsStore.editor.selectionPopover ? 'left-5' : 'left-1'}"></div>
					</div>
				</button>
			</div>
		</div>
	{/if}
</div>
