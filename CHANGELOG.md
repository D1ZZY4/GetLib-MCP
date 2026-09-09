# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<details open>
<summary>Unreleased changes (click to collapse)</summary>

### Added

- SSE transport for the MCP server, served at `/api/mcp/sse`,
  with session tracking and transport modes.
- Registry loader that replaces the hardcoded registration
  sequence, with typed prompt arguments surfaced to clients.
- New MCP prompts for audit, best practices, compare, docs, and
  migration, plus an application-level MCP catalog used by API
  routes and the dashboard.
- Source enablement settings that gate individual providers,
  source tables, and the library registry, with blocked-library
  lists and wildcard overrides.
- Source management APIs and a reworked Sources UI with live
  entry counts, per-source toggles, and blocked/wildcard lists.
- Authentication use cases that verify sign-in credentials
  against the configured default account, with fail-closed
  behavior and timing-safe password comparison.
- Auth management APIs and a unified sign-up and sign-in UI
  with a guest session while server authentication is off.
- Live documentation search through the shared search pipeline,
  with evidence verdicts, deep-linkable queries, example prompts,
  and per-source detail pages.
- Install assistant with per-agent transport badges, local and
  remote config snippets, and an accessible copy workflow.
- Shared web fetch client with size limits and error envelopes,
  a shared async-data hook with retry, design tokens, and
  web-owned MCP contracts.
- Shared API route helpers for request IDs, capped JSON bodies,
  and mapped error envelopes, with routes calling application
  services instead of registries directly.
- Drill-down sidebar navigation with an MCP submenu, a redesigned
  404 page, and dark mode as the default theme.
- Centralized `GETLIB_*` configuration boundary with fail-closed
  validation for tokens, paths, flags, and auth settings.
- Tool execution hardening: per-tool timeouts with actionable
  responses, extraction refusal guards, filesystem and network
  boundary checks, and lockfile-based version detection.
- Supabase, allowed-hosts, and mode settings in the centralized
  config boundary, with blank-tolerant parsing and removal of
  the unused HTTP port setting.
- Placeholder-only `.env.example` for local setup.
- Centralized runtime environment detection with database-mode
  policy, fail-fast production validation, and snapshots.
- Dashboard, development, install, runtime, and statistics
  application services with management APIs, backed by live
  telemetry or explicit mock payloads.
- Domain auth policy, Supabase database boundary with mock and
  real repositories, versioned migrations, and a startup init
  lifecycle that degrades instead of crashing.
- Developments and Settings pages, a profile menu, origin
  validation on MCP transports, and UI rewired from mocks to
  authoritative backend snapshots.
- Enforce origin validation on both SSE routes, rejecting
  forged cross-site origins with 403.
- `GETLIB_SESSION_SECRET` session signing secret with a
  per-process fallback, documented in `.env.example`.
- Contract test locking the exact `GETLIB_AUTHENTICATICATION_ENABLE`,
  `GETLIB_DEFAULT_ACCOUNT`, and `GETLIB_DEFAULT_PASS` spelling.
- Database production-guard test proving production never resolves
  the mock repository.
- Domain MCP catalog contracts for transport modes and client
  sessions, with catalog tool entries carrying input keys and
  annotations and executions returning request IDs and durations.
- Logger redaction tests proving sensitive fields and bearer
  credentials never reach log output in readable form.
- In-memory sliding-window rate limiter with strict, execution,
  and read tiers plus tests for budget, expiry, and scope
  isolation.
- Stateless HMAC session tokens over cookie or bearer header with
  an authorization boundary, sign-out endpoint, and session plus
  bootstrap lifecycle tests.
- Development seed and reset endpoints with page controls and
  lifecycle tests; production always rejects both.
- Read-only settings snapshot endpoint with a Configuration tab
  and a no-secrets test; display identity comes from the session.
- Graceful shutdown lifecycle draining MCP sessions and cached
  repository handles, wired to stdio process signals.
- Library search, resolve, and docs use cases shared by tools,
  dashboard discover/docs endpoints, and future consumers.
- Management catalog endpoints for servers, tools, tool runs,
  resources, prompts, and logs with limit validation.
- Removal of the unguarded `/api/mcp` catalog and tool-run
  duplicates now served by the management API.
- Next.js instrumentation hook running application startup once
  per server process, skipped on builds and edge runtimes.
- Drill-down detail views for tools, servers, clients, log
  entries, resources, and prompts with loading, empty, and error
  states.
- Publishable `getlib-mcp` binary bundling the stdio entry to
  `dist/mcp.js` on prepublish.
- Canonical Streamable HTTP protocol route with a serverless
  warning for SSE sessions and shutdown lifecycle tests.
- Credential contract tests locking fallback and demo identities
  plus email normalization rules.
- Shared UI primitives for back links, load errors, page headers,
  status tones, and form validation.

### Changed

- Replace every em dash with a hyphen across comments and
  controlled text (around 70 files under `src/server/mcp`:
  services, tools, source tables, and utilities) to comply
  with the repository punctuation policy. Pure punctuation
  swap, no behavior change.
