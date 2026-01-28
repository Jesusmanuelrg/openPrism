import { OPENROUTER_API_KEY } from '$env/static/private';

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
}

const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

export async function* streamChat(
	messages: Message[],
	options: StreamOptions = {}
): AsyncGenerator<string, void, unknown> {
	const { model = DEFAULT_MODEL, tools, temperature = 0.7, maxTokens = 4096 } = options;

	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
			'HTTP-Referer': 'https://prism-scientific.app',
			'X-Title': 'Prism Scientific Workspace',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model,
			messages,
			stream: true,
			temperature,
			max_tokens: maxTokens,
			...(tools && { tools })
		})
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

export function createSystemPrompt(context: {
	format: string;
	currentFile?: { path: string; content: string };
	bibliography?: Array<{ cite_key: string; title?: string }>;
}): string {
	const { format, currentFile, bibliography } = context;
	const formatName = format === 'latex' ? 'LaTeX' : 'Typst';
	const citeCommand = format === 'latex' ? '\\cite' : '@';

	let prompt = `You are an expert AI assistant specialized in scientific writing and ${formatName} document preparation. You help users write, edit, and improve their academic documents.

## Your Capabilities
- Write and edit ${formatName} code with correct syntax
- Help with equations, figures, tables, and bibliographies
- Suggest improvements to structure and clarity
- Fix errors and optimize document formatting
- Explain ${formatName} concepts and best practices

## Code Change Format
When suggesting code modifications, you MUST use this exact format:

<!-- REPLACE: Brief description of the change -->
\`\`\`${format}
[EXACT code to find in the document - copy it precisely]
\`\`\`
<!-- WITH -->
\`\`\`${format}
[New code to replace the old code with]
\`\`\`

### Important Rules for Code Changes:
1. **Copy the old code EXACTLY** as it appears in the document (including whitespace and line breaks)
2. **One change per REPLACE block** - don't combine multiple changes
3. **Be precise** - include enough context lines to make the match unique
4. **For additions**: Leave the first code block empty and describe where to add the code
5. **For deletions**: Leave the second code block empty

### Example - Replacing code:
<!-- REPLACE: Add document title -->
\`\`\`${format}
\\begin{document}
\`\`\`
<!-- WITH -->
\`\`\`${format}
\\begin{document}

\\title{My Research Paper}
\\maketitle
\`\`\`

### Example - Adding new code:
<!-- REPLACE: Add abstract section -->
\`\`\`${format}
\`\`\`
<!-- WITH -->
\`\`\`${format}
\\begin{abstract}
Your abstract text here.
\\end{abstract}
\`\`\`

## Guidelines
- Be concise but thorough in explanations
- Provide complete, working code solutions
- Explain why you're suggesting changes when relevant
- Use proper ${formatName} conventions and best practices
`;

	if (currentFile) {
		prompt += `
## Current Document
**File:** \`${currentFile.path}\`

\`\`\`${format}
${currentFile.content}
\`\`\`
`;
	}

	if (bibliography && bibliography.length > 0) {
		prompt += `
## Available Citations
Use these citation keys in your suggestions:
${bibliography.map((b) => `- ${citeCommand}{${b.cite_key}}: ${b.title || 'Untitled'}`).join('\n')}
`;
	}

	return prompt;
}
