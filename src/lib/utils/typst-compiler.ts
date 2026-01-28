/**
 * Client-side Typst compiler using WASM
 * Uses @myriaddreamin/typst.ts for browser-based compilation
 */

// Use 'any' for the $typst instance since TypstSnippet is not exported from the main module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let $typst: any = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

export interface TypstCompileResult {
	pdf?: Uint8Array;
	error?: string;
}

/**
 * Get the WASM module URL from CDN
 */
function getWasmModuleUrl(): string {
	// Use a CDN URL for the WASM module
	// The typst.ts package version 0.7.0-rc2 corresponds to this WASM version
	return 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0-rc2/pkg/typst_ts_web_compiler_bg.wasm';
}

/**
 * Initialize the Typst WASM compiler
 * Must be called before compileTypst()
 */
async function ensureInitialized(): Promise<void> {
	if (initialized) return;

	// Prevent multiple concurrent initializations
	if (initPromise) {
		return initPromise;
	}

	initPromise = (async () => {
		try {
			// Dynamically import to avoid SSR issues
			const typstModule = await import('@myriaddreamin/typst.ts');
			$typst = typstModule.$typst;

			// Set compiler init options to load WASM from CDN
			const wasmUrl = getWasmModuleUrl();
			$typst.setCompilerInitOptions({
				getModule: () => wasmUrl
			});

			initialized = true;
		} catch (error) {
			console.error('Failed to initialize Typst compiler:', error);
			initPromise = null;
			throw new Error(
				`Failed to initialize Typst compiler: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	})();

	return initPromise;
}

/**
 * Compile Typst source code to PDF
 * @param source - The Typst source code
 * @returns The compiled PDF as Uint8Array or an error
 */
export async function compileTypst(source: string): Promise<TypstCompileResult> {
	try {
		await ensureInitialized();

		if (!$typst) {
			return { error: 'Typst compiler not initialized' };
		}

		const pdf = await $typst.pdf({ mainContent: source });

		if (!pdf) {
			return { error: 'Compilation produced no output' };
		}

		return { pdf };
	} catch (error) {
		console.error('Typst compilation error:', error);

		// Extract meaningful error message
		let errorMessage = 'Compilation failed';
		if (error instanceof Error) {
			// Parse typst error messages which may contain line/column info
			errorMessage = error.message;
		} else if (typeof error === 'string') {
			errorMessage = error;
		}

		return { error: errorMessage };
	}
}

/**
 * Reset the Typst compiler state
 * Useful when switching between projects
 */
export async function resetTypstCompiler(): Promise<void> {
	if ($typst) {
		await $typst.resetShadow();
	}
}
