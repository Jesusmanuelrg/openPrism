import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchSemanticScholar, searchArxiv } from '$lib/server/tools';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	const source = url.searchParams.get('source') || 'semantic-scholar';
	const limit = parseInt(url.searchParams.get('limit') || '10');

	if (!query) {
		return json({ error: 'Query parameter "q" is required' }, { status: 400 });
	}

	try {
		if (source === 'arxiv') {
			const papers = await searchArxiv(query, limit);
			return json({ papers, total: papers.length });
		}

		// Default to Semantic Scholar
		const result = await searchSemanticScholar(query, limit);
		return json(result);
	} catch (error) {
		console.error('Search error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Search failed' },
			{ status: 500 }
		);
	}
};
