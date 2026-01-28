# OpenPrism

A minimal, modern editor for LaTeX and Typst with AI assistance and real-time preview.

## Features

- **Real-time Compilation** - See your changes instantly with live PDF preview as you type
- **AI Assistant** - Get help with writing, proofreading, and formatting your documents
- **Modern Interface** - Clean, minimal design that stays out of your way while you write
- **LaTeX & Typst Support** - Write in your preferred markup language
- **Dark Mode** - Full dark mode support with adaptive scrollbars
- **Vim Mode** - Optional Vim keybindings for power users
- **Inline Code Suggestions** - AI-powered code suggestions with inline diff preview
- **Linked Scroll** - Sync scrolling between editor and PDF preview
- **Selection Chat** - Highlight text and ask questions about specific snippets

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Editor**: [CodeMirror 6](https://codemirror.net/)
- **PDF Rendering**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **Database**: [Supabase](https://supabase.com/)
- **AI**: OpenAI API (GPT-4)
- **LaTeX Compilation**: Server-side LaTeX compiler
- **Typst Compilation**: Client-side via WebAssembly

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- OpenAI API key

### Environment Variables

Create a `.env` file in the root directory:

```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### Database Setup

Run the following SQL in your Supabase dashboard to create the required tables:

```sql
-- Projects table
create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Untitled Project',
  format text not null default 'latex' check (format in ('latex', 'typst')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Project files table
create table project_files (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  path text not null,
  content text default '',
  type text not null default 'document',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Conversations table (for chat history)
create table conversations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  messages jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Bibliography table
create table bibliography (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  cite_key text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table projects enable row level security;
alter table project_files enable row level security;
alter table conversations enable row level security;
alter table bibliography enable row level security;

-- RLS Policies
create policy "Users can manage their own projects"
  on projects for all using (auth.uid() = user_id);

create policy "Users can manage files in their projects"
  on project_files for all using (
    project_id in (select id from projects where user_id = auth.uid())
  );

create policy "Users can manage conversations in their projects"
  on conversations for all using (
    project_id in (select id from projects where user_id = auth.uid())
  );

create policy "Users can manage bibliography in their projects"
  on bibliography for all using (
    project_id in (select id from projects where user_id = auth.uid())
  );
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/openprism.git
cd openprism

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
npm run preview
```

## Usage

1. **Create a Project** - Click "New Project" and choose between LaTeX or Typst
2. **Write** - Use the editor on the left to write your document
3. **Compile** - Press `Cmd+Enter` (or `Ctrl+Enter`) to compile and see the PDF preview
4. **AI Chat** - Use the chat panel to ask questions or get help with your document
5. **Proofreading** - Click the spellcheck icon to get AI-powered proofreading suggestions

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Compile document |
| `Cmd/Ctrl + B` | Compile document |
| `Cmd/Ctrl + S` | Save file |

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── chat/        # Chat panel and code changes
│   │   ├── editor/      # CodeMirror editor and extensions
│   │   ├── preview/     # PDF viewer
│   │   ├── sidebar/     # File tree
│   │   └── ui/          # Reusable UI components
│   ├── stores/          # Svelte stores for state management
│   ├── utils/           # Utility functions
│   └── supabase.ts      # Supabase client
├── routes/
│   ├── api/             # API endpoints
│   ├── app/[projectId]/ # Project editor page
│   ├── auth/            # Authentication page
│   └── +page.svelte     # Landing page
└── app.css              # Global styles
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Author

Made by [Jesus Remon](https://x.com/TheCreatorAbove)
