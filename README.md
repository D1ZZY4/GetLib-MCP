# GetLib MCP

Self-hostable library docs platform: Next.js dashboard + first-class MCP server
with tools, resources, and prompts. A Context7-style alternative you own.

## Stack

- Bun (package manager, scripts, MCP runtime)
- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS v4 + HeroUI v3 + Recharts
- Supabase PostgreSQL (production database + dev option, per-concern migrations)
- Official `@modelcontextprotocol/sdk` v1

## Scripts (Bun only)

```bash
bun install
cp .env.example .env   # set GET_LIB_MODE=development for local work
bun run dev      # dashboard with Turbopack
bun run mcp      # MCP server over stdio (14 tools, 2 resources, 6 prompts)
bun run build:mcp # bundle the npx/CLI entry to dist/mcp.js (runs on prepublishOnly)
bun run build
bun run start    # also serves Streamable HTTP at /api/mcp/http and SSE at /api/mcp/sse
bun run typecheck
bun run lint     # typecheck + no-em-dash repository check + architecture boundary check
bun run validate # typecheck + no-em-dash check + boundary check + tests + production build
bun test         # unit + integration tests across application, domain, and server (bun:test)
```

## Layout

```text
src/
  app/         # Next.js App Router: (auth), (dashboard), api/mcp, api/management,
               # api/_lib (shared route helpers: error model, body limits, request IDs)
  web/         # Dashboard UI: features, components, hooks, lib/api-client,
               # styles/tokens.css, types (web-owned control-plane contracts)
  application/ # Use cases: library (search, resolve, docs, best-practices,
               # snippets, examples, compare, changelog, migration,
               # batch-resolve), scan, audit, compat, dispatch, health,
               # clients, mcp catalog, sources, dashboard, statistics,
               # install, runtime, development, settings, auth (used by
               # API routes). Capability seams are injected Deps interfaces;
               # live bindings sit in server/mcp/infrastructure/deps.
  domain/      # Pure business rules (no I/O): auth policy, MCP catalog contracts
  server/mcp   # MCP module: registry, tools, services, sources, utils,
               # resources, prompts, transport, runtime, init,
               # infrastructure/database, infrastructure/supabase,
               # infrastructure/deps (live use-case bindings), tests
```

## Architecture

MCP Control Plane + MCP Server + Web Application. One rule governs
the boundary:

```text
server/ never imports web/
```

```text
Web UI -> features -> services -> /api/management/* -> application
MCP server -> registry -> tools -> application -> domain
  -> infrastructure -> Supabase / external providers
```

MCP tools are thin protocol adapters: validate input, run the service,
return the result. The dashboard reads control-plane data over
`/api/management/*` only; `/api/mcp/*` is the MCP protocol boundary
(Streamable HTTP, SSE, tool execution) and never serves browsers. Auth is
centralized with fallback bootstrap credentials, persistence goes through
the database repository boundary (mock in development, Supabase in
production), and the runtime environment auto-detects from Vercel/Node
metadata (`GET_LIB_MODE` exists only as a debug override).

Repository checks: `bun run lint` also enforces the no-em-dash rule
(all controlled content must avoid the em dash character; encoded
circumventions are additionally rejected in user-facing `src/app` and
`src/web` output, while backend detection patterns may still match em
dashes inside untrusted external content. `AGENTS.md` is
excluded because Next.js tooling regenerates that file, and `bun.lock`
because it is a generated lockfile) and the architecture boundary check
(`scripts/check-boundaries.ts`: dependency direction across web, app,
application, domain, infrastructure, and MCP layers). All
`GETLIB_*` environment variables are validated in
`src/server/mcp/config.ts`, the single configuration boundary.

## Deployment

- Vercel: Next.js framework, install and build via Bun
- Docker: multi-stage Bun build, Node runtime with `next start`
- VPS: build, then serve `.next` behind any Node host
