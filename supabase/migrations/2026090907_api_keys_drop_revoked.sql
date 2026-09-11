-- Concern: drop the revoked flag; deletion is now the only removal path.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository).
-- Apply order: filename version prefix (requires the api_keys table from
-- 2026090904). Shipped files are never edited, only extended by new ones.
--
-- Previously revoked rows are purged first so dead credentials cannot
-- resurrect as active keys once the flag is gone. Remaining rows keep
-- their hashes, names, prefixes, and timestamps untouched.
--
-- The purge is guarded on the column existing: databases whose api_keys
-- table predates the revoked flag (or already dropped it) have nothing
-- to purge, and db-push re-runs every file without tracking, so the
-- unguarded DELETE aborted the whole production push. End state is
-- identical on every environment: no revoked column, no revoked rows.

begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'api_keys' and column_name = 'revoked'
  ) then
    delete from public.api_keys where revoked = true;
  end if;
end
$$;

alter table public.api_keys drop column if exists revoked;

commit;
