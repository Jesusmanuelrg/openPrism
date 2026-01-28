<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { projectStore, activeFile, chatStore, settingsStore, acceptedChanges } from '$lib/stores';
	import { createSupabaseClient } from '$lib/supabase';
	import { addToast } from '$lib/components/ui/toast.svelte';
	import { Input, Dialog, ResizeHandle, LayoutSettings, EditorSettings } from '$lib/components/ui';
	import Editor from '$lib/components/editor/Editor.svelte';
	import FileTabs from '$lib/components/editor/FileTabs.svelte';
	import ChatPanel from '$lib/components/chat/ChatPanel.svelte';
	import PdfViewer from '$lib/components/preview/PdfViewer.svelte';
	import FileTree from '$lib/components/sidebar/FileTree.svelte';
	import { ChevronDown, Plus, Trash2, Home, Maximize2, Minimize2, SpellCheck, FileText, BookOpen, Loader2 } from 'lucide-svelte';
	import { untrack } from 'svelte';
	import type { ChatMessage } from '$lib/stores/chat';
	import { compileTypst } from '$lib/utils/typst-compiler';

	let { data } = $props();

	const supabase = createSupabaseClient();

	let pdfData = $state<Uint8Array | null>(null);
	let compiling = $state(false);
	let compileError = $state<string | null>(null);
	let compileLog = $state<string>('');
	let compileErrors = $state<string[]>([]);
	let editingTitle = $state(false);
	let projectTitle = $state(data.project.title);
	let saveTimeout: ReturnType<typeof setTimeout>;
	let realtimeCompileTimeout: ReturnType<typeof setTimeout>;
	let showFileDropdown = $state(false);
	let showNewFileDialog = $state(false);
	let newFileName = $state('');
	let creatingFile = $state(false);

	// Track current editor content for real-time sync with ChatPanel
	let currentEditorContent = $state<string>('');

	// Editor reference for navigation
	let editorRef: Editor;

	// AI assistant features state
	let proofreading = $state(false);
	let summarizing = $state(false);
	let searchingLiterature = $state(false);
	let showLiteratureModal = $state(false);
	let literatureResults = $state<Array<{
		paperId: string;
		title: string;
		abstract?: string;
		authors: Array<{ name: string }>;
		year?: number;
		url?: string;
	}>>([]);

	onMount(() => {
		projectStore.setProject(data.project);
		projectStore.setFiles(data.files);
		projectStore.setBibliography(data.bibliography);

		// Load conversation messages
		if (data.conversation?.messages) {
			const messages = data.conversation.messages as ChatMessage[];
			messages.forEach((msg) => {
				chatStore.addMessage({ role: msg.role, content: msg.content });
			});
		}

		// Set active file to first file and open it in tabs
		if (data.files.length > 0) {
			projectStore.openFile(data.files[0].id);
		}

		// Close dropdown when clicking outside
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('.file-dropdown')) {
				showFileDropdown = false;
			}
		};
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	onDestroy(() => {
		projectStore.reset();
		chatStore.reset();
		if (saveTimeout) clearTimeout(saveTimeout);
		if (realtimeCompileTimeout) clearTimeout(realtimeCompileTimeout);
	});

	// Sync editor content only when switching to a different file
	let lastActiveFileId = $state<string | null>(null);
	$effect(() => {
		const file = $activeFile;
		if (file && file.id !== lastActiveFileId) {
			lastActiveFileId = file.id;
			currentEditorContent = file.content;
		}
	});

	// Realtime compilation effect
	$effect(() => {
		const realtimeEnabled = $settingsStore.editor.realtimeCompilation;
		const file = $activeFile;

		if (realtimeEnabled && file) {
			// Clear previous timeout
			if (realtimeCompileTimeout) clearTimeout(realtimeCompileTimeout);

			// Debounce compilation by 2 seconds
			realtimeCompileTimeout = setTimeout(() => {
				untrack(() => compile());
			}, 2000);
		}
	});

	// Auto-recompile when changes are accepted
	let lastAcceptedCount = $state(0);
	$effect(() => {
		const count = $acceptedChanges.length;
		if (count > lastAcceptedCount) {
			// New change was accepted, trigger compile
			lastAcceptedCount = count;
			untrack(() => compile());
		}
	});

	async function handleContentChange(content: string) {
		const file = $activeFile;
		if (!file) return;

		currentEditorContent = content; // Keep our local tracking in sync
		projectStore.updateFile(file.id, content);

		// Debounced save
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			projectStore.setSaving(true);
			const { error } = await supabase
				.from('project_files')
				.update({ content })
				.eq('id', file.id);

			if (error) {
				addToast('error', 'Failed to save file');
			}
			projectStore.setSaving(false);
		}, 1000);
	}

	async function updateProjectTitle() {
		editingTitle = false;
		if (projectTitle === data.project.title) return;

		const { error } = await supabase
			.from('projects')
			.update({ title: projectTitle })
			.eq('id', data.project.id);

		if (error) {
			addToast('error', 'Failed to update title');
			projectTitle = data.project.title;
		}
	}

	async function compile() {
		const file = $activeFile;
		if (!file || compiling) return;

		compiling = true;
		compileError = null;
		compileLog = '';
		compileErrors = [];

		try {
			// Check if this is a Typst project - compile client-side
			if (data.project.format === 'typst' && browser) {
				const result = await compileTypst(file.content);

				if (result.error) {
					compileError = result.error;
					compileErrors = [result.error];
					return;
				}

				if (result.pdf) {
					pdfData = result.pdf;
				}
				return;
			}

			// LaTeX compilation - use server API
			const response = await fetch('/api/compile', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source: file.content,
					format: data.project.format
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				compileError = errorData.error || 'Compilation failed';
				compileLog = errorData.log || '';
				// Parse errors from log (basic pattern matching for LaTeX errors)
				if (compileLog) {
					const errorMatches = compileLog.match(/^!.*$/gm) || [];
					const lineMatches = compileLog.match(/l\.\d+.*/gm) || [];
					compileErrors = [...errorMatches, ...lineMatches].slice(0, 10);
				}
				return;
			}

			const arrayBuffer = await response.arrayBuffer();
			pdfData = new Uint8Array(arrayBuffer);
		} catch (err) {
			compileError = err instanceof Error ? err.message : 'Compilation failed';
		} finally {
			compiling = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		// Ctrl/Cmd + S to save
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			const file = $activeFile;
			if (file) {
				handleContentChange(file.content);
			}
		}
		// Ctrl/Cmd + B or Ctrl/Cmd + Enter to compile
		if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'Enter')) {
			e.preventDefault();
			compile();
		}
	}

	function selectFile(fileId: string) {
		projectStore.openFile(fileId);
		showFileDropdown = false;
	}

	function handleNavigateToChange(lineNumber: number) {
		editorRef?.gotoLine(lineNumber);
	}

	// AI Assistant: Proofread document
	async function proofreadDocument() {
		const file = $activeFile;
		if (!file || proofreading) return;

		proofreading = true;
		settingsStore.setChatFullscreen(true);

		// Add user message to chat
		chatStore.addMessage({
			role: 'user',
			content: 'Please proofread this document. Check for grammar, spelling, punctuation, clarity, and academic writing style. Suggest specific corrections.'
		});
		chatStore.addMessage({ role: 'assistant', content: '' });
		chatStore.setLoading(true);

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId: data.project.id,
					message: 'Please proofread this document. Check for grammar, spelling, punctuation, clarity, and academic writing style. Suggest specific corrections with line references where possible.',
					model: $chatStore.selectedModel,
					context: {
						currentFile: { path: file.path, content: file.content },
						history: $chatStore.messages.slice(0, -2).map((m) => ({
							role: m.role,
							content: m.content
						}))
					}
				})
			});

			if (!response.ok) throw new Error('Failed to proofread');

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
						const lineData = line.slice(6);
						if (lineData === '[DONE]') continue;
						try {
							const parsed = JSON.parse(lineData);
							if (parsed.content) {
								fullContent += parsed.content;
								chatStore.updateLastMessage(fullContent);
							}
						} catch { /* ignore */ }
					}
				}
			}

			chatStore.finishStreaming();
		} catch (error) {
			chatStore.setError(error instanceof Error ? error.message : 'Proofreading failed');
			chatStore.finishStreaming();
		}

		chatStore.setLoading(false);
		proofreading = false;
	}

	// AI Assistant: Summarize document
	async function summarizeDocument() {
		const file = $activeFile;
		if (!file || summarizing) return;

		summarizing = true;
		settingsStore.setChatFullscreen(true);

		chatStore.addMessage({
			role: 'user',
			content: 'Please provide a concise summary of this paper/document.'
		});
		chatStore.addMessage({ role: 'assistant', content: '' });
		chatStore.setLoading(true);

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId: data.project.id,
					message: 'Please provide a concise summary of this paper/document. Include: 1) Main objective/research question, 2) Key methodology, 3) Main findings/contributions, 4) Conclusions. Keep it brief but comprehensive.',
					model: $chatStore.selectedModel,
					context: {
						currentFile: { path: file.path, content: file.content },
						history: $chatStore.messages.slice(0, -2).map((m) => ({
							role: m.role,
							content: m.content
						}))
					}
				})
			});

			if (!response.ok) throw new Error('Failed to summarize');

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
						const lineData = line.slice(6);
						if (lineData === '[DONE]') continue;
						try {
							const parsed = JSON.parse(lineData);
							if (parsed.content) {
								fullContent += parsed.content;
								chatStore.updateLastMessage(fullContent);
							}
						} catch { /* ignore */ }
					}
				}
			}

			chatStore.finishStreaming();
		} catch (error) {
			chatStore.setError(error instanceof Error ? error.message : 'Summarization failed');
			chatStore.finishStreaming();
		}

		chatStore.setLoading(false);
		summarizing = false;
	}

	// AI Assistant: Find related literature
	async function findLiterature() {
		const file = $activeFile;
		if (!file || searchingLiterature) return;

		searchingLiterature = true;
		literatureResults = [];

		try {
			// Extract keywords from the document title and first few paragraphs
			const content = file.content;
			// Try to get title from LaTeX/Typst
			const titleMatch = content.match(/\\title\{([^}]+)\}/) ||
			                   content.match(/#\s*set\s+document\s*\(\s*title:\s*"([^"]+)"/) ||
			                   content.match(/^#\s+(.+)$/m);

			// Get abstract if available
			const abstractMatch = content.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/) ||
			                      content.match(/\\abstract\{([\s\S]*?)\}/);

			// Build search query from title and abstract
			let searchQuery = titleMatch?.[1]?.trim() || '';
			if (abstractMatch) {
				// Add first 100 chars of abstract
				searchQuery += ' ' + abstractMatch[1].trim().substring(0, 100);
			}

			// Fallback: use first 200 chars of content
			if (!searchQuery.trim()) {
				searchQuery = content.replace(/[\\#%{}]/g, ' ').substring(0, 200);
			}

			// Clean up the query
			searchQuery = searchQuery.replace(/\s+/g, ' ').trim().substring(0, 150);

			// Search both Arxiv and Semantic Scholar
			const [arxivResponse, ssResponse] = await Promise.allSettled([
				fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&source=arxiv&limit=5`),
				fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&source=semantic-scholar&limit=5`)
			]);

			const results: typeof literatureResults = [];

			if (arxivResponse.status === 'fulfilled' && arxivResponse.value.ok) {
				const arxivData = await arxivResponse.value.json();
				results.push(...(arxivData.papers || []));
			}

			if (ssResponse.status === 'fulfilled' && ssResponse.value.ok) {
				const ssData = await ssResponse.value.json();
				results.push(...(ssData.papers || []));
			}

			// Deduplicate by title similarity
			const seen = new Set<string>();
			literatureResults = results.filter(paper => {
				const key = paper.title.toLowerCase().substring(0, 50);
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			}).slice(0, 10);

			showLiteratureModal = true;
		} catch (error) {
			addToast('error', 'Failed to search for literature');
		}

		searchingLiterature = false;
	}

	async function createFile() {
		if (!newFileName.trim()) return;

		creatingFile = true;
		let path = newFileName.trim();

		if (!path.includes('.')) {
			const format = $projectStore.project?.format ?? 'latex';
			path += format === 'latex' ? '.tex' : '.typ';
		}

		const { data: file, error } = await supabase
			.from('project_files')
			.insert({
				project_id: data.project.id,
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
			projectStore.openFile((file as any).id);
			showNewFileDialog = false;
			newFileName = '';
		}

		creatingFile = false;
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

	function handleResize(width: number) {
		settingsStore.setPanelWidth(width);
	}

	function handleResetWidth() {
		settingsStore.resetPanelWidth();
	}
</script>

<svelte:window onkeydowncapture={handleKeydown} />

<div class="h-screen flex bg-background resize-container">
	<!-- Files Sidebar (conditional) -->
	{#if $settingsStore.layout.filesDisplay === 'sidebar'}
		<div class="w-48 border-r border-border flex flex-col bg-muted/20 shrink-0">
			<div class="h-10 flex items-center px-3 border-b border-border-subtle">
				<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Files</span>
			</div>
			<FileTree projectId={data.project.id} />
		</div>
	{/if}

	<!-- Left Panel: Editor + Chat (bottom mode) or just Editor (side mode) -->
	<div class="flex flex-col min-w-0" style="width: {$settingsStore.layout.panelWidth}%">
		<!-- Header -->
		<header class="h-12 flex items-center justify-between px-4 border-b border-border-subtle shrink-0 backdrop-blur-sm relative z-[200]">
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="p-1.5 hover:bg-muted rounded-lg transition-all duration-200"
					onclick={() => goto('/')}
				>
					<Home class="h-4 w-4 text-muted-foreground" />
				</button>

				<EditorSettings />

				<!-- File Dropdown (only when sidebar is disabled) -->
				{#if $settingsStore.layout.filesDisplay === 'dropdown'}
					<div class="file-dropdown relative">
						<button
							type="button"
							class="flex items-center gap-1.5 text-sm hover:bg-muted px-3 py-1.5 rounded-lg transition-all duration-200"
							onclick={() => (showFileDropdown = !showFileDropdown)}
						>
							<span class="text-muted-foreground max-w-32 truncate">
								{$activeFile?.path || 'No file'}
							</span>
							<ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
						</button>

						{#if showFileDropdown}
							<div class="absolute top-full left-0 mt-2 w-56 bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden">
								<div class="py-2">
									{#each $projectStore.files as file (file.id)}
										<div
											class="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/50 text-left group cursor-pointer transition-colors {$activeFile?.id === file.id ? 'bg-muted/50' : ''}"
											role="button"
											tabindex="0"
											onclick={() => selectFile(file.id)}
											onkeydown={(e) => e.key === 'Enter' && selectFile(file.id)}
										>
											<span class="truncate">{file.path}</span>
											<button
												type="button"
												class="p-1 hover:text-destructive opacity-0 group-hover:opacity-100 rounded-md transition-all"
												onclick={(e) => deleteFile(file.id, e)}
											>
												<Trash2 class="h-3.5 w-3.5" />
											</button>
										</div>
									{/each}
									<div class="border-t border-border/30 my-2"></div>
									<button
										type="button"
										class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50 text-muted-foreground transition-colors"
										onclick={() => { showFileDropdown = false; showNewFileDialog = true; }}
									>
										<Plus class="h-3.5 w-3.5" />
										New file
									</button>
								</div>
							</div>
						{/if}
					</div>

					<div class="h-5 w-px bg-border-subtle"></div>
				{/if}

				{#if editingTitle}
					<input
						bind:value={projectTitle}
						class="text-xs bg-transparent border-b border-foreground focus:outline-none w-32"
						onkeydown={(e) => e.key === 'Enter' && updateProjectTitle()}
						onblur={updateProjectTitle}
					/>
				{:else}
					<button
						type="button"
						class="text-xs text-muted-foreground hover:text-foreground transition-colors"
						ondblclick={() => (editingTitle = true)}
					>
						{projectTitle}
					</button>
				{/if}

				{#if $projectStore.saving}
					<span class="text-[10px] text-muted-foreground">Saving...</span>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<!-- AI Assistant Buttons -->
				<div class="flex items-center gap-1 border-r border-border-subtle pr-2 mr-1">
					<button
						type="button"
						class="p-2 hover:bg-muted rounded-lg transition-all duration-200 disabled:opacity-50"
						onclick={proofreadDocument}
						disabled={proofreading || !$activeFile}
						title="Proofread document"
					>
						{#if proofreading}
							<Loader2 class="h-4 w-4 text-muted-foreground animate-spin" />
						{:else}
							<SpellCheck class="h-4 w-4 text-muted-foreground" />
						{/if}
					</button>
					<button
						type="button"
						class="p-2 hover:bg-muted rounded-lg transition-all duration-200 disabled:opacity-50"
						onclick={summarizeDocument}
						disabled={summarizing || !$activeFile}
						title="Summarize document"
					>
						{#if summarizing}
							<Loader2 class="h-4 w-4 text-muted-foreground animate-spin" />
						{:else}
							<FileText class="h-4 w-4 text-muted-foreground" />
						{/if}
					</button>
					<button
						type="button"
						class="p-2 hover:bg-muted rounded-lg transition-all duration-200 disabled:opacity-50"
						onclick={findLiterature}
						disabled={searchingLiterature || !$activeFile}
						title="Find related literature"
					>
						{#if searchingLiterature}
							<Loader2 class="h-4 w-4 text-muted-foreground animate-spin" />
						{:else}
							<BookOpen class="h-4 w-4 text-muted-foreground" />
						{/if}
					</button>
				</div>

				<LayoutSettings />
				<button
					type="button"
					class="p-2 hover:bg-muted rounded-lg transition-all duration-200"
					onclick={() => settingsStore.toggleChatFullscreen()}
					title={$settingsStore.layout.chatFullscreen ? 'Exit fullscreen chat' : 'Fullscreen chat'}
				>
					{#if $settingsStore.layout.chatFullscreen}
						<Minimize2 class="h-4 w-4 text-muted-foreground" />
					{:else}
						<Maximize2 class="h-4 w-4 text-muted-foreground" />
					{/if}
				</button>
				<button
					type="button"
					class="text-sm px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
					onclick={compile}
					disabled={compiling}
				>
					{compiling ? 'Compiling...' : 'Compile'}
					{#if !compiling}
						<kbd class="text-[10px] bg-primary-foreground/20 px-1.5 py-0.5 rounded">⌘↵</kbd>
					{/if}
				</button>
			</div>
		</header>

		<!-- File Tabs -->
		<FileTabs
			files={$projectStore.files}
			openFileIds={$projectStore.openFileIds}
			activeFileId={$projectStore.activeFileId}
			onSelect={(fileId) => projectStore.openFile(fileId)}
			onClose={(fileId) => projectStore.closeFile(fileId)}
		/>

		<!-- Editor Area with floating chat -->
		<div class="flex-1 overflow-hidden relative z-10">
			{#if $activeFile}
				<Editor
					bind:this={editorRef}
					content={$activeFile.content}
					format={data.project.format}
					onchange={handleContentChange}
				/>
			{:else}
				<div class="flex flex-1 items-center justify-center text-muted-foreground h-full">
					<p class="text-sm">Select a file to edit</p>
				</div>
			{/if}

			<!-- Chat Panel floats over the editor (only in bottom mode, not in fullscreen) -->
			{#if $settingsStore.layout.chatPosition === 'bottom' && !$settingsStore.layout.chatFullscreen}
				<ChatPanel
					projectId={data.project.id}
					conversationId={data.conversation?.id}
					currentFile={$activeFile}
					editorContent={currentEditorContent}
					onContentChange={handleContentChange}
					onNavigateToChange={handleNavigateToChange}
				/>
			{/if}
		</div>
	</div>

	<!-- Resize Handle between left panel and chat/preview -->
	<ResizeHandle
		leftWidth={$settingsStore.layout.panelWidth}
		onResize={handleResize}
		onReset={handleResetWidth}
	/>

	<!-- Chat Panel as Side Column (optional, not in fullscreen) -->
	{#if $settingsStore.layout.chatPosition === 'side' && !$settingsStore.layout.chatFullscreen}
		<div class="w-80 border-r border-border flex flex-col bg-background shrink-0">
			<ChatPanel
				projectId={data.project.id}
				conversationId={data.conversation?.id}
				currentFile={$activeFile}
				editorContent={currentEditorContent}
				onContentChange={handleContentChange}
				onNavigateToChange={handleNavigateToChange}
				mode="side"
			/>
		</div>
	{/if}

	<!-- Right Panel: PDF Preview -->
	<div class="flex-1 bg-muted/30 flex flex-col min-w-0">
		{#if pdfData}
			<PdfViewer
				data={pdfData}
				{compileLog}
				{compileErrors}
				isCompiling={compiling}
				onRecompile={compile}
			/>
		{:else if compileError}
			<div class="m-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
				<pre class="whitespace-pre-wrap font-mono">{compileError}</pre>
			</div>
		{:else}
			<div class="flex flex-1 items-center justify-center text-muted-foreground">
				<div class="text-center">
					<p class="text-sm">No preview</p>
					<p class="text-xs mt-1 text-muted-foreground/70">Press Compile or Cmd+B</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Fullscreen Chat Mode -->
{#if $settingsStore.layout.chatFullscreen}
	<ChatPanel
		projectId={data.project.id}
		conversationId={data.conversation?.id}
		currentFile={$activeFile}
		editorContent={currentEditorContent}
		onContentChange={handleContentChange}
		onNavigateToChange={handleNavigateToChange}
		onExitFullscreen={() => settingsStore.setChatFullscreen(false)}
		mode="fullscreen"
	/>
{/if}

<!-- New File Dialog -->
<Dialog bind:open={showNewFileDialog} title="New File">
	<form onsubmit={(e) => { e.preventDefault(); createFile(); }}>
		<Input
			bind:value={newFileName}
			placeholder="filename.tex"
			disabled={creatingFile}
			class="mb-4"
		/>
		<div class="flex justify-end gap-3">
			<button
				type="button"
				class="text-sm px-4 py-2 hover:bg-muted rounded-lg transition-all duration-200"
				onclick={() => (showNewFileDialog = false)}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-sm transition-all duration-200 disabled:opacity-50"
				disabled={creatingFile || !newFileName.trim()}
			>
				Create
			</button>
		</div>
	</form>
</Dialog>

<!-- Literature Search Results Modal -->
<Dialog bind:open={showLiteratureModal} title="Related Literature">
	<div class="max-h-[60vh] overflow-auto -mx-2 px-2">
		{#if literatureResults.length === 0}
			<div class="text-center py-8 text-muted-foreground">
				<BookOpen class="h-8 w-8 mx-auto mb-2 opacity-50" />
				<p class="text-sm">No related papers found</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each literatureResults as paper (paper.paperId)}
					<div class="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
						<a
							href={paper.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
						>
							{paper.title}
						</a>
						<div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
							{#if paper.year}
								<span>{paper.year}</span>
								<span>•</span>
							{/if}
							<span class="truncate">
								{paper.authors.slice(0, 3).map(a => a.name).join(', ')}
								{#if paper.authors.length > 3}
									<span> et al.</span>
								{/if}
							</span>
						</div>
						{#if paper.abstract}
							<p class="mt-2 text-xs text-muted-foreground line-clamp-3">
								{paper.abstract}
							</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<div class="flex justify-end mt-4">
		<button
			type="button"
			class="text-sm px-4 py-2 hover:bg-muted rounded-lg transition-all duration-200"
			onclick={() => (showLiteratureModal = false)}
		>
			Close
		</button>
	</div>
</Dialog>
