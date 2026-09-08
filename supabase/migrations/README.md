# Supabase migrations (per-concern)

One file per persistence concern, named `init_<concern>.sql`. Files apply in
alphabetical order and must not depend on each other.

- `init_auth.sql` - authentication bootstrap state (`app_bootstrap` plus the
  idempotent seed row). Owner: `SupabaseDatabaseRepository` + auth bootstrap.
- `init_mcp_observability.sql` - durable MCP tool-call log (`mcp_logs`).
  Owner: `SupabaseDatabaseRepository.saveLog`, written production-only.

Rules:

- Every table enables RLS with no public policies. Server access always
  prefers the service-role client (bypasses RLS); the anon client is never
  used for these tables.
- Seeds must be idempotent (`on conflict do nothing`) so migrations are
  safe to re-run.
- Never store passwords or secrets in seeds. The bootstrap seed holds the
  documented fallback account name only; the password stays env-only.
- Development and production must use separate Supabase projects. Apply
  with `supabase db push` (linked project) or
  `psql $DATABASE_URL -f <file>`.
