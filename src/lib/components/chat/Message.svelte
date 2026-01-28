<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChatMessage } from '$lib/stores/chat';
	import { Copy, Check } from 'lucide-svelte';
	import { marked } from 'marked';

	interface Props {
		message: ChatMessage;
		compact?: boolean;
	}

	let { message, compact = false }: Props = $props();

	let copied = $state(false);
	let renderedContent = $state('');

	onMount(() => {
		marked.setOptions({
			breaks: true,
			gfm: true
		});
	});

	$effect(() => {
		if (message.content) {
			renderedContent = marked.parse(message.content) as string;
		}
	});

	async function copyContent() {
		await navigator.clipboard.writeText(message.content);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

{#if message.role === 'user'}
	<!-- User message: right-aligned, primary color bubble -->
	<div class="flex justify-end">
		<div
			class="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground shadow-sm"
			class:px-3={compact}
			class:py-2={compact}
		>
			<p class="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
		</div>
	</div>
{:else}
	<!-- Assistant message: clean, full-width, no bubble -->
	<div class="group relative">
		<div class="py-1">
			{#if message.isStreaming && !message.content}
				<!-- Typing indicator -->
				<div class="flex items-center gap-1.5 py-2">
					<div class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]"></div>
					<div class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]"></div>
					<div class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50"></div>
				</div>
			{:else}
				<!-- Message content -->
				<div class="assistant-prose text-sm leading-relaxed text-foreground">
					{@html renderedContent}
					{#if message.isStreaming}
						<span class="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary"></span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Copy button -->
		{#if message.content && !message.isStreaming}
			<button
				type="button"
				class="absolute -right-1 top-0 rounded-lg p-1.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
				onclick={copyContent}
				title="Copy message"
			>
				{#if copied}
					<Check class="h-3.5 w-3.5 text-green-500" />
				{:else}
					<Copy class="h-3.5 w-3.5 text-muted-foreground" />
				{/if}
			</button>
		{/if}
	</div>
{/if}

<style>
	/* Clean typography for assistant messages */
	:global(.assistant-prose) {
		line-height: 1.6;
	}

	:global(.assistant-prose p) {
		margin: 0.5em 0;
	}

	:global(.assistant-prose p:first-child) {
		margin-top: 0;
	}

	:global(.assistant-prose p:last-child) {
		margin-bottom: 0;
	}

	:global(.assistant-prose ul),
	:global(.assistant-prose ol) {
		margin: 0.5em 0;
		padding-left: 1.25em;
	}

	:global(.assistant-prose li) {
		margin: 0.25em 0;
	}

	:global(.assistant-prose strong) {
		font-weight: 600;
	}

	/* Code blocks - light mode friendly */
	:global(.assistant-prose pre) {
		background-color: var(--color-muted);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1rem;
		overflow-x: auto;
		font-size: 0.8125rem;
		margin: 0.75rem 0;
		line-height: 1.5;
	}

	/* Inline code */
	:global(.assistant-prose code) {
		background-color: var(--color-muted);
		padding: 0.125rem 0.375rem;
		border-radius: 0.375rem;
		font-size: 0.875em;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	:global(.assistant-prose pre code) {
		background-color: transparent;
		padding: 0;
		border-radius: 0;
		font-size: inherit;
	}

	/* Links */
	:global(.assistant-prose a) {
		color: var(--color-primary);
		text-decoration: none;
	}

	:global(.assistant-prose a:hover) {
		text-decoration: underline;
	}

	/* Blockquotes */
	:global(.assistant-prose blockquote) {
		border-left: 2px solid var(--color-border);
		padding-left: 1rem;
		margin: 0.75rem 0;
		color: var(--color-muted-foreground);
	}

	/* Headings */
	:global(.assistant-prose h1),
	:global(.assistant-prose h2),
	:global(.assistant-prose h3),
	:global(.assistant-prose h4) {
		font-weight: 600;
		margin: 1em 0 0.5em;
		line-height: 1.3;
	}

	:global(.assistant-prose h1) {
		font-size: 1.25em;
	}

	:global(.assistant-prose h2) {
		font-size: 1.125em;
	}

	:global(.assistant-prose h3) {
		font-size: 1em;
	}

	/* Horizontal rule */
	:global(.assistant-prose hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 1rem 0;
	}

	/* Tables */
	:global(.assistant-prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: 0.75rem 0;
		font-size: 0.875em;
	}

	:global(.assistant-prose th),
	:global(.assistant-prose td) {
		border: 1px solid var(--color-border);
		padding: 0.5rem 0.75rem;
		text-align: left;
	}

	:global(.assistant-prose th) {
		background-color: var(--color-muted);
		font-weight: 600;
	}
</style>
