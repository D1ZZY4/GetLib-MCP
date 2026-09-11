-- Concern: long-lived API keys for programmatic MCP access.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository),
-- managed from the dashboard API keys page and verified on the MCP
-- transport boundary (see src/application/auth/session.ts).
-- Apply order: filename version prefix (no cross-file dependencies).
--
-- Canonical definition, superseding the removed 0904/0905/0907/0910 chain.
-- The runner re-applies every file without tracking, so every statement
-- below is guarded and the end state is identical on databases that ran
-- the old chain and on fresh ones.
--
-- Only sha256 hashes are stored - the plaintext key is shown once at
-- creation and never again. expires_at is nullable: keys without a value
-- never expire. Names are platform-generated when the form leaves them
-- blank, so the column stays not null.

create table if not exists public.api_keys (
  id bigint generated always as identity primary key,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- RLS is enabled with no public policies: only the service role (which
-- bypasses RLS) may read/write keys. The anon client must never touch
-- this table, so the repository always prefers the service client.
alter table public.api_keys enable row level security;

-- Databases that applied the original chain may still carry the revoked
-- flag (deletion is now the only removal path). Fresh databases never
-- create it; the guarded drop is a no-op for them.
alter table public.api_keys drop column if exists revoked;

-- Hashes are 256-bit random, so collisions are not expected; the
-- constraint turns a theoretical duplicate insert into a loud failure
-- instead of two rows sharing one credential.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'api_keys_key_hash_unique'
  ) then
    alter table public.api_keys add constraint api_keys_key_hash_unique unique (key_hash);
  end if;
end
$$;

alter table public.api_keys add column if not exists expires_at timestamptz;

create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);
create index if not exists api_keys_expires_at_idx on public.api_keys (expires_at);
