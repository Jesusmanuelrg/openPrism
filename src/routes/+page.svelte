<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseClient } from '$lib/supabase';
	import { LogOut, Plus, Trash2, X, Sparkles, Zap, Eye } from 'lucide-svelte';
	import type { Project } from '$lib/utils/database.types';

	let { data } = $props();

	const supabase = createSupabaseClient();
	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let creating = $state(false);
	let showFormatModal = $state(false);
	let selectedFormat = $state<'latex' | 'typst'>('latex');

	const TEMPLATES = {
		latex: `\\documentclass{article}
\\usepackage[utf8]{inputenc}

\\title{Untitled Document}
\\author{}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

Your content here.

\\end{document}`,
		typst: `#set document(title: "Untitled Document")
#set page(paper: "us-letter")
#set text(font: "New Computer Modern", size: 11pt)

= Introduction

Your content here.
`
	};

	async function loadProjects() {
		if (!data.session) return;

		const { data: projectsData, error } = await supabase
			.from('projects')
			.select('*')
			.order('updated_at', { ascending: false });

		if (!error && projectsData) {
			projects = projectsData;
		}
		loading = false;
	}

	async function createProject() {
		if (!data.session) return;

		creating = true;
		const fileName = selectedFormat === 'latex' ? 'main.tex' : 'main.typ';

		const { data: project, error } = await supabase
			.from('projects')
			.insert({
				user_id: data.session.user.id,
				title: 'Untitled Project',
				format: selectedFormat
			})
			.select()
			.single();

		if (!error && project) {
			await supabase.from('project_files').insert({
				project_id: project.id,
				path: fileName,
				content: TEMPLATES[selectedFormat],
				type: 'document'
			});

			goto(`/app/${project.id}`);
		}
		creating = false;
		showFormatModal = false;
	}

	async function deleteProject(projectId: string) {
		if (!confirm('Delete this project?')) return;

		await supabase.from('projects').delete().eq('id', projectId);
		projects = projects.filter((p) => p.id !== projectId);
	}

	async function signOut() {
		await supabase.auth.signOut();
		goto('/auth');
	}

	$effect(() => {
		if (data.session) {
			loadProjects();
		}
	});
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="border-b border-border/30">
		<div class="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
			<span class="text-lg font-semibold tracking-tight">OpenPrism</span>

			{#if data.session}
				<div class="flex items-center gap-4">
					<span class="text-sm text-muted-foreground">{data.user?.email}</span>
					<button
						type="button"
						class="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
						onclick={signOut}
						title="Sign out"
					>
						<LogOut class="h-4 w-4" />
					</button>
				</div>
			{:else}
				<button
					type="button"
					class="px-5 py-2 text-sm font-medium bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
					onclick={() => goto('/auth')}
				>
					Sign In
				</button>
			{/if}
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6">
		{#if !data.session}
			<!-- Landing Hero -->
			<div class="flex flex-col items-center justify-center py-32 text-center">
				<div class="inline-flex items-center gap-2 px-3 py-1 mb-8 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full border border-border/50">
					<Sparkles class="h-3 w-3" />
					AI-powered document editing
				</div>

				<h1 class="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
					Write beautifully.<br />
					<span class="text-muted-foreground">Publish effortlessly.</span>
				</h1>

				<p class="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
					A minimal, modern editor for LaTeX and Typst. Real-time preview, AI assistance, and a distraction-free writing experience.
				</p>

				<div class="flex items-center gap-4 mt-12">
					<button
						type="button"
						class="px-8 py-3.5 text-sm font-medium bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
						onclick={() => goto('/auth')}
					>
						Get Started Free
					</button>
					<a
						href="https://github.com"
						target="_blank"
						rel="noopener"
						class="px-6 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full border border-border/50 hover:border-border transition-colors"
					>
						View on GitHub
					</a>
				</div>

				<!-- Features Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24 w-full max-w-3xl">
					<div class="p-6 rounded-2xl bg-muted/30 border border-border/30 text-left">
						<div class="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4">
							<Zap class="h-5 w-5 text-muted-foreground" />
						</div>
						<h3 class="font-medium mb-2">Real-time Compilation</h3>
						<p class="text-sm text-muted-foreground leading-relaxed">
							See your changes instantly with live PDF preview as you type.
						</p>
					</div>

					<div class="p-6 rounded-2xl bg-muted/30 border border-border/30 text-left">
						<div class="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4">
							<Sparkles class="h-5 w-5 text-muted-foreground" />
						</div>
						<h3 class="font-medium mb-2">AI Assistant</h3>
						<p class="text-sm text-muted-foreground leading-relaxed">
							Get help with writing, proofreading, and formatting your documents.
						</p>
					</div>

					<div class="p-6 rounded-2xl bg-muted/30 border border-border/30 text-left">
						<div class="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4">
							<Eye class="h-5 w-5 text-muted-foreground" />
						</div>
						<h3 class="font-medium mb-2">Modern Interface</h3>
						<p class="text-sm text-muted-foreground leading-relaxed">
							Clean, minimal design that stays out of your way while you write.
						</p>
					</div>
				</div>

				<!-- Formats -->
				<div class="mt-20 text-center">
					<p class="text-xs uppercase tracking-wider text-muted-foreground mb-4">Supports</p>
					<div class="flex items-center justify-center gap-8">
						<div class="flex items-center gap-2 text-muted-foreground">
							<span class="font-mono text-lg">LaTeX</span>
						</div>
						<div class="h-4 w-px bg-border"></div>
						<div class="flex items-center gap-2 text-muted-foreground">
							<span class="font-mono text-lg">Typst</span>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="mt-24 pt-8 border-t border-border/30 text-center">
					<p class="text-sm text-muted-foreground">
						Made by <a href="https://x.com/TheCreatorAbove" target="_blank" rel="noopener" class="text-foreground hover:underline">Jesus Remon</a>
					</p>
				</div>
			</div>
		{:else}
			<!-- Projects Dashboard -->
			<div class="py-12">
				<div class="flex items-center justify-between mb-8">
					<h1 class="text-2xl font-semibold">Your Projects</h1>
					<button
						type="button"
						class="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
						onclick={() => (showFormatModal = true)}
					>
						<Plus class="h-4 w-4" />
						New Project
					</button>
				</div>

				{#if loading}
					<div class="flex items-center justify-center py-32">
						<div class="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent"></div>
					</div>
				{:else if projects.length === 0}
					<div class="flex flex-col items-center justify-center py-32 text-center">
						<div class="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
							<Plus class="h-8 w-8 text-muted-foreground" />
						</div>
						<h2 class="text-lg font-medium mb-2">No projects yet</h2>
						<p class="text-muted-foreground mb-8">Create your first project to get started</p>
						<button
							type="button"
							class="flex items-center gap-2 px-6 py-3 text-sm font-medium bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
							onclick={() => (showFormatModal = true)}
						>
							<Plus class="h-4 w-4" />
							Create Project
						</button>
					</div>
				{:else}
					<div class="grid gap-3">
						{#each projects as project (project.id)}
							<a
								href="/app/{project.id}"
								class="group flex items-center justify-between p-5 rounded-xl border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all"
							>
								<div class="flex items-center gap-4">
									<div class="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
										<span class="text-xs font-mono uppercase text-muted-foreground">
											{project.format === 'latex' ? 'TEX' : 'TYP'}
										</span>
									</div>
									<div>
										<span class="font-medium">{project.title}</span>
										<p class="text-sm text-muted-foreground mt-0.5">
											Last edited {new Date(project.updated_at).toLocaleDateString(undefined, {
												month: 'short',
												day: 'numeric',
												year: project.updated_at.startsWith(new Date().getFullYear().toString()) ? undefined : 'numeric'
											})}
										</p>
									</div>
								</div>
								<button
									type="button"
									class="p-2 text-muted-foreground hover:text-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-all"
									onclick={(e) => {
										e.preventDefault();
										deleteProject(project.id);
									}}
									title="Delete project"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

<!-- Format Selection Modal -->
{#if showFormatModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 bg-background/80 backdrop-blur-sm"
			onclick={() => (showFormatModal = false)}
		></button>

		<!-- Modal -->
		<div class="relative bg-background border border-border/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-lg font-semibold">New Project</h2>
				<button
					type="button"
					class="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
					onclick={() => (showFormatModal = false)}
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<p class="text-sm text-muted-foreground mb-5">Choose a format for your document.</p>

			<div class="grid grid-cols-2 gap-3 mb-6">
				<button
					type="button"
					class="p-5 rounded-xl border-2 transition-all text-left {selectedFormat === 'latex' ? 'border-foreground bg-muted/30' : 'border-border/50 hover:border-border'}"
					onclick={() => (selectedFormat = 'latex')}
				>
					<span class="font-medium">LaTeX</span>
					<p class="text-xs text-muted-foreground mt-1.5">Traditional typesetting system</p>
				</button>
				<button
					type="button"
					class="p-5 rounded-xl border-2 transition-all text-left {selectedFormat === 'typst' ? 'border-foreground bg-muted/30' : 'border-border/50 hover:border-border'}"
					onclick={() => (selectedFormat = 'typst')}
				>
					<span class="font-medium">Typst</span>
					<p class="text-xs text-muted-foreground mt-1.5">Modern, fast alternative</p>
				</button>
			</div>

			<button
				type="button"
				class="w-full py-3 text-sm font-medium bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
				onclick={createProject}
				disabled={creating}
			>
				{#if creating}
					Creating...
				{:else}
					Create Project
				{/if}
			</button>
		</div>
	</div>
{/if}
