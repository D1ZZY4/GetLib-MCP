# GetLib MCP

Self-hostable library docs platform: Next.js dashboard + first-class MCP server
with tools, resources, and prompts. A Context7-style alternative you own.

## Stack

- Bun (package manager, scripts, MCP runtime)
- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS v4 + HeroUI v3 + Recharts
- Supabase (planned backend)
- Official `@modelcontextprotocol/sdk` v1

## Scripts (Bun only)

```bash
bun install
cp .env.example .env   # optional: only needed for GETLIB_GITHUB_TOKEN rate limits
bun run dev      # dashboard with Turbopack
bun run mcp      # MCP server over stdio (14 tools, 2 resources, 1 prompt)
bun run build
bun run start    # also serves Streamable HTTP at /api/mcp/http and SSE at /api/mcp/sse
bun run typecheck
bun run lint     # typecheck + no-em-dash repository check
bun run validate # typecheck + no-em-dash check + tests
bun test         # server unit tests (bun:test)
```

## Layout

```text
src/
  app/         # Next.js App Router: (auth), (dashboard), api/mcp, api/management,
               # api/_lib (shared route helpers: error model, body limits, request IDs)
  web/         # Dashboard UI: features, components, hooks, lib/api-client,
               # styles/tokens.css, types/mcp (web-owned control-plane contracts)
  application/ # Use cases: health, clients, mcp catalog, sources (used by API routes + web)
  server/mcp   # MCP module: registry, tools, services, sources,
               # utils, resources, prompts, transport, tests
```

## Architecture

MCP Control Plane + MCP Server + Web Application. One rule governs
the boundary:

```text
server/ never imports web/
```

```text
Web UI -> features -> services (mock data until the backend lands)
MCP server -> registry -> tools -> services (fetch pipeline, caches,
  telemetry, intent router) -> sources (offline registry + tables)
```

MCP tools are thin protocol adapters: validate input, run the service,
return the result. The dashboard reads control-plane data over
`/api/mcp/*`. Auth, DB, and rate limiting are deferred until the real
backend lands.

Repository checks: `bun run lint` also enforces the no-em-dash rule
(all controlled content must avoid the em dash character; `AGENTS.md`
is excluded because Next.js tooling regenerates that file). All
`GETLIB_*` environment variables are validated in
`src/server/mcp/config.ts`, the single configuration boundary.

## Deployment

- Vercel: Next.js framework, install and build via Bun
- Docker: multi-stage Bun build, Node runtime with `next start`
- VPS: build, then serve `.next` behind any Node host
