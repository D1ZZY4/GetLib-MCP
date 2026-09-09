-- Concern: MCP observability sink (durable tool-call log).
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository.saveLog),
-- written production-only from src/server/mcp/middleware/logging.ts.
-- The hot read path (/api/mcp/logs) stays on the in-memory ring.
-- Apply order: filename version prefix (no cross-file dependencies).

create table if not exists public.mcp_logs (
  id bigint generated always as identity primary key,
  request_id text,
  kind text not null default 'tool',
  name text not null,
  duration_ms integer not null default 0,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS is enabled with no public policies: only the service role (which
-- bypasses RLS) may insert. Writes prefer the service client and degrade
-- silently to the in-memory ring when the service key is absent.
alter table public.mcp_logs enable row level security;

create index if not exists mcp_logs_created_at_idx on public.mcp_logs (created_at desc);
create index if not exists mcp_logs_name_idx on public.mcp_logs (name);
