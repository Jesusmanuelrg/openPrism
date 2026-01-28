import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { compileLatex } from '$lib/server/compile/latex';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { source, format } = await request.json();

		if (!source) {
			return json({ error: 'No source provided' }, { status: 400 });
		}

		if (format === 'typst') {
			// Typst compilation is handled client-side for MVP
			return json(
				{ error: 'Typst compilation should be handled client-side using typst-ts WASM' },
				{ status: 400 }
			);
		}

		// Default to LaTeX compilation
		const result = await compileLatex(source);

		if (result.pdf) {
			return new Response(result.pdf, {
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': 'inline; filename="document.pdf"',
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Pragma': 'no-cache',
					'Expires': '0'
				}
			});
		}

		// Return errors
		return json(
			{
				error: result.errors.length > 0 ? result.errors.join('\n') : 'Compilation failed',
				log: result.log
			},
			{ status: 422 }
		);
	} catch (error) {
		console.error('Compilation error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Compilation failed' },
			{ status: 500 }
		);
	}
};
