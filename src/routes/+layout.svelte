<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createSupabaseClient } from '$lib/supabase';
	import { Toast } from '$lib/components/ui';
	import { settingsStore } from '$lib/stores';

	let { data, children } = $props();

	const supabase = createSupabaseClient();

	onMount(() => {
		const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
			if (
				event === 'INITIAL_SESSION' ||
				event === 'SIGNED_IN' ||
				event === 'SIGNED_OUT' ||
				event === 'TOKEN_REFRESHED'
			) {
				invalidate('supabase:auth');
			}
		});

		return () => {
			authListener.subscription.unsubscribe();
		};
	});

	// Toggle dark class on html element based on settings
	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', !$settingsStore.editor.lightMode);
		}
	});
</script>

<svelte:head>
	<title>OpenPrism - Scientific Workspace</title>
</svelte:head>

{@render children()}
<Toast />
