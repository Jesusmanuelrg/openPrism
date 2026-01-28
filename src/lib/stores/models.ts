export const AVAILABLE_MODELS = [
	// Anthropic
	{ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
	{ id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic' },

	// OpenAI
	{ id: 'openai/gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI' },

	// Moonshot (Kimi)
	{ id: 'moonshotai/kimi-k2', name: 'Kimi K2.5', provider: 'Moonshot' },

	// xAI
	{ id: 'x-ai/grok-3', name: 'Grok 3', provider: 'xAI' }
];

export type Model = (typeof AVAILABLE_MODELS)[number];