- Upgrade Zod to v4 alongside Supabase, Undici, and Node types.
- Add `check:no-em-dash`, and chain typecheck, lint, and tests
  behind the `lint` and `validate` scripts.
- Share idle-session eviction between Streamable HTTP and SSE.
- Align dashboard, statistics, and MCP catalog UI with the new
  web client and contracts, with shared tooltips, ranking
  helpers, and honest sample-data copy.
- Centralize fetching behind timeout, redirect, semaphore, and
  SSRF protection, with an idempotent guard install, backoff on
  rate limits, and circuit breaking on search providers.
- Harden the Docker runtime with a health check, a non-root
  user, tolerance for a missing `public/` directory, and a
  fuller `.dockerignore`; disable the `X-Powered-By` header.
- Document the new scripts, transports, and configuration in
  the READMEs, and expand the architecture blueprint with
  database, environment, deployment, and auth flows.
- Standardize error mapping with forbidden, conflict, rate
  limiting, and unavailable codes plus partial-result envelopes.
- Align the auth flag to contract-exact `GETLIB_AUTHENTICATICATION_ENABLE`
  and parse `GETLIB_NO_WATERMARK` as a boolean; drop the duplicated
  database-mode and lib-mode fields from the frozen config so runtime
  stays the single live reader, and clarify `GET_LIB_MODE` as a
  debug-only override.
- Fail fast when production requests the mock repository; restrict
  Supabase to the service-role client, clear timeout timers, and
  return a fixed degraded status string so provider internals stay
  in server logs.
- Derive MCP tool counts from the registry instead of a duplicated
  `TOOL_COUNT` constant; server instructions take the count as a
  parameter so counts cannot drift.
- Move the transport mode registry into the domain catalog with a
  transport barrel re-export; `runTool` accepts a caller request ID
  so logs correlate, and catalog tests derive counts from the live
  catalog instead of a constant.
- Order startup as detect environment, validate production policy,
  resolve database mode, load registry, check database health,
  bootstrap account, then ready; policy or bootstrap failure logs
  loudly and serves degraded instead of crashing startup.
- Redact sensitive log fields and bearer credentials before either
  log format renders, in both JSON and text output.
- Issue a session cookie on sign-in behind the strict rate limit;
  the persisted bootstrap record is authoritative for identity so
  credential rotation clears the warning, and public auth config
  no longer carries a display name.
- Require auth and rate limits on the development settings routes;
  the Development page gains seed/reset actions and drops the
  notification demo block.
- Point the install service and its tests at the domain transport
  registry and require auth plus read-tier rate limits on the
  install catalog route.
- Show environment-driven configuration on the Settings page with
  a live tab query param, and drop display name from the runtime
  info contract.
- Require auth and tiered rate limits on Streamable HTTP and both
  SSE routes; align HTTP/SSE session snapshots with the domain
  contract and derive stdio health counts from the live registry.
- Move search, resolve, and docs pipelines into application use
  cases; the MCP tools become thin adapters, the dashboard calls
  the management endpoints instead of protocol routes, and the
  resolve formatter module is removed.
- Rewire the control center to the management API with detail
  links, runtime overview cards, dependency table, log search and
  filters, and playground request correlation.
- Standardize the management envelope: `X-Request-Id` on success
  and errors, `rate_limited` and `unauthorized` mappings, and a
  `payload_too_large` code; guard every management route with auth
  and tiered rate limits except the intentionally public health
  check.
- Surface transports, clients, cache entries, auth state, and
  database latency on the dashboard; live mode drops the mock
  library inventory for real telemetry, and health tests derive
  counts from the live catalog.
- Gate the auth UI on the probed server mode with a guest entry
  card, remove social sign-in, keep demo prefill development-only,
  and clear the server cookie on sign-out.
- Wait for the auth probe before redirecting, hold avatar space
  while resolving, remove the Docs route and shortcut, and rename
  Developments to Development.
- Keep `updated_at` authoritative with a bootstrap trigger and
  document the versioned migration order.
- Reject encoded em-dash circumventions in user-facing output
  while still allowing backend matchers on untrusted content.
- Extend the SSE function timeout and send baseline security
  headers on every response.
- Run Streamable HTTP stateless so serverless isolates answer
  every request identically; the clients view lists recently seen
  clients instead of live sessions.
- Reject empty arrays and strings in tool inputs instead of
  silently accepting them.
- Require the session secret in production with auth enabled,
  fail startup on invalid production database policy, log
  unconfigured persistence loudly, share Supabase key lists
  between policy and parsing, guard manifest reads, and load the
  registry only on explicit call.
- Guard the audit file walk, drop tool barrel re-exports, and
  load the registry explicitly in tests.
- Remove dead fetch barrel re-exports and the superseded result
  guarantee and server instructions modules.

</details>

## [0.1.0] - 2026-09-08

<details>
<summary>0.1.0 changes (click to expand)</summary>

Initial release.

### Added

- Self-hostable library documentation MCP server and dashboard,
  a Context7-style alternative, built on Next.js 16, React 19,
  and Bun.
- MCP tool, resource, and prompt registries served over
  Streamable HTTP and stdio.
- Dashboard routes for discover, install, sources, statistics,
  and the MCP control center.

</details>
