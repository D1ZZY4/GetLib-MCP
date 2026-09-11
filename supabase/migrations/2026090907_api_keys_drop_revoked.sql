-- Concern: drop the revoked flag; deletion is now the only removal path.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository).
-- Apply order: filename version prefix (requires the api_keys table from
-- 2026090904). Shipped files are never edited, only extended by new ones.
--
-- Previously revoked rows are purged first so dead credentials cannot
-- resurrect as active keys once the flag is gone. Remaining rows keep
-- their hashes, names, prefixes, and timestamps untouched.

begin;

delete from public.api_keys where revoked = true;

alter table public.api_keys drop column if exists revoked;

commit;
