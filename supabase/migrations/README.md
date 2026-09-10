# Supabase migrations (per-concern, versioned)

One file per persistence concern, named `<version>_<concern>.sql`
(`<version>` is a zero-padded date prefix; early files used an
`_init_` infix, later additive files do not).
Files apply in filename order. Additive files may build on tables from
earlier files (e.g. the request_id index requires `mcp_logs`); shipped
files are never edited, only extended by new ones.

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
- `2026090905_api_keys_unique_hash.sql` - uniqueness on
  `api_keys.key_hash`. Additive only; shipped files are never edited.
- `2026090906_bootstrap_password_hash.sql` - nullable `password_hash`
  on `app_bootstrap` for same-account rotation detection. Additive
  only; shipped files are never edited.

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
