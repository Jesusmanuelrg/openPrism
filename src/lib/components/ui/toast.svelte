<script lang="ts" module>
	import { writable } from 'svelte/store';

	export interface Toast {
		id: string;
		type: 'success' | 'error' | 'info';
		message: string;
	}

	export const toasts = writable<Toast[]>([]);

	export function addToast(type: Toast['type'], message: string, duration = 5000) {
		const id = crypto.randomUUID();
		toasts.update((t) => [...t, { id, type, message }]);
		setTimeout(() => {
			toasts.update((t) => t.filter((toast) => toast.id !== id));
		}, duration);
	}

	export function removeToast(id: string) {
		toasts.update((t) => t.filter((toast) => toast.id !== id));
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { X } from 'lucide-svelte';
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
	{#each $toasts as toast (toast.id)}
		<div
			class={cn(
				'flex items-center justify-between gap-4 rounded-lg border px-4 py-3 shadow-lg',
				toast.type === 'success' && 'border-green-500 bg-green-50 text-green-900',
				toast.type === 'error' && 'border-red-500 bg-red-50 text-red-900',
				toast.type === 'info' && 'border-blue-500 bg-blue-50 text-blue-900'
			)}
		>
			<p class="text-sm">{toast.message}</p>
			<button
				type="button"
				class="opacity-70 hover:opacity-100"
				onclick={() => removeToast(toast.id)}
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	{/each}
</div>
