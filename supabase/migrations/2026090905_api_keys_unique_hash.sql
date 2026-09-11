-- Concern: API key hash uniqueness (defense in depth).
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository).
-- Apply order: filename version prefix (requires the api_keys table from
-- 2026090904). Additive only: never edits shipped files.
--
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
