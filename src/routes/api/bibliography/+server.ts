import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPaperByDoi, paperToBibTeX, doiToBibTeX, parseBibTeX } from '$lib/server/tools';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase } = locals;

	try {
		const { projectId, doi, bibtex } = await request.json();

		if (!projectId) {
			return json({ error: 'Project ID is required' }, { status: 400 });
		}

		let citeKey: string;
		let metadata: Record<string, any>;
		let rawBibtex: string | null = null;

		if (doi) {
			// Fetch paper metadata by DOI
			const paper = await getPaperByDoi(doi);
			if (!paper) {
				return json({ error: 'Could not find paper with this DOI' }, { status: 404 });
			}

			// Generate BibTeX
			const bibEntry = paperToBibTeX(paper);
			citeKey = bibEntry.citeKey;
			metadata = {
				title: paper.title,
				authors: paper.authors,
				year: paper.year,
				venue: paper.venue,
				doi: paper.doi,
				url: paper.url
			};
			rawBibtex = bibEntry.raw;

			// Try to get official BibTeX from doi.org
			const officialBibtex = await doiToBibTeX(doi);
			if (officialBibtex) {
				rawBibtex = officialBibtex;
				const parsed = parseBibTeX(officialBibtex);
				if (parsed) {
					citeKey = parsed.citeKey;
				}
			}
		} else if (bibtex) {
			// Parse provided BibTeX
			const parsed = parseBibTeX(bibtex);
			if (!parsed) {
				return json({ error: 'Invalid BibTeX format' }, { status: 400 });
			}

			citeKey = parsed.citeKey;
			metadata = {
				title: parsed.fields.title,
				authors: parsed.fields.author
					?.split(' and ')
					.map((name: string) => ({ name: name.trim() })),
				year: parsed.fields.year ? parseInt(parsed.fields.year) : undefined,
				venue: parsed.fields.journal || parsed.fields.booktitle,
				doi: parsed.fields.doi,
				url: parsed.fields.url
			};
			rawBibtex = bibtex;
		} else {
			return json({ error: 'Either DOI or BibTeX is required' }, { status: 400 });
		}

		// Check if cite key already exists
		const { data: existing } = await supabase
			.from('bibliography')
			.select('id')
			.eq('project_id', projectId)
			.eq('cite_key', citeKey)
			.single();

		if (existing) {
			return json({ error: `Citation key "${citeKey}" already exists` }, { status: 409 });
		}

		// Insert bibliography entry
		const { data: entry, error } = await supabase
			.from('bibliography')
			.insert({
				project_id: projectId,
				cite_key: citeKey,
				doi: doi || metadata.doi,
				metadata,
				raw_bibtex: rawBibtex
			} as any)
			.select()
			.single();

		if (error) {
			throw error;
		}

		return json(entry);
	} catch (error) {
		console.error('Bibliography error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to add bibliography entry' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	const { supabase } = locals;
	const id = url.searchParams.get('id');

	if (!id) {
		return json({ error: 'Entry ID is required' }, { status: 400 });
	}

	const { error } = await supabase.from('bibliography').delete().eq('id', id);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true });
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const { supabase } = locals;
	const projectId = url.searchParams.get('projectId');
	const format = url.searchParams.get('format') || 'json';

	if (!projectId) {
		return json({ error: 'Project ID is required' }, { status: 400 });
	}

	const { data: entries, error } = await supabase
		.from('bibliography')
		.select('*')
		.eq('project_id', projectId)
		.order('cite_key');

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	if (format === 'bibtex') {
		// Return as BibTeX file
		const bibtex = entries
			.map((e) => e.raw_bibtex)
			.filter(Boolean)
			.join('\n\n');

		return new Response(bibtex, {
			headers: {
				'Content-Type': 'application/x-bibtex',
				'Content-Disposition': 'attachment; filename="bibliography.bib"'
			}
		});
	}

	return json(entries);
};
