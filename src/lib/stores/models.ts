export const AVAILABLE_MODELS = [
	// Anthropic
	{ id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
	{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
	{ id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },

	// OpenAI
	{ id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
	{ id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
	{ id: 'openai/o1', name: 'o1', provider: 'OpenAI' },
	{ id: 'openai/o1-mini', name: 'o1 Mini', provider: 'OpenAI' },

	// Google
	{ id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google' },
	{ id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },

	// Chinese Models
	{ id: 'moonshot/moonshot-v1-128k', name: 'Kimi (Moonshot)', provider: 'Moonshot' },
	{ id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
	{ id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Alibaba' },

	// Meta & Others
	{ id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta' },
	{ id: 'mistralai/mistral-large', name: 'Mistral Large', provider: 'Mistral' }
];

export type Model = (typeof AVAILABLE_MODELS)[number];
