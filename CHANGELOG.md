# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- SSE transport for the MCP server, served at `/api/mcp/sse`,
  with session tracking and transport modes.

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
