<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		leftWidth?: number;
		minWidth?: number;
		maxWidth?: number;
		onResize?: (width: number) => void;
		onReset?: () => void;
		class?: string;
	}

	let {
		leftWidth = 50,
		minWidth = 20,
		maxWidth = 80,
		onResize,
		onReset,
		class: className = ''
	}: Props = $props();

	let dragging = $state(false);
	let container: HTMLElement | null = null;

	function handleMouseDown(e: MouseEvent) {
		e.preventDefault();
		dragging = true;
		container = (e.target as HTMLElement).closest('.resize-container');

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	function handleMouseMove(e: MouseEvent) {
		if (!dragging || !container) return;

		const rect = container.getBoundingClientRect();
		const percentage = ((e.clientX - rect.left) / rect.width) * 100;
		const clampedWidth = Math.min(maxWidth, Math.max(minWidth, percentage));

		onResize?.(clampedWidth);
	}

	function handleMouseUp() {
		dragging = false;
		container = null;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}

	function handleDoubleClick() {
		onReset?.();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="slider"
	aria-orientation="horizontal"
	aria-valuenow={leftWidth}
	aria-valuemin={minWidth}
	aria-valuemax={maxWidth}
	aria-label="Resize panels"
	tabindex="0"
	class={cn(
		'w-1 bg-border hover:bg-primary/50 cursor-col-resize select-none transition-colors shrink-0',
		dragging && 'bg-primary',
		className
	)}
	onmousedown={handleMouseDown}
	ondblclick={handleDoubleClick}
	onkeydown={(e) => {
		if (e.key === 'ArrowLeft') {
			onResize?.(Math.max(minWidth, leftWidth - 5));
		} else if (e.key === 'ArrowRight') {
			onResize?.(Math.min(maxWidth, leftWidth + 5));
		} else if (e.key === 'Home') {
			onReset?.();
		}
	}}
>
	<div class="h-full w-full flex items-center justify-center">
		<div class="w-0.5 h-8 bg-muted-foreground/30 rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
	</div>
</div>
