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
- `2026090908_mcp_clients.sql` - stable MCP client identities
  (`mcp_clients`). Owner: `SupabaseDatabaseRepository` + transport
  sightings.
- `2026090909_mcp_logs_subject.sql` - nullable `subject` on
  `mcp_logs` for per-library usage statistics, plus index.
- `2026090911_api_keys.sql` - canonical long-lived API keys
  (`api_keys`, hashes only, nullable `expires_at`): squashes the
  removed 0904/0905/0907/0910 chain into one guarded file. The
  runner re-applies every file without tracking, so the squash is
  end-state identical on old and fresh databases (verified by
  applying the full set to a scratch database and diffing the
  resulting schema).
- `2026090912_app_bootstrap_trigger_name.sql` - renames the
  `updated_at` trigger to `trg_app_bootstrap_updated_at` so it no
  longer shares a name with the function it calls.

Naming conventions (enforced by review, pinned by migration tests):

- Tables: plural snake_case (`api_keys`, `mcp_logs`, `mcp_clients`).
- Columns: snake_case, timestamps end in `_at` (`created_at`,
  `last_seen_at`, `expires_at`).
- Indexes: `{table}_{column}_idx` (`api_keys_key_hash_idx`).
- Unique constraints: `{table}_{column}_unique`
  (`api_keys_key_hash_unique`).
- Triggers: `trg_{table}_{purpose}`
  (`trg_app_bootstrap_updated_at`); the function keeps its
  descriptive `touch_...` name.

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
