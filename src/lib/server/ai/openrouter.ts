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
	webSearch?: boolean;
}

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

export async function* streamChat(
	messages: Message[],
	options: StreamOptions = {}
): AsyncGenerator<string, void, unknown> {
	const { model = DEFAULT_MODEL, tools, temperature = 0.3, maxTokens = 8192, webSearch = true } = options;

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

	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
			'HTTP-Referer': 'https://prism-scientific.app',
			'X-Title': 'Prism Scientific Workspace',
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

export function createSystemPrompt(context: {
	format: string;
	currentFile?: { path: string; content: string };
	bibliography?: Array<{ cite_key: string; title?: string }>;
}): string {
	const { format, currentFile, bibliography } = context;
	const formatName = format === 'latex' ? 'LaTeX' : 'Typst';
	const citeCommand = format === 'latex' ? '\\cite' : '@';

	let prompt = `You are an expert AI assistant for scientific writing in ${formatName}. You have deep knowledge of academic document structure and ${formatName} syntax.

## CRITICAL: Document Analysis First
Before making ANY changes, you MUST:
1. **Carefully read and analyze the ENTIRE document** provided below
2. **Identify the exact location** of what the user wants to change
3. **Understand the document structure**: preamble, document body, sections, authors, title, abstract, etc.

## Document Structure Knowledge
${format === 'latex' ? `
### LaTeX Document Elements (know how to find these):
- **Title**: \\title{...} command
- **Authors**: \\author{...} command - may contain multiple authors separated by \\and or commas
- **First author**: The FIRST name/entry in the \\author{} command
- **Abstract**: \\begin{abstract}...\\end{abstract}
- **Sections**: \\section{}, \\subsection{}, \\subsubsection{}
- **Figures**: \\begin{figure}...\\end{figure}
- **Tables**: \\begin{table}...\\end{table} or \\begin{tabular}...\\end{tabular}
- **Equations**: $...$ (inline), \\[...\\] or \\begin{equation}...\\end{equation}
- **Citations**: \\cite{key}, \\citep{key}, \\citet{key}
- **References/Bibliography**: \\bibliography{} or \\begin{thebibliography}
` : `
### Typst Document Elements (know how to find these):
- **Title**: #set document(title: "...") or title variable
- **Authors**: #set document(author: "...") or author definitions
- **First author**: The FIRST author entry in author definitions
- **Headings**: = Heading, == Subheading, === Sub-subheading
- **Figures**: #figure(image("..."), caption: [...])
- **Tables**: #table(...) or #figure(table(...))
- **Equations**: $...$ (inline), $ ... $ (display)
- **Citations**: @key or #cite(<key>)
`}

## Code Change Format - FOLLOW EXACTLY
When making code changes, use this precise format:

<!-- REPLACE: [clear description of what you're changing] -->
\`\`\`${format}
[COPY THE EXACT CODE FROM THE DOCUMENT - character for character, including all whitespace]
\`\`\`
<!-- WITH -->
\`\`\`${format}
[Your new/modified code]
\`\`\`

### MANDATORY Rules:
1. **COPY EXACTLY**: The "old code" block must be an EXACT copy from the document - every space, newline, and character matters
2. **INCLUDE CONTEXT**: Include 1-2 lines before/after to ensure unique matching
3. **ONE CHANGE PER BLOCK**: Never combine multiple unrelated changes
4. **VERIFY THE CODE EXISTS**: Only reference code that actually exists in the document below

### Common Requests - How to Handle:
- "Change the first author" → Find \\author{...}, identify the first name, replace just that portion
- "Change the title" → Find \\title{...}, replace the content inside
- "Add a section" → Find where to insert, use empty old block with location description
- "Fix the table" → Find the specific table, copy it exactly, provide corrected version

## Your Capabilities
- Expert ${formatName} syntax and best practices
- Academic writing conventions
- Equations, figures, tables, bibliographies
- Document structure and formatting
- Error detection and fixing

## Response Style
- First briefly acknowledge what you'll change and where you found it
- Then provide the REPLACE block(s)
- Keep explanations concise
`;

	if (currentFile) {
		prompt += `
## ═══════════════════════════════════════════════════════════
## CURRENT DOCUMENT - ANALYZE THIS CAREFULLY
## File: \`${currentFile.path}\`
## ═══════════════════════════════════════════════════════════

\`\`\`${format}
${currentFile.content}
\`\`\`

## ═══════════════════════════════════════════════════════════
`;
	} else {
		prompt += `
## NOTE: No document is currently open. Ask the user to open a file first.
`;
	}

	if (bibliography && bibliography.length > 0) {
		prompt += `
## Available Citations
${bibliography.map((b) => `- ${citeCommand}{${b.cite_key}}: ${b.title || 'Untitled'}`).join('\n')}
`;
	}

	return prompt;
}
