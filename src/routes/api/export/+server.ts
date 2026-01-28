import type { RequestHandler } from './$types';
import JSZip from 'jszip';

export const GET: RequestHandler = async ({ url, locals }) => {
	const { supabase } = locals;
	const projectId = url.searchParams.get('projectId');

	if (!projectId) {
		return new Response(JSON.stringify({ error: 'Project ID is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// Get project details
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('title')
			.eq('id', projectId)
			.single();

		if (projectError || !project) {
			return new Response(JSON.stringify({ error: 'Project not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Get all project files
		const { data: files, error: filesError } = await supabase
			.from('project_files')
			.select('path, content')
			.eq('project_id', projectId);

		if (filesError) {
			throw filesError;
		}

		// Get bibliography
		const { data: bibliography } = await supabase
			.from('bibliography')
			.select('raw_bibtex')
			.eq('project_id', projectId);

		// Create ZIP
		const zip = new JSZip();

		// Add all project files
		for (const file of files || []) {
			zip.file(file.path, file.content || '');
		}

		// Add bibliography.bib if there are entries
		if (bibliography && bibliography.length > 0) {
			const bibtexContent = bibliography
				.map((b: { raw_bibtex: string | null }) => b.raw_bibtex)
				.filter(Boolean)
				.join('\n\n');
			if (bibtexContent) {
				zip.file('bibliography.bib', bibtexContent);
			}
		}

		// Generate ZIP blob
		const zipBlob = await zip.generateAsync({ type: 'uint8array' });

		// Create safe filename
		const safeTitle = project.title
			.replace(/[^a-z0-9]/gi, '_')
			.replace(/_+/g, '_')
			.substring(0, 50);

		return new Response(zipBlob, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="${safeTitle}.zip"`
			}
		});
	} catch (error) {
		console.error('Export error:', error);
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : 'Export failed' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
