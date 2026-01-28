export interface CompileResult {
	pdf?: ArrayBuffer;
	errors: string[];
}

// Note: For MVP, Typst compilation will be handled client-side using typst-ts WASM
// This server-side stub is for potential future server-side compilation

export async function compileTypst(source: string): Promise<CompileResult> {
	// For now, return an error indicating client-side compilation should be used
	// In a future iteration, this could use a Typst server or WASM on the server

	return {
		errors: ['Server-side Typst compilation not yet implemented. Use client-side compilation.']
	};
}

// Client-side compilation will be done in the browser using typst-ts
// See: https://github.com/aspect/typst-ts
