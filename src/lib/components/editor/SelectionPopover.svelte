<script lang="ts">
	import { Send, X } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		selectedText: string;
		position: { x: number; y: number };
		onAsk: (question: string) => void;
		onClose: () => void;
	}

	let { selectedText, position, onAsk, onClose }: Props = $props();

	let question = $state('');
	let inputRef: HTMLInputElement;

	// Focus input on mount
	$effect(() => {
		if (inputRef) {
			inputRef.focus();
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (question.trim()) {
			onAsk(question.trim());
			question = '';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	// Truncate selected text for preview
	const preview = $derived(() => {
		const text = selectedText.trim();
		if (text.length <= 60) return text;
		return text.substring(0, 60) + '...';
	});
</script>

<div
	class="fixed z-50 min-w-[280px] max-w-[400px]"
	style="left: {position.x}px; top: {position.y}px;"
	in:fly={{ y: -10, duration: 200, easing: cubicOut }}
	out:fly={{ y: -10, duration: 150, easing: cubicOut }}
>
	<div class="rounded-xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl overflow-hidden">
		<!-- Header with selection preview -->
		<div class="flex items-start justify-between gap-2 px-3 py-2 bg-muted/30 border-b border-border/20">
			<div class="flex-1 min-w-0">
				<span class="text-[10px] text-muted-foreground uppercase tracking-wide">Selected text</span>
				<p class="text-xs text-foreground font-mono mt-0.5 truncate">
					{preview()}
				</p>
			</div>
			<button
				type="button"
				class="p-1 text-muted-foreground hover:text-foreground rounded transition-colors shrink-0"
				onclick={onClose}
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</div>

		<!-- Input area -->
		<form onsubmit={handleSubmit} class="p-2">
			<div class="flex items-center gap-2">
				<input
					bind:this={inputRef}
					bind:value={question}
					type="text"
					placeholder="Ask about this selection..."
					class="flex-1 text-sm bg-transparent border-0 px-2 py-1.5 focus:outline-none placeholder:text-muted-foreground/50"
					onkeydown={handleKeydown}
				/>
				<button
					type="submit"
					class="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 shrink-0"
					disabled={!question.trim()}
				>
					<Send class="h-3.5 w-3.5" />
				</button>
			</div>
		</form>
	</div>
</div>
