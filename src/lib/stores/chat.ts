import { writable } from 'svelte/store';

export { AVAILABLE_MODELS, type Model } from './models';

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: Date;
	isStreaming?: boolean;
}

export interface ChatState {
	messages: ChatMessage[];
	isLoading: boolean;
	selectedModel: string;
	error: string | null;
}

const initialState: ChatState = {
	messages: [],
	isLoading: false,
	selectedModel: 'anthropic/claude-3.5-sonnet',
	error: null
};

function createChatStore() {
	const { subscribe, set, update } = writable<ChatState>(initialState);

	return {
		subscribe,
		addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) =>
			update((state) => ({
				...state,
				messages: [
					...state.messages,
					{
						...message,
						id: crypto.randomUUID(),
						timestamp: new Date()
					}
				]
			})),
		updateLastMessage: (content: string) =>
			update((state) => {
				const messages = [...state.messages];
				if (messages.length > 0) {
					messages[messages.length - 1] = {
						...messages[messages.length - 1],
						content,
						isStreaming: true
					};
				}
				return { ...state, messages };
			}),
		finishStreaming: () =>
			update((state) => {
				const messages = [...state.messages];
				if (messages.length > 0) {
					messages[messages.length - 1] = {
						...messages[messages.length - 1],
						isStreaming: false
					};
				}
				return { ...state, messages };
			}),
		setLoading: (isLoading: boolean) =>
			update((state) => ({ ...state, isLoading })),
		setModel: (selectedModel: string) =>
			update((state) => ({ ...state, selectedModel })),
		setError: (error: string | null) =>
			update((state) => ({ ...state, error })),
		clearMessages: () =>
			update((state) => ({ ...state, messages: [] })),
		reset: () => set(initialState)
	};
}

export const chatStore = createChatStore();
