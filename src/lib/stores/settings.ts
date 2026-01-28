import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { AVAILABLE_MODELS } from './models';

export interface LayoutSettings {
	filesDisplay: 'dropdown' | 'sidebar';
	chatPosition: 'bottom' | 'side';
	panelWidth: number; // 0-100 percentage for left panel
}

export interface EditorSettings {
	lightMode: boolean;           // Toggle light/dark theme
	vimMode: boolean;             // Enable vim keybindings
	realtimeCompilation: boolean; // Compile as you type (debounced 2s)
	autoFormatting: boolean;      // Auto-format LaTeX commands
	wordWrap: boolean;            // Enable line wrapping
	stickyScroll: boolean;        // Keep parent structures visible
}

export interface ModelSettings {
	enabledModels: string[];  // Array of enabled model IDs
}

export interface AppSettings {
	layout: LayoutSettings;
	editor: EditorSettings;
	models: ModelSettings;
}

const LAYOUT_STORAGE_KEY = 'prism-layout-settings';
const EDITOR_STORAGE_KEY = 'prism-editor-settings';
const MODEL_STORAGE_KEY = 'prism-model-settings';

const defaultLayoutSettings: LayoutSettings = {
	filesDisplay: 'dropdown',
	chatPosition: 'bottom',
	panelWidth: 50
};

const defaultEditorSettings: EditorSettings = {
	lightMode: false,
	vimMode: false,
	realtimeCompilation: false,
	autoFormatting: false,
	wordWrap: true,
	stickyScroll: true
};

const defaultModelSettings: ModelSettings = {
	enabledModels: AVAILABLE_MODELS.map(m => m.id)
};

function loadLayoutSettings(): LayoutSettings {
	if (!browser) return defaultLayoutSettings;

	try {
		const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
		if (stored) {
			return { ...defaultLayoutSettings, ...JSON.parse(stored) };
		}
	} catch {
		// Ignore parse errors
	}
	return defaultLayoutSettings;
}

function loadEditorSettings(): EditorSettings {
	if (!browser) return defaultEditorSettings;

	try {
		const stored = localStorage.getItem(EDITOR_STORAGE_KEY);
		if (stored) {
			return { ...defaultEditorSettings, ...JSON.parse(stored) };
		}
	} catch {
		// Ignore parse errors
	}
	return defaultEditorSettings;
}

function loadModelSettings(): ModelSettings {
	if (!browser) return defaultModelSettings;

	try {
		const stored = localStorage.getItem(MODEL_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Ensure any new models are included by default
			const allModelIds = AVAILABLE_MODELS.map(m => m.id);
			const enabledModels = parsed.enabledModels?.filter((id: string) => allModelIds.includes(id)) || [];
			// Add any new models that weren't in the stored settings
			const newModels = allModelIds.filter(id => !parsed.enabledModels?.includes(id));
			return { enabledModels: [...enabledModels, ...newModels] };
		}
	} catch {
		// Ignore parse errors
	}
	return defaultModelSettings;
}

function createSettingsStore() {
	const initialState: AppSettings = {
		layout: loadLayoutSettings(),
		editor: loadEditorSettings(),
		models: loadModelSettings()
	};

	const { subscribe, set, update } = writable<AppSettings>(initialState);

	// Persist to localStorage on changes
	if (browser) {
		subscribe((settings) => {
			localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(settings.layout));
			localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(settings.editor));
			localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(settings.models));
		});
	}

	return {
		subscribe,
		// Layout settings
		setFilesDisplay: (filesDisplay: LayoutSettings['filesDisplay']) =>
			update((s) => ({ ...s, layout: { ...s.layout, filesDisplay } })),
		setChatPosition: (chatPosition: LayoutSettings['chatPosition']) =>
			update((s) => ({ ...s, layout: { ...s.layout, chatPosition } })),
		setPanelWidth: (panelWidth: number) =>
			update((s) => ({ ...s, layout: { ...s.layout, panelWidth: Math.min(80, Math.max(20, panelWidth)) } })),
		resetPanelWidth: () =>
			update((s) => ({ ...s, layout: { ...s.layout, panelWidth: 50 } })),
		// Editor settings
		setLightMode: (lightMode: boolean) =>
			update((s) => ({ ...s, editor: { ...s.editor, lightMode } })),
		setVimMode: (vimMode: boolean) =>
			update((s) => ({ ...s, editor: { ...s.editor, vimMode } })),
		setRealtimeCompilation: (realtimeCompilation: boolean) =>
			update((s) => ({ ...s, editor: { ...s.editor, realtimeCompilation } })),
		setAutoFormatting: (autoFormatting: boolean) =>
			update((s) => ({ ...s, editor: { ...s.editor, autoFormatting } })),
		setWordWrap: (wordWrap: boolean) =>
			update((s) => ({ ...s, editor: { ...s.editor, wordWrap } })),
		setStickyScroll: (stickyScroll: boolean) =>
			update((s) => ({ ...s, editor: { ...s.editor, stickyScroll } })),
		toggleLightMode: () =>
			update((s) => ({ ...s, editor: { ...s.editor, lightMode: !s.editor.lightMode } })),
		toggleVimMode: () =>
			update((s) => ({ ...s, editor: { ...s.editor, vimMode: !s.editor.vimMode } })),
		toggleRealtimeCompilation: () =>
			update((s) => ({ ...s, editor: { ...s.editor, realtimeCompilation: !s.editor.realtimeCompilation } })),
		toggleAutoFormatting: () =>
			update((s) => ({ ...s, editor: { ...s.editor, autoFormatting: !s.editor.autoFormatting } })),
		toggleWordWrap: () =>
			update((s) => ({ ...s, editor: { ...s.editor, wordWrap: !s.editor.wordWrap } })),
		toggleStickyScroll: () =>
			update((s) => ({ ...s, editor: { ...s.editor, stickyScroll: !s.editor.stickyScroll } })),
		// Model settings
		toggleModel: (modelId: string) =>
			update((s) => {
				const enabledModels = s.models.enabledModels.includes(modelId)
					? s.models.enabledModels.filter(id => id !== modelId)
					: [...s.models.enabledModels, modelId];
				return { ...s, models: { ...s.models, enabledModels } };
			}),
		isModelEnabled: (modelId: string) => {
			const state = get({ subscribe });
			return state.models.enabledModels.includes(modelId);
		},
		getEnabledModels: () => {
			const state = get({ subscribe });
			return AVAILABLE_MODELS.filter(m => state.models.enabledModels.includes(m.id));
		},
		enableAllModels: () =>
			update((s) => ({ ...s, models: { enabledModels: AVAILABLE_MODELS.map(m => m.id) } })),
		disableAllModels: () =>
			update((s) => ({ ...s, models: { enabledModels: [] } })),
		// Reset
		reset: () => set({ layout: defaultLayoutSettings, editor: defaultEditorSettings, models: defaultModelSettings })
	};
}

export const settingsStore = createSettingsStore();
