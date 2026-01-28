import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { supabase } = locals;

	// Load project
	const { data: project, error: projectError } = await supabase
		.from('projects')
		.select('*')
		.eq('id', params.projectId)
		.single();

	if (projectError || !project) {
		throw error(404, 'Project not found');
	}

	// Load files
	const { data: files } = await supabase
		.from('project_files')
		.select('*')
		.eq('project_id', params.projectId)
		.order('path');

	// Load bibliography
	const { data: bibliography } = await supabase
		.from('bibliography')
		.select('*')
		.eq('project_id', params.projectId)
		.order('cite_key');

	// Load or create conversation (avoid .single() which throws on 0 or multiple rows)
	const { data: conversations } = await supabase
		.from('conversations')
		.select('*')
		.eq('project_id', params.projectId)
		.order('created_at', { ascending: false })
		.limit(1);

	let conversation = conversations?.[0] ?? null;

	if (!conversation) {
		const { data: newConversation } = await supabase
			.from('conversations')
			.insert({ project_id: params.projectId, messages: [] } as any)
			.select()
			.maybeSingle();
		conversation = newConversation;
	}

	return {
		project,
		files: files ?? [],
		bibliography: bibliography ?? [],
		conversation
	};
};
