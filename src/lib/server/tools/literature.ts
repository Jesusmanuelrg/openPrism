export interface Paper {
	paperId: string;
	title: string;
	abstract?: string;
	authors: Array<{ name: string; authorId?: string }>;
	year?: number;
	citationCount?: number;
	doi?: string;
	url?: string;
	venue?: string;
}

export interface SearchResult {
	papers: Paper[];
	total: number;
	offset: number;
}

interface SemanticScholarPaper {
	paperId: string;
	title: string;
	abstract?: string;
	authors?: Array<{ name: string; authorId?: string }>;
	year?: number;
	citationCount?: number;
	externalIds?: { DOI?: string };
	url?: string;
	venue?: string;
}

interface SemanticScholarResponse {
	data?: SemanticScholarPaper[];
	total?: number;
	offset?: number;
}

interface CrossRefAuthor {
	given?: string;
	family?: string;
}

interface CrossRefWork {
	title?: string[];
	author?: CrossRefAuthor[];
	published?: { 'date-parts'?: number[][] };
	'container-title'?: string[];
}

export async function searchSemanticScholar(
	query: string,
	limit: number = 10,
	offset: number = 0
): Promise<SearchResult> {
	const fields = [
		'paperId',
		'title',
		'abstract',
		'authors',
		'year',
		'citationCount',
		'externalIds',
		'url',
		'venue'
	].join(',');

	const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
	url.searchParams.set('query', query);
	url.searchParams.set('fields', fields);
	url.searchParams.set('limit', limit.toString());
	url.searchParams.set('offset', offset.toString());

	const response = await fetch(url.toString(), {
		headers: {
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Semantic Scholar API error: ${response.status}`);
	}

	const data: SemanticScholarResponse = await response.json();

	return {
		papers: (data.data || []).map((paper) => ({
			paperId: paper.paperId,
			title: paper.title,
			abstract: paper.abstract,
			authors: paper.authors || [],
			year: paper.year,
			citationCount: paper.citationCount,
			doi: paper.externalIds?.DOI,
			url: paper.url,
			venue: paper.venue
		})),
		total: data.total || 0,
		offset: data.offset || 0
	};
}

export async function searchArxiv(query: string, maxResults: number = 10): Promise<Paper[]> {
	const url = new URL('http://export.arxiv.org/api/query');
	url.searchParams.set('search_query', `all:${query}`);
	url.searchParams.set('start', '0');
	url.searchParams.set('max_results', maxResults.toString());
	url.searchParams.set('sortBy', 'relevance');

	const response = await fetch(url.toString());

	if (!response.ok) {
		throw new Error(`arXiv API error: ${response.status}`);
	}

	const xml = await response.text();

	// Parse Atom XML
	const papers: Paper[] = [];
	const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
	let match;

	while ((match = entryRegex.exec(xml)) !== null) {
		const entry = match[1];

		const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim();
		const abstract = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim();
		const arxivId = entry.match(/<id>http:\/\/arxiv\.org\/abs\/([\s\S]*?)<\/id>/)?.[1];
		const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1];

		// Extract authors
		const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>/g;
		const authors: Array<{ name: string }> = [];
		let authorMatch;
		while ((authorMatch = authorRegex.exec(entry)) !== null) {
			authors.push({ name: authorMatch[1].trim() });
		}

		// Extract DOI if available
		const doiMatch = entry.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/);
		const doi = doiMatch?.[1]?.trim();

		papers.push({
			paperId: arxivId || '',
			title: title || '',
			abstract,
			authors,
			year: published ? new Date(published).getFullYear() : undefined,
			doi,
			url: arxivId ? `https://arxiv.org/abs/${arxivId}` : undefined
		});
	}

	return papers;
}

export async function getPaperByDoi(doi: string): Promise<Paper | null> {
	// Try Semantic Scholar first
	try {
		const fields = [
			'paperId',
			'title',
			'abstract',
			'authors',
			'year',
			'citationCount',
			'externalIds',
			'url',
			'venue'
		].join(',');

		const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=${fields}`;

		const response = await fetch(url);
		if (response.ok) {
			const paper = await response.json();
			return {
				paperId: paper.paperId,
				title: paper.title,
				abstract: paper.abstract,
				authors: paper.authors || [],
				year: paper.year,
				citationCount: paper.citationCount,
				doi: paper.externalIds?.DOI || doi,
				url: paper.url,
				venue: paper.venue
			};
		}
	} catch (error) {
		console.warn('Semantic Scholar lookup failed:', error);
	}

	// Try CrossRef
	try {
		const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
		const response = await fetch(url);

		if (response.ok) {
			const data = await response.json();
			const work: CrossRefWork = data.message;

			return {
				paperId: doi,
				title: work.title?.[0] || '',
				authors:
					work.author?.map((a) => ({
						name: `${a.given || ''} ${a.family || ''}`.trim()
					})) || [],
				year: work.published?.['date-parts']?.[0]?.[0],
				doi,
				venue: work['container-title']?.[0]
			};
		}
	} catch (error) {
		console.warn('CrossRef lookup failed:', error);
	}

	return null;
}
