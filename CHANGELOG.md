# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  lifecycle with production fail-fast.
- Developments and Settings pages, a profile menu, origin
  validation on MCP transports, and UI rewired from mocks to
  authoritative backend snapshots.

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

## [0.1.0] - 2026-09-08

Initial release.

### Added

- Self-hostable library documentation MCP server and dashboard,
  a Context7-style alternative, built on Next.js 16, React 19,
  and Bun.
- MCP tool, resource, and prompt registries served over
  Streamable HTTP and stdio.
- Dashboard routes for discover, install, sources, statistics,
  and the MCP control center.
