-- Concern: MCP observability correlation lookup (request_id index).
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository),
-- read from /api/management/logs and the dashboard recent-activity path.
-- Apply order: filename version prefix (no cross-file dependencies).
-- Additive only: never edits the shipped 2026090902 file.

create index if not exists mcp_logs_request_id_idx on public.mcp_logs (request_id);
