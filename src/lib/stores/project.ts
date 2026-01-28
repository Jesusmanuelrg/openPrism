import { writable, derived } from 'svelte/store';
import type { Project, ProjectFile, Bibliography } from '$lib/utils/database.types';

export interface ProjectState {
	project: Project | null;
	files: ProjectFile[];
	bibliography: Bibliography[];
	activeFileId: string | null;
	loading: boolean;
	saving: boolean;
	error: string | null;
}

const initialState: ProjectState = {
	project: null,
	files: [],
	bibliography: [],
	activeFileId: null,
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
