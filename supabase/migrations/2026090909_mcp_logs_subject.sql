-- Concern: per-library subject on durable tool-run logs.
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository),
-- recorded on the tool run path (see src/server/mcp/registry/tool-registry.ts)
-- and surfaced as most-used libraries on the statistics page.
-- Apply order: filename version prefix (requires the mcp_logs table from
-- 2026090902). Additive only: never edits shipped files.
--
-- Nullable with no backfill: historical rows simply carry no subject and
-- are ignored by the per-library aggregation. Existing readers select
-- explicit columns, so they keep working unchanged.

alter table public.mcp_logs add column if not exists subject text;

create index if not exists mcp_logs_subject_idx on public.mcp_logs (subject);
