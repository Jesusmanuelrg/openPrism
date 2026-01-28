export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			projects: {
				Row: {
					id: string;
					user_id: string;
					title: string;
					format: 'latex' | 'typst';
					settings: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					title: string;
					format?: 'latex' | 'typst';
					settings?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					title?: string;
					format?: 'latex' | 'typst';
					settings?: Json;
					created_at?: string;
					updated_at?: string;
				};
			};
			project_files: {
				Row: {
					id: string;
					project_id: string;
					path: string;
					content: string;
					type: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					project_id: string;
					path: string;
					content?: string;
					type?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					project_id?: string;
					path?: string;
					content?: string;
					type?: string;
					updated_at?: string;
				};
			};
			bibliography: {
				Row: {
					id: string;
					project_id: string;
					cite_key: string;
					doi: string | null;
					metadata: Json;
					raw_bibtex: string | null;
				};
				Insert: {
					id?: string;
					project_id: string;
					cite_key: string;
					doi?: string | null;
					metadata: Json;
					raw_bibtex?: string | null;
				};
				Update: {
					id?: string;
					project_id?: string;
					cite_key?: string;
					doi?: string | null;
					metadata?: Json;
					raw_bibtex?: string | null;
				};
			};
			conversations: {
				Row: {
					id: string;
					project_id: string;
					messages: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					project_id: string;
					messages?: Json;
					created_at?: string;
				};
				Update: {
					id?: string;
					project_id?: string;
					messages?: Json;
					created_at?: string;
				};
			};
			document_chunks: {
				Row: {
					id: string;
					project_id: string;
					file_id: string;
					content: string;
					embedding: number[];
					created_at: string;
				};
				Insert: {
					id?: string;
					project_id: string;
					file_id: string;
					content: string;
					embedding: number[];
					created_at?: string;
				};
				Update: {
					id?: string;
					project_id?: string;
					file_id?: string;
					content?: string;
					embedding?: number[];
					created_at?: string;
				};
			};
		};
	};
}

export type Project = Database['public']['Tables']['projects']['Row'];
export type ProjectFile = Database['public']['Tables']['project_files']['Row'];
export type Bibliography = Database['public']['Tables']['bibliography']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
