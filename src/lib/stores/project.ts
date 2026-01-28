import { writable, derived } from 'svelte/store';
import type { Project, ProjectFile, Bibliography } from '$lib/utils/database.types';

export interface ProjectState {
	project: Project | null;
	files: ProjectFile[];
	bibliography: Bibliography[];
	activeFileId: string | null;
	openFileIds: string[];
	loading: boolean;
	saving: boolean;
	error: string | null;
}

const initialState: ProjectState = {
	project: null,
	files: [],
	bibliography: [],
	activeFileId: null,
	openFileIds: [],
	loading: false,
	saving: false,
	error: null
};

function createProjectStore() {
	const { subscribe, set, update } = writable<ProjectState>(initialState);

	return {
		subscribe,
		setProject: (project: Project) =>
			update((state) => ({ ...state, project, loading: false })),
		setFiles: (files: ProjectFile[]) =>
			update((state) => ({ ...state, files })),
		setBibliography: (bibliography: Bibliography[]) =>
			update((state) => ({ ...state, bibliography })),
		setActiveFile: (fileId: string | null) =>
			update((state) => ({ ...state, activeFileId: fileId })),
		openFile: (fileId: string) =>
			update((state) => ({
				...state,
				activeFileId: fileId,
				openFileIds: state.openFileIds.includes(fileId)
					? state.openFileIds
					: [...state.openFileIds, fileId]
			})),
		closeFile: (fileId: string) =>
			update((state) => {
				const newOpenIds = state.openFileIds.filter((id) => id !== fileId);
				// If closing the active file, switch to the previous open file or first one
				let newActiveId = state.activeFileId;
				if (state.activeFileId === fileId) {
					const idx = state.openFileIds.indexOf(fileId);
					newActiveId = newOpenIds[Math.max(0, idx - 1)] ?? newOpenIds[0] ?? null;
				}
				return { ...state, openFileIds: newOpenIds, activeFileId: newActiveId };
			}),
		setOpenFileIds: (openFileIds: string[]) =>
			update((state) => ({ ...state, openFileIds })),
		updateFile: (fileId: string, content: string) =>
			update((state) => ({
				...state,
				files: state.files.map((f) =>
					f.id === fileId ? { ...f, content, updated_at: new Date().toISOString() } : f
				)
			})),
		addFile: (file: ProjectFile) =>
			update((state) => ({ ...state, files: [...state.files, file] })),
		removeFile: (fileId: string) =>
			update((state) => ({
				...state,
				files: state.files.filter((f) => f.id !== fileId),
				activeFileId: state.activeFileId === fileId ? null : state.activeFileId
			})),
		addBibEntry: (entry: Bibliography) =>
			update((state) => ({ ...state, bibliography: [...state.bibliography, entry] })),
		removeBibEntry: (entryId: string) =>
			update((state) => ({
				...state,
				bibliography: state.bibliography.filter((b) => b.id !== entryId)
			})),
		setLoading: (loading: boolean) =>
			update((state) => ({ ...state, loading })),
		setSaving: (saving: boolean) =>
			update((state) => ({ ...state, saving })),
		setError: (error: string | null) =>
			update((state) => ({ ...state, error })),
		reset: () => set(initialState)
	};
}

export const projectStore = createProjectStore();

export const activeFile = derived(projectStore, ($project) =>
	$project.files.find((f) => f.id === $project.activeFileId) ?? null
);
