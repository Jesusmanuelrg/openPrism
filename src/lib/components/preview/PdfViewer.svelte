<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';
	import { ZoomIn, ZoomOut, RefreshCw, Download, AlertTriangle, X } from 'lucide-svelte';

	interface Props {
		data: Uint8Array;
		compileLog?: string;
		compileErrors?: string[];
		isCompiling?: boolean;
		onRecompile?: () => void;
	}

	let { data, compileLog = '', compileErrors = [], isCompiling = false, onRecompile }: Props = $props();

	let container: HTMLDivElement;
	let pdfDoc: any = null;
	let pageCount = $state(0);
	let pageCanvases: HTMLCanvasElement[] = $state([]);
	let scale = $state(1.5);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showLogs = $state(false);
	let activeTab = $state<'issues' | 'log'>('issues');

	onDestroy(() => {
		if (pdfDoc) {
			pdfDoc.destroy();
		}
	});

	async function loadPdf() {
		// Clean up previous document to avoid memory leaks
		if (pdfDoc) {
			pdfDoc.destroy();
			pdfDoc = null;
		}

		loading = true;
		error = null;
		pageCanvases = [];

		try {
			const pdfjsLib = await import('pdfjs-dist');
			pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

			// CRITICAL: Copy the data to avoid ArrayBuffer detachment issues
			// PDF.js transfers the ArrayBuffer to a Web Worker, making it unusable for subsequent loads
			const dataCopy = new Uint8Array(data);
			const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
			pdfDoc = await loadingTask.promise;
			pageCount = pdfDoc.numPages;
		} catch (err) {
			console.error('PDF loading error:', err);
			error = err instanceof Error ? err.message : 'Failed to load PDF';
			loading = false;
			return;
		}

		loading = false;
		// Wait for Svelte to render the canvases before drawing
		await tick();
		await renderAllPages();
	}

	async function renderAllPages() {
		if (!pdfDoc) return;

		for (let i = 1; i <= pdfDoc.numPages; i++) {
			await renderPageToCanvas(i);
		}
	}

	async function renderPageToCanvas(pageNum: number) {
		const canvas = pageCanvases[pageNum - 1];
		if (!canvas || !pdfDoc) return;

		try {
			const page = await pdfDoc.getPage(pageNum);
			const viewport = page.getViewport({ scale });

			// Handle HiDPI/Retina displays for crisp rendering
			const pixelRatio = window.devicePixelRatio || 1;
			const context = canvas.getContext('2d')!;

			// Set canvas dimensions accounting for pixel ratio
			canvas.width = Math.floor(viewport.width * pixelRatio);
			canvas.height = Math.floor(viewport.height * pixelRatio);

			// Scale canvas back down with CSS for proper display size
			canvas.style.width = `${viewport.width}px`;
			canvas.style.height = `${viewport.height}px`;

			// Reset and scale the context to match the pixel ratio
			context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

			await page.render({
				canvasContext: context,
				viewport
			}).promise;
		} catch (err) {
			console.error('Page render error:', err);
		}
	}

	function zoomIn() {
		scale = Math.min(scale + 0.25, 3.0);
		renderAllPages();
	}

	function zoomOut() {
		scale = Math.max(scale - 0.25, 0.5);
		renderAllPages();
	}

	function downloadPdf() {
		const blob = new Blob([data], { type: 'application/pdf' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'document.pdf';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleRecompile() {
		if (onRecompile) {
			onRecompile();
		}
	}

	$effect(() => {
		if (data) {
			loadPdf();
		}
	});

	const errorCount = $derived(compileErrors.length);
</script>

<div class="relative h-full w-full">
	<!-- Floating Toolbar (Top Center) - ABSOLUTE -->
	<div
		class="absolute top-4 left-1/2 -translate-x-1/2 z-50"
		in:fly={{ y: -20, duration: 400, delay: 100, easing: backOut }}
	>
		<div class="flex items-center gap-1 px-3 py-2 rounded-2xl bg-background/90 backdrop-blur-xl border border-border/40 shadow-2xl transition-shadow duration-300 hover:shadow-3xl">
			<!-- Recompile Button -->
			<button
				type="button"
				class="group p-2 hover:bg-muted/50 rounded-xl disabled:opacity-30 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
				onclick={handleRecompile}
				disabled={isCompiling}
				title="Recompile (Cmd+B)"
			>
				<RefreshCw class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300 {isCompiling ? 'animate-spin' : ''}" />
			</button>

			<!-- Download Button -->
			<button
				type="button"
				class="group p-2 hover:bg-muted/50 rounded-xl transition-all duration-300 ease-out hover:scale-105 active:scale-95"
				onclick={downloadPdf}
				title="Download PDF"
			>
				<Download class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
			</button>

			<div class="h-5 w-px bg-border/40 mx-1.5 transition-colors duration-300"></div>

			<!-- Zoom Controls -->
			<button
				type="button"
				class="group p-2 hover:bg-muted/50 rounded-xl disabled:opacity-30 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
				onclick={zoomOut}
				disabled={scale <= 0.5}
				title="Zoom out"
			>
				<ZoomOut class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
			</button>
			<span class="text-xs text-muted-foreground w-10 text-center font-mono tabular-nums transition-all duration-300">
				{Math.round(scale * 100)}%
			</span>
			<button
				type="button"
				class="group p-2 hover:bg-muted/50 rounded-xl disabled:opacity-30 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
				onclick={zoomIn}
				disabled={scale >= 3.0}
				title="Zoom in"
			>
				<ZoomIn class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
			</button>

			<div class="h-5 w-px bg-border/40 mx-1.5 transition-colors duration-300"></div>

			<!-- Page Count -->
			<span class="text-xs text-muted-foreground font-mono tabular-nums px-2">
				{pageCount} page{pageCount !== 1 ? 's' : ''}
			</span>

			<div class="h-5 w-px bg-border/40 mx-1.5 transition-colors duration-300"></div>

			<!-- Logs Toggle -->
			<button
				type="button"
				class="group p-2 hover:bg-muted/50 rounded-xl transition-all duration-300 ease-out hover:scale-105 active:scale-95 relative"
				onclick={() => (showLogs = !showLogs)}
				title="Toggle compilation logs"
			>
				<AlertTriangle class="h-4 w-4 transition-all duration-300 {errorCount > 0 ? 'text-amber-500 group-hover:text-amber-400' : 'text-muted-foreground group-hover:text-foreground'} {showLogs ? 'rotate-180' : ''}" />
				{#if errorCount > 0}
					<span
						class="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[10px] bg-amber-500 text-white rounded-full font-medium animate-pulse"
						in:fly={{ y: -5, duration: 200, easing: backOut }}
					>
						{errorCount}
					</span>
				{/if}
			</button>
		</div>
	</div>

	<!-- PDF Canvas Area - Scrollable with all pages -->
	<div class="h-full w-full overflow-auto" bind:this={container}>
		<div class="flex flex-col items-center gap-4 p-6 pt-20">
			{#if loading}
				<div
					class="flex items-center justify-center py-20"
					in:fade={{ duration: 200 }}
					out:fade={{ duration: 150 }}
				>
					<div class="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent"></div>
				</div>
			{:else if error}
				<div
					class="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
					in:fly={{ y: 10, duration: 300, easing: cubicOut }}
				>
					{error}
				</div>
			{:else}
				{#each Array(pageCount) as _, i}
					<div class="relative" in:fade={{ duration: 300, delay: i * 50 }}>
						<!-- Page number label -->
						<div class="absolute -top-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/30 font-mono">
							{i + 1}
						</div>
						<canvas
							bind:this={pageCanvases[i]}
							class="shadow-2xl rounded-lg bg-white"
						></canvas>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Floating Logs Panel (Bottom) - ABSOLUTE -->
	{#if showLogs}
		<div
			class="absolute bottom-4 left-4 right-4 z-50"
			in:fly={{ y: 20, duration: 350, easing: backOut }}
			out:fly={{ y: 20, duration: 250, easing: cubicOut }}
		>
			<div class="rounded-2xl bg-background/90 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden">
				<!-- Tabs Header -->
				<div class="flex items-center justify-between px-4 py-2 border-b border-border/20">
					<div class="relative flex items-center gap-1 p-0.5 rounded-lg bg-muted/30">
						<!-- Animated tab indicator -->
						<div
							class="absolute h-[calc(100%-4px)] top-0.5 rounded-md bg-muted transition-all duration-300 ease-out"
							style="width: calc(50% - 2px); left: {activeTab === 'issues' ? '2px' : 'calc(50% + 2px)'};"
						></div>
						<button
							type="button"
							class="relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-300 {activeTab === 'issues'
								? 'text-foreground'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (activeTab = 'issues')}
						>
							Issues {#if errorCount > 0}<span class="ml-1 text-amber-500 transition-colors duration-300">({errorCount})</span>{/if}
						</button>
						<button
							type="button"
							class="relative z-10 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-300 {activeTab === 'log'
								? 'text-foreground'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (activeTab = 'log')}
						>
							Full Log
						</button>
					</div>
					<button
						type="button"
						class="group p-1.5 hover:bg-muted/50 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
						onclick={() => (showLogs = false)}
						title="Close logs"
					>
						<X class="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
					</button>
				</div>

				<!-- Tab Content -->
				<div class="max-h-40 overflow-auto">
					{#if activeTab === 'issues'}
						<div class="p-4 space-y-2" in:fade={{ duration: 200, delay: 50 }}>
							{#if compileErrors.length === 0}
								<p class="text-sm text-muted-foreground">No issues detected</p>
							{:else}
								{#each compileErrors as err, i}
									<div
										class="flex items-start gap-2 text-sm"
										in:fly={{ x: -10, duration: 250, delay: i * 50, easing: cubicOut }}
									>
										<AlertTriangle class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
										<span class="text-foreground font-mono">{err}</span>
									</div>
								{/each}
							{/if}
						</div>
					{:else}
						<div class="p-4" in:fade={{ duration: 200, delay: 50 }}>
							{#if compileLog}
								<pre class="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{compileLog}</pre>
							{:else}
								<p class="text-sm text-muted-foreground">No compilation log available</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
