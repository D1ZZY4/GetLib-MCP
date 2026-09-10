-- Concern: bootstrap password rotation detection.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository)
-- plus src/application/auth/auth.service.ts (ensureBootstrapAccount).
-- Apply order: filename version prefix (requires app_bootstrap from
-- 2026090901). Additive only: never edits shipped files.
--
-- A sha256 of the configured password (never the password itself).
-- Same-account password rotations are otherwise invisible because the
-- bootstrap row previously keyed identity on the account name alone.

alter table public.app_bootstrap add column if not exists password_hash text;
