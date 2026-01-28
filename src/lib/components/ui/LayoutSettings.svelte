<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { settingsStore } from '$lib/stores';
	import { Layout, PanelLeft, MessageSquare, RotateCcw } from 'lucide-svelte';

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
		document.removeEventListener('mousedown', handleClickOutside);
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
		title="Layout settings"
	>
		<Layout class="h-4 w-4 text-muted-foreground" />
	</button>

	{#if open}
		<div class="absolute top-full right-0 mt-2 w-64 bg-background border border-border rounded-xl shadow-2xl z-[100] overflow-hidden">
			<div class="px-4 py-3 border-b border-border/30">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Layout Settings</span>
					<button
						type="button"
						class="p-1.5 hover:bg-muted rounded-lg transition-all duration-200"
						onclick={() => settingsStore.reset()}
						title="Reset to defaults"
					>
						<RotateCcw class="h-3.5 w-3.5 text-muted-foreground" />
					</button>
				</div>
			</div>

			<div class="p-4 space-y-4">
				<!-- Files Display -->
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
						<PanelLeft class="h-3.5 w-3.5" />
						Files Display
					</div>
					<div class="flex gap-2">
						<button
							type="button"
							class="flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 {$settingsStore.layout.filesDisplay === 'dropdown'
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'bg-muted/50 hover:bg-muted'}"
							onclick={() => settingsStore.setFilesDisplay('dropdown')}
						>
							Dropdown
						</button>
						<button
							type="button"
							class="flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 {$settingsStore.layout.filesDisplay === 'sidebar'
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'bg-muted/50 hover:bg-muted'}"
							onclick={() => settingsStore.setFilesDisplay('sidebar')}
						>
							Sidebar
						</button>
					</div>
				</div>

				<!-- Chat Position -->
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
						<MessageSquare class="h-3.5 w-3.5" />
						Chat Position
					</div>
					<div class="flex gap-2">
						<button
							type="button"
							class="flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 {$settingsStore.layout.chatPosition === 'bottom'
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'bg-muted/50 hover:bg-muted'}"
							onclick={() => settingsStore.setChatPosition('bottom')}
						>
							Bottom
						</button>
						<button
							type="button"
							class="flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 {$settingsStore.layout.chatPosition === 'side'
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'bg-muted/50 hover:bg-muted'}"
							onclick={() => settingsStore.setChatPosition('side')}
						>
							Side
						</button>
					</div>
				</div>

				<!-- Panel Width -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-xs text-muted-foreground uppercase tracking-wider">
							Panel Width
						</span>
						<span class="text-xs text-muted-foreground font-medium">
							{Math.round($settingsStore.layout.panelWidth)}%
						</span>
					</div>
					<div class="flex items-center gap-3">
						<input
							type="range"
							min="20"
							max="80"
							step="1"
							value={$settingsStore.layout.panelWidth}
							oninput={(e) => settingsStore.setPanelWidth(Number(e.currentTarget.value))}
							class="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm"
						/>
						<button
							type="button"
							class="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-all duration-200"
							onclick={() => settingsStore.resetPanelWidth()}
						>
							50%
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
