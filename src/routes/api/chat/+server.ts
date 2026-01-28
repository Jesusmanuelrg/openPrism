import type { RequestHandler } from './$types';
import { streamChat, createSystemPrompt, type Message } from '$lib/server/ai';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { projectId, message, model, context } = await request.json();

		if (!message) {
			return new Response(JSON.stringify({ error: 'No message provided' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Get project context from database
		const { supabase } = locals;
		const { data: project } = await supabase
			.from('projects')
			.select('format')
			.eq('id', projectId)
			.single();

		const { data: bibliography } = await supabase
			.from('bibliography')
			.select('cite_key, metadata')
			.eq('project_id', projectId);

		// Build messages array
		const systemPrompt = createSystemPrompt({
			format: project?.format || 'latex',
			currentFile: context?.currentFile,
			bibliography: bibliography?.map((b) => ({
				cite_key: b.cite_key,
				title: (b.metadata as { title?: string })?.title
			}))
		});

		const messages: Message[] = [
			{ role: 'system', content: systemPrompt },
			...(context?.history || []),
			{ role: 'user', content: message }
		];

		// Create SSE response
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of streamChat(messages, { model })) {
						// Send as SSE format
						const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
						controller.enqueue(encoder.encode(data));
					}
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
					);
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		console.error('Chat API error:', error);
		return new Response(
			JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
