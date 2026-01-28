export const AVAILABLE_MODELS = [
	// Anthropic
	{ id: 'anthropic/claude-sonnet-4.5', name: 'Sonnet 4.5', provider: 'Anthropic' },
	{ id: 'anthropic/claude-opus-4.5', name: 'Opus 4.5', provider: 'Anthropic' },

	// Moonshot (Kimi)
	{ id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', provider: 'Moonshot' },

	// xAI
	{ id: 'x-ai/grok-4-fast', name: 'Grok 4', provider: 'xAI' }
];

export type Model = (typeof AVAILABLE_MODELS)[number];
