import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { AVAILABLE_MODELS } from './models';

export interface LayoutSettings {
	filesDisplay: 'dropdown' | 'sidebar';
	chatPosition: 'bottom' | 'side';
	panelWidth: number; // 0-100 percentage for left panel
	chatFullscreen: boolean; // Full-screen chat mode
}

export interface EditorSettings {
	lightMode: boolean;           // Toggle light/dark theme
	vimMode: boolean;             // Enable vim keybindings
	realtimeCompilation: boolean; // Compile as you type (debounced 2s)
	autoFormatting: boolean;      // Auto-format LaTeX commands
	wordWrap: boolean;            // Enable line wrapping
	stickyScroll: boolean;        // Keep parent structures visible
	inlineDiffs: boolean;         // Show inline diff previews for AI suggestions
	selectionPopover: boolean;    // Show "Ask about selection" popover on text selection
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
	panelWidth: 50,
	chatFullscreen: false
};

const defaultEditorSettings: EditorSettings = {
	lightMode: false,
	vimMode: false,
	realtimeCompilation: false,
	autoFormatting: false,
	wordWrap: true,
	stickyScroll: true,
	inlineDiffs: true,
	selectionPopover: true
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

	const setEditorSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) =>
		update((s) => ({ ...s, editor: { ...s.editor, [key]: value } }));

	const toggleEditorSetting = (key: keyof EditorSettings) =>
		update((s) => ({ ...s, editor: { ...s.editor, [key]: !s.editor[key] } }));

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
		setChatFullscreen: (chatFullscreen: boolean) =>
			update((s) => ({ ...s, layout: { ...s.layout, chatFullscreen } })),
		toggleChatFullscreen: () =>
			update((s) => ({ ...s, layout: { ...s.layout, chatFullscreen: !s.layout.chatFullscreen } })),
		// Editor settings
		setLightMode: (v: boolean) => setEditorSetting('lightMode', v),
		setVimMode: (v: boolean) => setEditorSetting('vimMode', v),
		setRealtimeCompilation: (v: boolean) => setEditorSetting('realtimeCompilation', v),
		setAutoFormatting: (v: boolean) => setEditorSetting('autoFormatting', v),
		setWordWrap: (v: boolean) => setEditorSetting('wordWrap', v),
		setStickyScroll: (v: boolean) => setEditorSetting('stickyScroll', v),
		setInlineDiffs: (v: boolean) => setEditorSetting('inlineDiffs', v),
		setSelectionPopover: (v: boolean) => setEditorSetting('selectionPopover', v),
		toggleLightMode: () => toggleEditorSetting('lightMode'),
		toggleVimMode: () => toggleEditorSetting('vimMode'),
		toggleRealtimeCompilation: () => toggleEditorSetting('realtimeCompilation'),
		toggleAutoFormatting: () => toggleEditorSetting('autoFormatting'),
		toggleWordWrap: () => toggleEditorSetting('wordWrap'),
		toggleStickyScroll: () => toggleEditorSetting('stickyScroll'),
		toggleInlineDiffs: () => toggleEditorSetting('inlineDiffs'),
		toggleSelectionPopover: () => toggleEditorSetting('selectionPopover'),
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
