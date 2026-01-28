import { writable, derived } from 'svelte/store';

export interface CodeChange {
	id: string;
	filePath: string;
	oldCode: string;
	newCode: string;
	description: string;
	status: 'pending' | 'accepted' | 'rejected';
	lineStart?: number;
	lineEnd?: number;
}

export interface ChangesState {
	changes: CodeChange[];
}

const initialState: ChangesState = {
	changes: []
};

function createChangesStore() {
	const { subscribe, set, update } = writable<ChangesState>(initialState);

	return {
		subscribe,
		addChange: (change: Omit<CodeChange, 'id' | 'status'>) =>
			update((state) => ({
				...state,
				changes: [
					...state.changes,
					{
						...change,
						id: crypto.randomUUID(),
						status: 'pending'
					}
				]
			})),
		addChanges: (changes: Omit<CodeChange, 'id' | 'status'>[]) =>
			update((state) => ({
				...state,
				changes: [
					...state.changes,
					...changes.map((change) => ({
						...change,
						id: crypto.randomUUID(),
						status: 'pending' as const
					}))
				]
			})),
		acceptChange: (id: string) =>
			update((state) => ({
				...state,
				changes: state.changes.map((c) =>
					c.id === id ? { ...c, status: 'accepted' as const } : c
				)
			})),
		rejectChange: (id: string) =>
			update((state) => ({
				...state,
				changes: state.changes.map((c) =>
					c.id === id ? { ...c, status: 'rejected' as const } : c
				)
			})),
		acceptAll: () =>
			update((state) => ({
				...state,
				changes: state.changes.map((c) =>
					c.status === 'pending' ? { ...c, status: 'accepted' as const } : c
				)
			})),
		rejectAll: () =>
			update((state) => ({
				...state,
				changes: state.changes.map((c) =>
					c.status === 'pending' ? { ...c, status: 'rejected' as const } : c
				)
			})),
		removeChange: (id: string) =>
			update((state) => ({
				...state,
				changes: state.changes.filter((c) => c.id !== id)
			})),
		clearResolved: () =>
			update((state) => ({
				...state,
				changes: state.changes.filter((c) => c.status === 'pending')
			})),
		reset: () => set(initialState)
	};
}

export const changesStore = createChangesStore();

export const pendingChanges = derived(changesStore, ($store) =>
	$store.changes.filter((c) => c.status === 'pending')
);

export const acceptedChanges = derived(changesStore, ($store) =>
	$store.changes.filter((c) => c.status === 'accepted')
);
