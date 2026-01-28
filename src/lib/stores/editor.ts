import { writable } from 'svelte/store';

export interface EditorState {
	content: string;
	cursorPosition: { line: number; col: number };
	selection: { from: number; to: number } | null;
	isDirty: boolean;
	lastSaved: Date | null;
}

const initialState: EditorState = {
	content: '',
	cursorPosition: { line: 1, col: 1 },
	selection: null,
	isDirty: false,
	lastSaved: null
};

function createEditorStore() {
	const { subscribe, set, update } = writable<EditorState>(initialState);

	return {
		subscribe,
		setContent: (content: string) =>
			update((state) => ({ ...state, content, isDirty: true })),
		setCursorPosition: (line: number, col: number) =>
			update((state) => ({ ...state, cursorPosition: { line, col } })),
		setSelection: (selection: { from: number; to: number } | null) =>
			update((state) => ({ ...state, selection })),
		markSaved: () =>
			update((state) => ({ ...state, isDirty: false, lastSaved: new Date() })),
		reset: () => set(initialState)
	};
}

export const editorStore = createEditorStore();
