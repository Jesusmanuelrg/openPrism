import { StreamLanguage, type StringStream } from '@codemirror/language';

interface LatexState {
	inMath: boolean;
	inEnvironment: boolean;
	environmentName: string;
}

const latexMode = {
	startState: function (): LatexState {
		return {
			inMath: false,
			inEnvironment: false,
			environmentName: ''
		};
	},
	token: function (stream: StringStream, state: LatexState): string | null {
		// Handle comments
		if (stream.match('%')) {
			stream.skipToEnd();
			return 'comment';
		}

		// Handle math mode
		if (stream.match('$$') || stream.match('\\[') || stream.match('\\]')) {
			state.inMath = !state.inMath;
			return 'keyword';
		}

		if (stream.match('$')) {
			state.inMath = !state.inMath;
			return 'keyword';
		}

		// Handle commands
		if (stream.match(/\\[a-zA-Z@]+\*?/)) {
			const cmd = stream.current();

			// Document structure commands
			if (/\\(documentclass|usepackage|begin|end|section|subsection|subsubsection|chapter|part|paragraph|title|author|date|maketitle)/.test(cmd)) {
				return 'keyword';
			}

			// Text formatting
			if (/\\(textbf|textit|texttt|emph|underline|footnote|cite|ref|label)/.test(cmd)) {
				return 'builtin';
			}

			// Math commands
			if (/\\(frac|sqrt|sum|int|prod|lim|infty|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|partial|nabla|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|subset|supset|in|notin|forall|exists)/.test(cmd)) {
				return 'atom';
			}

			return 'variableName';
		}

		// Handle braces
		if (stream.match(/[{}]/)) {
			return 'bracket';
		}

		// Handle brackets
		if (stream.match(/[\[\]]/)) {
			return 'bracket';
		}

		// In math mode, highlight numbers differently
		if (state.inMath && stream.match(/\d+(\.\d+)?/)) {
			return 'number';
		}

		// Handle special characters
		if (stream.match(/[&_^]/)) {
			return 'operator';
		}

		// Skip whitespace
		if (stream.match(/\s+/)) {
			return null;
		}

		// Advance one character
		stream.next();
		return state.inMath ? 'string' : null;
	}
};

export function createLatexLanguage() {
	return StreamLanguage.define(latexMode);
}
