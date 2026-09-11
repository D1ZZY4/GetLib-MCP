-- Concern: expiring API keys.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository),
-- managed from the dashboard API keys page and enforced on the transport
-- boundary (see src/application/apikeys/apikeys.service.ts).
-- Apply order: filename version prefix (requires the api_keys table from
-- 2026090904). Additive only: never edits shipped files.
--
-- expires_at is nullable: existing keys without a value never expire.
-- Expired keys fail verification exactly like unknown ones.

alter table public.api_keys add column if not exists expires_at timestamptz;

create index if not exists api_keys_expires_at_idx on public.api_keys (expires_at);
