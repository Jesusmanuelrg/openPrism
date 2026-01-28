<script lang="ts">
	import { chatStore, AVAILABLE_MODELS, changesStore, pendingChanges } from '$lib/stores';
	import type { CodeChange } from '$lib/stores';
	import { createSupabaseClient } from '$lib/supabase';
	import Message from './Message.svelte';
	import CodeChanges from './CodeChanges.svelte';
	import { Send, ChevronDown, Trash2, ChevronUp, GripHorizontal } from 'lucide-svelte';
	import type { ProjectFile } from '$lib/utils/database.types';

	interface Props {
		projectId: string;
		conversationId?: string;
		currentFile?: ProjectFile | null;
		onContentChange?: (newContent: string) => void;
	}

	let { projectId, conversationId, currentFile, onContentChange }: Props = $props();

	const supabase = createSupabaseClient();

	let inputValue = $state('');
	let textareaRef: HTMLTextAreaElement;
	let messagesContainer: HTMLDivElement;
	let scrollContainer: HTMLDivElement;
	let chatExpanded = $state(false);
	let showModelDropdown = $state(false);
	let modelDropdownRef: HTMLDivElement;
	let chatPanelRef: HTMLDivElement;

	// Resizable chat height
	const MIN_HEIGHT = 150;
	const DEFAULT_HEIGHT = 288; // h-72
	const MAX_HEIGHT = 700;
	let chatHeight = $state(DEFAULT_HEIGHT);
	let isResizing = $state(false);
	let startY = 0;
	let startHeight = 0;

	function startResize(e: MouseEvent) {
		isResizing = true;
		startY = e.clientY;
		startHeight = chatHeight;
		document.addEventListener('mousemove', handleResize);
		document.addEventListener('mouseup', stopResize);
		document.body.style.cursor = 'ns-resize';
		document.body.style.userSelect = 'none';
	}

	function handleResize(e: MouseEvent) {
		if (!isResizing) return;
		const delta = startY - e.clientY; // Inverted because dragging up should increase height
		const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta));
		chatHeight = newHeight;
	}

	function stopResize() {
		isResizing = false;
		document.removeEventListener('mousemove', handleResize);
		document.removeEventListener('mouseup', stopResize);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}

	function handleResizeDoubleClick() {
		// Toggle between default and max height
		if (chatHeight < MAX_HEIGHT - 50) {
			chatHeight = MAX_HEIGHT;
		} else {
			chatHeight = DEFAULT_HEIGHT;
		}
	}

	// Auto-resize textarea
	function autoResize() {
		if (textareaRef) {
			textareaRef.style.height = 'auto';
			textareaRef.style.height = Math.min(textareaRef.scrollHeight, 100) + 'px';
		}
	}

	// Parse AI response for code changes
	function parseCodeChanges(content: string, filePath: string): void {
		const codeBlockRegex = /```(?:latex|tex|typst|typ)?\n([\s\S]*?)```/g;
		let match;
		const changes: { oldCode: string; newCode: string; description: string; filePath: string }[] = [];

		const replaceRegex = /<!--\s*REPLACE:\s*(.*?)\s*-->\s*```(?:latex|tex|typst|typ)?\n([\s\S]*?)```\s*<!--\s*WITH\s*-->\s*```(?:latex|tex|typst|typ)?\n([\s\S]*?)```/g;
		let replaceMatch;

		while ((replaceMatch = replaceRegex.exec(content)) !== null) {
			changes.push({
				description: replaceMatch[1].trim() || 'Code change',
				oldCode: replaceMatch[2].trim(),
				newCode: replaceMatch[3].trim(),
				filePath
			});
		}

		if (changes.length === 0) {
			while ((match = codeBlockRegex.exec(content)) !== null) {
				const code = match[1].trim();
				if (code.length > 10) {
					const beforeBlock = content.substring(0, match.index);
					const lastParagraph = beforeBlock.split('\n\n').pop()?.trim() || '';
					const description = lastParagraph.length > 10 && lastParagraph.length < 200
						? lastParagraph
						: 'Suggested code addition';

					changes.push({
						description,
						oldCode: '',
						newCode: code,
						filePath
					});
				}
			}
		}

		if (changes.length > 0) {
			changesStore.addChanges(changes);
		}
	}

	async function sendMessage() {
		const message = inputValue.trim();
		if (!message || $chatStore.isLoading) return;

		inputValue = '';
		if (textareaRef) {
			textareaRef.style.height = 'auto';
		}
		chatStore.setLoading(true);
		chatStore.setError(null);
		chatExpanded = true;

		chatStore.addMessage({ role: 'user', content: message });
		chatStore.addMessage({ role: 'assistant', content: '' });

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					message,
					model: $chatStore.selectedModel,
					context: {
						currentFile: currentFile
							? { path: currentFile.path, content: currentFile.content }
							: undefined,
						history: $chatStore.messages.slice(0, -2).map((m) => ({
							role: m.role,
							content: m.content
						}))
					}
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to send message');
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No response body');

			const decoder = new TextDecoder();
			let buffer = '';
			let fullContent = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') continue;

						try {
							const parsed = JSON.parse(data);
							if (parsed.content) {
								fullContent += parsed.content;
								chatStore.updateLastMessage(fullContent);
								scrollToBottom(); // Auto-scroll during streaming
							}
							if (parsed.error) {
								throw new Error(parsed.error);
							}
						} catch {
							// Ignore parse errors
						}
					}
				}
			}

			chatStore.finishStreaming();

			if (currentFile && fullContent) {
				parseCodeChanges(fullContent, currentFile.path);
			}

			if (conversationId) {
				await supabase
					.from('conversations')
					.update({
						messages: $chatStore.messages.map((m) => ({
							role: m.role,
							content: m.content
						}))
					} as any)
					.eq('id', conversationId);
			}
		} catch (error) {
			chatStore.setError(error instanceof Error ? error.message : 'Failed to send message');
			chatStore.finishStreaming();
		}

		chatStore.setLoading(false);
		scrollToBottom();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function clearChat() {
		if (confirm('Clear all messages?')) {
			chatStore.clearMessages();
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}, 0);
	}

	$effect(() => {
		if ($chatStore.messages.length > 0) {
			scrollToBottom();
		}
	});

	const currentModel = $derived(
		AVAILABLE_MODELS.find(m => m.id === $chatStore.selectedModel) || AVAILABLE_MODELS[0]
	);

	function handleClickOutside(event: MouseEvent) {
		if (modelDropdownRef && !modelDropdownRef.contains(event.target as Node)) {
			showModelDropdown = false;
		}
	}

	function handleChatClickOutside(event: MouseEvent) {
		if (chatPanelRef && !chatPanelRef.contains(event.target as Node)) {
			chatExpanded = false;
		}
	}

	$effect(() => {
		if (showModelDropdown) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	$effect(() => {
		if (chatExpanded) {
			// Delay adding the listener to avoid immediate collapse from the click that opened it
			const timeout = setTimeout(() => {
				document.addEventListener('click', handleChatClickOutside);
			}, 100);
			return () => {
				clearTimeout(timeout);
				document.removeEventListener('click', handleChatClickOutside);
			};
		}
	});

	// Handle applying a code change
	function handleApplyChange(_change: CodeChange, newContent: string) {
		onContentChange?.(newContent);
	}
</script>

<!-- Floating Chat Container -->
<div class="absolute bottom-0 left-0 right-0 mx-3 mb-3 z-20">
	<!-- Chat Panel -->
	<div bind:this={chatPanelRef} class="rounded-xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl overflow-hidden">
		<!-- Expandable Chat History -->
		{#if chatExpanded}
			<div class="border-b border-border/30">
				<!-- Resize Handle -->
				<div
					class="flex items-center justify-center h-5 cursor-ns-resize hover:bg-muted/50 transition-colors group border-b border-border/20"
					onmousedown={startResize}
					ondblclick={handleResizeDoubleClick}
					role="separator"
					aria-orientation="horizontal"
					title="Drag to resize, double-click to expand"
				>
					<GripHorizontal class="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground" />
				</div>

				<!-- Minimal Header -->
				<div class="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/20">
					<div class="flex items-center gap-2">
						<!-- Compact Model Selector -->
						<div class="relative" bind:this={modelDropdownRef}>
							<button
								type="button"
								class="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
								onclick={() => (showModelDropdown = !showModelDropdown)}
							>
								<span>{currentModel.name}</span>
								<ChevronDown class="h-3 w-3 opacity-50" />
							</button>

							{#if showModelDropdown}
								<div class="absolute top-full left-0 mt-1 py-1 bg-background border border-border/50 rounded-lg shadow-xl min-w-[180px] max-h-56 overflow-auto z-50">
									{#each AVAILABLE_MODELS as model}
										<button
											type="button"
											class="flex items-center justify-between w-full px-2.5 py-1.5 text-xs transition-colors {$chatStore.selectedModel === model.id ? 'text-foreground bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}"
											onclick={() => {
												chatStore.setModel(model.id);
												showModelDropdown = false;
											}}
										>
											<span>{model.name}</span>
											{#if $chatStore.selectedModel === model.id}
												<span class="text-primary text-[10px]">●</span>
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</div>

						{#if currentFile}
							<span class="text-[10px] text-muted-foreground/60 truncate max-w-24">
								{currentFile.path}
							</span>
						{/if}
					</div>

					<button
						type="button"
						class="p-1 text-muted-foreground/60 hover:text-destructive rounded transition-colors"
						onclick={clearChat}
						title="Clear"
					>
						<Trash2 class="h-3 w-3" />
					</button>
				</div>

				<!-- Messages -->
				<div bind:this={scrollContainer} class="overflow-auto" style="height: {chatHeight}px">
					<div bind:this={messagesContainer} class="flex flex-col gap-3 p-3 min-h-full">
						{#if $chatStore.messages.length === 0}
							<div class="text-center text-muted-foreground py-6">
								<p class="text-xs">Ask about your document</p>
							</div>
						{:else}
							{#each $chatStore.messages as message (message.id)}
								<Message {message} compact />
							{/each}
						{/if}

						{#if $chatStore.error}
							<div class="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
								{$chatStore.error}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Code Changes Panel -->
		{#if $pendingChanges.length > 0 && currentFile}
			<div class="border-b border-border/30">
				<CodeChanges
					getCurrentContent={() => currentFile?.content ?? ''}
					onApplyChange={handleApplyChange}
				/>
			</div>
		{/if}

		<!-- Input Bar -->
		<div class="p-2">
			<div class="flex items-end gap-2">
				<button
					type="button"
					class="p-1.5 text-muted-foreground/60 hover:text-foreground rounded-lg transition-colors shrink-0"
					onclick={() => (chatExpanded = !chatExpanded)}
				>
					{#if chatExpanded}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronUp class="h-4 w-4" />
					{/if}
				</button>

				<textarea
					bind:this={textareaRef}
					bind:value={inputValue}
					placeholder="Ask anything..."
					disabled={$chatStore.isLoading}
					onkeydown={handleKeydown}
					oninput={autoResize}
					rows="1"
					class="flex-1 text-sm bg-transparent border-0 px-2 py-1.5 focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-50 resize-none min-h-[32px] max-h-[100px]"
				></textarea>

				<button
					type="button"
					class="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 shrink-0"
					onclick={sendMessage}
					disabled={!inputValue.trim() || $chatStore.isLoading}
				>
					{#if $chatStore.isLoading}
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
					{:else}
						<Send class="h-4 w-4" />
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>
