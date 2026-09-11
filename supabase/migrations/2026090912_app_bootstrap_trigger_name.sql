-- Concern: distinct trigger name on app_bootstrap.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository).
-- Apply order: filename version prefix (requires app_bootstrap from
-- 2026090901). Additive only: never edits shipped files.
--
-- The trigger shared its name with the updated_at function it calls,
-- which reads like a recursive definition in logs and catalogs.
-- Same function, new trigger name; the drop makes re-runs safe.

drop trigger if exists touch_app_bootstrap_updated_at on public.app_bootstrap;

create trigger trg_app_bootstrap_updated_at
  before update on public.app_bootstrap
  for each row execute function public.touch_app_bootstrap_updated_at();
