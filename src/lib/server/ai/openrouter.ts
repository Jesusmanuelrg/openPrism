import { OPENROUTER_API_KEY } from '$env/static/private';
import {
	OPENROUTER_ENDPOINT,
	OPENROUTER_REFERER,
	OPENROUTER_TITLE,
	DEFAULT_AI_MODEL
} from '$lib/config';

export interface Message {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

export interface Tool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

export interface StreamOptions {
	model?: string;
	tools?: Tool[];
	temperature?: number;
	maxTokens?: number;
	webSearch?: boolean;
}

export async function* streamChat(
	messages: Message[],
	options: StreamOptions = {}
): AsyncGenerator<string, void, unknown> {
	const { model = DEFAULT_AI_MODEL, tools, temperature = 0.3, maxTokens = 8192, webSearch = true } = options;

	// Build request body
	const requestBody: Record<string, unknown> = {
		model,
		messages,
		stream: true,
		temperature,
		max_tokens: maxTokens
	};

	// Add tools if provided
	if (tools) {
		requestBody.tools = tools;
	}

	// Enable web search plugin for supported models
	if (webSearch) {
		requestBody.plugins = [{ id: 'web' }];
	}

	const response = await fetch(OPENROUTER_ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
			'HTTP-Referer': OPENROUTER_REFERER,
			'X-Title': OPENROUTER_TITLE,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(requestBody)
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('No response body');
	}

	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// Process complete SSE messages
			const lines = buffer.split('\n');
			buffer = lines.pop() || ''; // Keep incomplete line in buffer

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);
					if (data === '[DONE]') {
						return;
					}

					try {
						const parsed = JSON.parse(data);
						const content = parsed.choices?.[0]?.delta?.content;
						if (content) {
							yield content;
						}
					} catch {
						// Ignore parsing errors for incomplete chunks
					}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

export async function chat(messages: Message[], options: StreamOptions = {}): Promise<string> {
	let result = '';
	for await (const chunk of streamChat(messages, options)) {
		result += chunk;
	}
	return result;
}

export { createSystemPrompt } from './prompts';
