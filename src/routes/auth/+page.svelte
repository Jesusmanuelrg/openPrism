<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button, Input, Card } from '$lib/components/ui';
	import { addToast } from '$lib/components/ui/toast.svelte';
	import { createSupabaseClient } from '$lib/supabase';
	import { FileText } from 'lucide-svelte';

	const supabase = createSupabaseClient();

	let mode = $state<'login' | 'signup'>('login');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		if (mode === 'signup') {
			const { error: signUpError } = await supabase.auth.signUp({
				email,
				password
			});

			if (signUpError) {
				error = signUpError.message;
			} else {
				addToast('success', 'Check your email to confirm your account');
			}
		} else {
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (signInError) {
				error = signInError.message;
			} else {
				goto('/');
			}
		}

		loading = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSubmit(e);
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card class="w-full max-w-md p-8">
		<div class="mb-8 flex flex-col items-center">
			<div class="flex items-center gap-2">
				<FileText class="h-8 w-8 text-primary" />
				<span class="text-2xl font-bold">Prism</span>
			</div>
			<p class="mt-2 text-sm text-muted-foreground">Scientific Workspace</p>
		</div>

		<div class="mb-6 flex rounded-lg bg-muted p-1">
			<button
				type="button"
				class="flex-1 rounded-md py-2 text-sm font-medium transition-colors {mode === 'login'
					? 'bg-background shadow'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (mode = 'login')}
			>
				Sign In
			</button>
			<button
				type="button"
				class="flex-1 rounded-md py-2 text-sm font-medium transition-colors {mode === 'signup'
					? 'bg-background shadow'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (mode = 'signup')}
			>
				Sign Up
			</button>
		</div>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<label for="email" class="mb-2 block text-sm font-medium">Email</label>
				<Input
					type="email"
					id="email"
					bind:value={email}
					placeholder="you@example.com"
					disabled={loading}
					onkeydown={handleKeydown}
				/>
			</div>

			<div>
				<label for="password" class="mb-2 block text-sm font-medium">Password</label>
				<Input
					type="password"
					id="password"
					bind:value={password}
					placeholder="••••••••"
					disabled={loading}
					onkeydown={handleKeydown}
				/>
			</div>

			{#if error}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			{/if}

			<Button type="submit" class="w-full" disabled={loading}>
				{#if loading}
					<div class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
				{/if}
				{mode === 'login' ? 'Sign In' : 'Sign Up'}
			</Button>
		</form>

		<p class="mt-6 text-center text-sm text-muted-foreground">
			{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
			<button
				type="button"
				class="ml-1 text-primary hover:underline"
				onclick={() => (mode = mode === 'login' ? 'signup' : 'login')}
			>
				{mode === 'login' ? 'Sign up' : 'Sign in'}
			</button>
		</p>
	</Card>
</div>
