import type { Tool } from './openrouter';

export const scientificTools: Tool[] = [
	{
		type: 'function',
		function: {
			name: 'search_literature',
			description:
				'Search for academic papers and literature on a given topic. Returns titles, authors, and DOIs.',
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'The search query for finding relevant papers'
					},
					limit: {
						type: 'number',
						description: 'Maximum number of results to return (default: 5)'
					}
				},
				required: ['query']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'generate_diagram',
			description:
				'Generate TikZ code for a diagram based on a natural language description. Returns LaTeX TikZ code.',
			parameters: {
				type: 'object',
				properties: {
					description: {
						type: 'string',
						description: 'Natural language description of the diagram to generate'
					},
					diagram_type: {
						type: 'string',
						enum: ['flowchart', 'graph', 'neural_network', 'tree', 'timeline', 'other'],
						description: 'The type of diagram to generate'
					}
				},
				required: ['description']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'explain_equation',
			description:
				'Explain a mathematical equation or formula in detail, breaking down each component.',
			parameters: {
				type: 'object',
				properties: {
					equation: {
						type: 'string',
						description: 'The equation in LaTeX format to explain'
					}
				},
				required: ['equation']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'suggest_citation',
			description:
				'Suggest relevant citations for a given claim or statement in the document.',
			parameters: {
				type: 'object',
				properties: {
					claim: {
						type: 'string',
						description: 'The claim or statement that needs citation support'
					},
					field: {
						type: 'string',
						description: 'The academic field or topic area'
					}
				},
				required: ['claim']
			}
		}
	}
];
