import type { Paper } from './literature';

export interface BibTeXEntry {
	citeKey: string;
	type: string;
	fields: Record<string, string>;
	raw: string;
}

export function generateCiteKey(paper: Paper): string {
	const firstAuthor = paper.authors[0]?.name.split(' ').pop()?.toLowerCase() || 'unknown';
	const year = paper.year || 'nodate';
	const titleWord = paper.title.split(' ').find((w) => w.length > 3)?.toLowerCase() || 'paper';

	return `${firstAuthor}${year}${titleWord}`.replace(/[^a-z0-9]/g, '');
}

export function paperToBibTeX(paper: Paper, citeKey?: string): BibTeXEntry {
	const key = citeKey || generateCiteKey(paper);

	const authors = paper.authors.map((a) => a.name).join(' and ');

	const fields: Record<string, string> = {
		title: `{${paper.title}}`,
		author: `{${authors}}`
	};

	if (paper.year) {
		fields.year = paper.year.toString();
	}

	if (paper.doi) {
		fields.doi = paper.doi;
	}

	if (paper.venue) {
		fields.journal = `{${paper.venue}}`;
	}

	if (paper.url) {
		fields.url = paper.url;
	}

	// Determine entry type
	let type = 'article';
	if (paper.venue?.toLowerCase().includes('conference') || paper.venue?.toLowerCase().includes('proceedings')) {
		type = 'inproceedings';
	} else if (paper.url?.includes('arxiv')) {
		type = 'misc';
		fields.eprint = paper.paperId;
		fields.archiveprefix = 'arXiv';
	}

	// Generate raw BibTeX
	const fieldLines = Object.entries(fields)
		.map(([k, v]) => `  ${k} = ${v}`)
		.join(',\n');

	const raw = `@${type}{${key},\n${fieldLines}\n}`;

	return {
		citeKey: key,
		type,
		fields,
		raw
	};
}

export function doiToBibTeX(doi: string): Promise<string | null> {
	return fetch(`https://doi.org/${doi}`, {
		headers: {
			Accept: 'application/x-bibtex'
		},
		redirect: 'follow'
	})
		.then((res) => {
			if (!res.ok) return null;
			return res.text();
		})
		.catch(() => null);
}

export function parseBibTeX(bibtex: string): BibTeXEntry | null {
	const match = bibtex.match(/@(\w+)\s*\{\s*([^,]+),\s*([\s\S]*)\}/);
	if (!match) return null;

	const [, type, citeKey, body] = match;
	const fields: Record<string, string> = {};

	// Parse fields
	const fieldRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|(\d+))/g;
	let fieldMatch;
	while ((fieldMatch = fieldRegex.exec(body)) !== null) {
		const key = fieldMatch[1].toLowerCase();
		const value = fieldMatch[2] || fieldMatch[3] || fieldMatch[4];
		if (value) {
			fields[key] = value;
		}
	}

	return {
		citeKey,
		type: type.toLowerCase(),
		fields,
		raw: bibtex
	};
}
