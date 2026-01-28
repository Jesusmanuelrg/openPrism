export interface CompileResult {
	pdf?: ArrayBuffer;
	log: string;
	errors: string[];
}

const COMPILE_TIMEOUT = 60000; // 60 seconds

export async function compileLatex(source: string): Promise<CompileResult> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), COMPILE_TIMEOUT);

		try {
			// Use latex.ytotech.com API (latex-on-http)
			const response = await fetch('https://latex.ytotech.com/builds/sync', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					compiler: 'pdflatex',
					resources: [
						{
							main: true,
							content: source
						}
					]
				}),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			// Check for successful compilation (PDF response)
			const contentType = response.headers.get('content-type') || '';

			if (response.ok && contentType.includes('application/pdf')) {
				const pdf = await response.arrayBuffer();
				return { pdf, log: '', errors: [] };
			}

			// Handle error responses (JSON with logs)
			try {
				const errorData = await response.json();
				const log = errorData.logs || '';
				const errors = parseLatexErrors(log);

				if (errors.length === 0 && log) {
					errors.push('Compilation failed. Check the log for details.');
				} else if (errors.length === 0) {
					errors.push(`Compilation failed with status ${response.status}`);
				}

				return { log, errors };
			} catch {
				// If JSON parsing fails, try to get text
				const errorText = await response.text();
				const errors = parseLatexErrors(errorText);
				return { log: errorText, errors };
			}
		} finally {
			clearTimeout(timeoutId);
		}
	} catch (error) {
		// Handle abort/timeout
		if (error instanceof Error && error.name === 'AbortError') {
			return {
				log: 'Compilation timed out after 60 seconds',
				errors: ['Compilation timed out. Your document may be too complex or contain infinite loops.']
			};
		}

		// Handle network errors
		if (error instanceof TypeError && error.message.includes('fetch')) {
			return {
				log: 'Network error: Unable to reach compilation service',
				errors: ['Unable to connect to the LaTeX compilation service. Please check your internet connection.']
			};
		}

		return {
			log: error instanceof Error ? error.message : 'Unknown error',
			errors: ['Compilation service unavailable. Please try again later.']
		};
	}
}

function parseLatexErrors(log: string): string[] {
	const errors: string[] = [];
	const lines = log.split('\n');

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Look for error patterns
		if (line.startsWith('!') || line.includes('Error:') || line.includes('error:')) {
			let errorMsg = line;

			// Try to get context (line number)
			if (i + 1 < lines.length && lines[i + 1].startsWith('l.')) {
				errorMsg += '\n' + lines[i + 1];
			}

			errors.push(errorMsg.trim());
		}

		// Look for undefined control sequence
		if (line.includes('Undefined control sequence')) {
			errors.push(line.trim());
		}

		// Look for missing file errors
		if (line.includes('File') && line.includes('not found')) {
			errors.push(line.trim());
		}

		// Look for missing package errors
		if (line.includes('Package') && line.includes('not found')) {
			errors.push(line.trim());
		}

		// Look for LaTeX Warning that are actually errors
		if (line.includes('LaTeX Error:')) {
			errors.push(line.trim());
		}
	}

	// If no specific errors found but compilation failed, add generic message
	if (errors.length === 0 && log.includes('!')) {
		errors.push('Compilation failed. Check the log for details.');
	}

	return errors;
}
