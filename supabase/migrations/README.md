# Supabase migrations (per-concern, versioned)

One file per persistence concern, named `<version>_init_<concern>.sql`.
Files apply in filename order and must not depend on each other.

- `2026090901_init_auth.sql` - authentication bootstrap state (`app_bootstrap`
  plus the idempotent seed row). Owner: `SupabaseDatabaseRepository` + auth
  bootstrap.
- `2026090902_init_mcp_observability.sql` - durable MCP tool-call log
  (`mcp_logs`). Owner: `SupabaseDatabaseRepository.saveLog`, written
  production-only.
- `2026090903_mcp_logs_request_id_idx.sql` - correlation lookup index on
  `mcp_logs.request_id`. Additive only; shipped files are never edited.
- `2026090904_api_keys.sql` - long-lived API keys (`api_keys`, hashes
  only). Owner: `SupabaseDatabaseRepository` + API key use case.

Rules:

- Every table enables RLS with no public policies. Server access always
  prefers the service-role client (bypasses RLS); the anon client is never
  used for these tables.
- Seeds must be idempotent (`on conflict do nothing`) so migrations are
  safe to re-run.
- Never store passwords, secrets, or plaintext API keys in seeds or
  tables. The bootstrap seed holds the documented fallback account name
  only; the password stays env-only. API keys persist as sha256 hashes.
- Development and production must use separate Supabase projects. Apply
  with `supabase db push` (linked project) or
  `psql $DATABASE_URL -f <file>`.
