<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseClient } from '$lib/supabase';
	import { FileText, LogOut, Plus, Trash2, X } from 'lucide-svelte';
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
	<header class="border-b border-border/50">
		<div class="max-w-5xl mx-auto flex h-14 items-center justify-between px-6">
			<div class="flex items-center gap-2">
				<FileText class="h-5 w-5" />
				<span class="font-semibold">Prism</span>
			</div>

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
					class="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
					onclick={() => goto('/auth')}
				>
					Sign In
				</button>
			{/if}
		</div>
	</header>

	<main class="max-w-5xl mx-auto px-6 py-12">
		{#if !data.session}
			<!-- Landing Hero -->
			<div class="flex flex-col items-center justify-center py-24 text-center">
				<h1 class="text-4xl font-bold tracking-tight">Write. Compile. Publish.</h1>
				<p class="mt-4 max-w-lg text-muted-foreground">
					A minimal editor for LaTeX and Typst with AI assistance and real-time preview.
				</p>
				<button
					type="button"
					class="mt-10 px-6 py-3 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
					onclick={() => goto('/auth')}
				>
					Get Started
				</button>
			</div>
		{:else}
			<!-- Projects Header -->
			<div class="flex items-center justify-between mb-8">
				<h1 class="text-xl font-semibold">Projects</h1>
				<button
					type="button"
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
					onclick={() => (showFormatModal = true)}
				>
					<Plus class="h-4 w-4" />
					New
				</button>
			</div>

			<!-- Projects List -->
			{#if loading}
				<div class="flex items-center justify-center py-24">
					<div class="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent"></div>
				</div>
			{:else if projects.length === 0}
				<div class="flex flex-col items-center justify-center py-24 text-center">
					<div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
						<FileText class="h-6 w-6 text-muted-foreground" />
					</div>
					<p class="text-muted-foreground">No projects yet</p>
					<button
						type="button"
						class="mt-6 flex items-center gap-2 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
						onclick={() => (showFormatModal = true)}
					>
						<Plus class="h-4 w-4" />
						Create Project
					</button>
				</div>
			{:else}
				<div class="space-y-2">
					{#each projects as project (project.id)}
						<a
							href="/app/{project.id}"
							class="group flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
						>
							<div class="flex items-center gap-4">
								<span class="font-medium">{project.title}</span>
								<span class="text-xs uppercase tracking-wider text-muted-foreground px-2 py-0.5 bg-muted rounded">
									{project.format}
								</span>
							</div>
							<div class="flex items-center gap-4">
								<span class="text-sm text-muted-foreground">
									{new Date(project.updated_at).toLocaleDateString()}
								</span>
								<button
									type="button"
									class="p-1.5 text-muted-foreground hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-all"
									onclick={(e) => {
										e.preventDefault();
										deleteProject(project.id);
									}}
									title="Delete"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</div>
						</a>
					{/each}
				</div>
			{/if}
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
		<div class="relative bg-background border border-border/50 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-lg font-semibold">New Project</h2>
				<button
					type="button"
					class="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
					onclick={() => (showFormatModal = false)}
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<p class="text-sm text-muted-foreground mb-4">Choose a format for your document.</p>

			<div class="grid grid-cols-2 gap-3 mb-6">
				<button
					type="button"
					class="p-4 rounded-lg border-2 transition-colors text-left {selectedFormat === 'latex' ? 'border-foreground bg-muted/50' : 'border-border/50 hover:border-border'}"
					onclick={() => (selectedFormat = 'latex')}
				>
					<span class="font-medium">LaTeX</span>
					<p class="text-xs text-muted-foreground mt-1">Traditional typesetting</p>
				</button>
				<button
					type="button"
					class="p-4 rounded-lg border-2 transition-colors text-left {selectedFormat === 'typst' ? 'border-foreground bg-muted/50' : 'border-border/50 hover:border-border'}"
					onclick={() => (selectedFormat = 'typst')}
				>
					<span class="font-medium">Typst</span>
					<p class="text-xs text-muted-foreground mt-1">Modern alternative</p>
				</button>
			</div>

			<button
				type="button"
				class="w-full py-2.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
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
