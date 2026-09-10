-- Concern: long-lived API keys for programmatic MCP access.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository),
-- managed from the dashboard API keys page and verified on the MCP
-- transport boundary (see src/application/auth/session.ts).
-- Apply order: filename version prefix (no cross-file dependencies).
-- Additive only: never edits shipped files.
--
-- Only the sha256 hash is stored - the plaintext key is shown once at
-- creation and never again. Revocation flips the flag; rows are kept
-- for auditability.

create table if not exists public.api_keys (
  id bigint generated always as identity primary key,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- RLS is enabled with no public policies: only the service role (which
-- bypasses RLS) may read/write keys. The anon client must never touch
-- this table, so the repository always prefers the service client.
alter table public.api_keys enable row level security;

create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);
