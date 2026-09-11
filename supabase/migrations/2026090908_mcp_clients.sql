-- Concern: stable MCP client identities for the control plane.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository),
-- recorded on the transport boundary (see src/server/mcp/transport) and
-- surfaced on the dashboard clients pages.
-- Apply order: filename version prefix (no cross-file dependencies).
-- Additive only: never edits shipped files.
--
-- Transports used to key sightings by raw user-agent strings, which break
-- dashboard routes (slashes) and churn on every client update. Each sighting
-- now resolves to one stable `<slug>=<uuid>` id, persisted here with the
-- display metadata. The uuid is deterministic per identity so serverless
-- instances agree without coordination; auth still comes from sessions
-- and API keys, never from these labels.

create table if not exists public.mcp_clients (
  id text primary key,
  name text not null,
  client_version text,
  transport text not null,
  user_agent text,
  api_key_id bigint,
  auth_type text not null default 'anonymous',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  request_count bigint not null default 1
);

-- RLS is enabled with no public policies: only the service role (which
-- bypasses RLS) may read/write client rows. The anon client must never
-- touch this table, so the repository always prefers the service client.
alter table public.mcp_clients enable row level security;

create index if not exists mcp_clients_last_seen_idx on public.mcp_clients (last_seen_at desc);
