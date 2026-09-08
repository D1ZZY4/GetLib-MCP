# GetLib MCP server (`src/server/mcp`)

Stdio MCP server built on the official `@modelcontextprotocol/sdk` (v1 API).
Tools, resources, and prompts live in small registries so the stdio server
and the `/api/mcp` routes share one single source of truth.

## Run

```bash
bun run mcp                 # stdio server
bun src/server/mcp/stdio-entry.ts --health        # JSON health payload
bun src/server/mcp/stdio-entry.ts --version       # server version
bun src/server/mcp/stdio-entry.ts --routing-table # intent routing table
bun test                    # unit tests in server/mcp/tests/
```

## Layout

- `server.ts` - creates `McpServer`, registers everything, connects over stdio.
- `init.ts` - application initialization lifecycle (registry, production
  policy validation, idempotent bootstrap). Called by stdio entry.
- `runtime.ts` - centralized environment detection and database-mode policy.
  The only place that reads NODE_ENV / VERCEL_ENV / GETLIB_DATABASE_MODE
  for policy decisions.
- `config.ts` - centralized typed environment parsing (`GETLIB_*`, Supabase,
  auth). Feature code must not read process.env directly.
- `transport/` - protocol boundary only: `stdio.ts`, `http.ts`
  (Streamable HTTP), `sse.ts` (legacy SSE), `sessions.ts` (shared eviction),
  `modes.ts` (canonical transport registry), `request-guard.ts` (origin and
  auth-context validation, no business logic).
- `registry/` - tool, resource, and prompt registries (`define*`, `list*`,
  runners) plus `registry-loader.ts` (deterministic one-time registration).
- `tools/` - one file per `gl_*` tool plus shared helpers. Each file exports
  `register*Tools()` which adapts the tool to the `defineTool` pattern.
  Tools are protocol adapters: they validate, consult the registry, and
  delegate to application capabilities.
- `services/` - retrieval and infrastructure implementation, classified by
  responsibility, not by folder name:
  - retrieval/search algorithm: `search/*`, `resolve/*`, `resolve.ts`,
    `intent/*`, `intent-router.ts`, `best-practices/*`, `snippets/*`,
    `deep-fetch.ts`, `doc-fetch.ts`, `llms-index.ts`, `sitemap.ts`,
    `packages.ts`, `github.ts`, `changelog-sources.ts`, `compat-sources.ts`,
    `migration-sources.ts`, `links.ts`, `mdn-bcd.ts`, `topic` helpers.
  - HTTP infrastructure: `http/*` (`request.ts`, `jina.ts`, `markdown.ts`,
    `semaphore.ts`, `try-fetch.ts`, `negative-cache.ts`) plus `fetcher.ts`
    as the single import barrel.
  - security infrastructure: `http/ssrf.ts` plus `utils/guard.ts`
    (path, URL, timeout, watermark policies).
  - caching infrastructure: `cache.ts`, `lru-cache.ts`, `disk-cache.ts`,
    `http/negative-cache.ts`.
  - observability infrastructure: `telemetry.ts`, `telemetry-outcomes.ts`,
    `metrics.ts`, `middleware/logging.ts`, `utils/logger.ts`.
  - configuration persistence: `source-settings.ts` (file-backed source
    toggles consulted by tools).
  - content policy: `content-guards.ts`, `server-instructions.ts`.
- `infrastructure/` - explicit technical boundaries:
  - `supabase/client.ts` - server-side Supabase client (never imported by
    frontend). HTTPS-based, safe for serverless.
  - `database/` - repository contract plus `mock-repository.ts`
    (development) and `supabase-repository.ts` (real). Application code uses
    `getDatabase()`, never Supabase directly.
- `sources/` - offline registry data plus curated URL/pattern tables.
- `utils/` - HTML/markdown, extract, guard, logger, snippets, versioning.
- `resources/` - `getlib://libraries`, `getlib://stats` (live registry data).
- `prompts/` - review, docs, best-practices, migration, audit, compare.
- `types.ts`, `constants.ts`.

## Environment

`GET_LIB_MODE=production` or `development` forces the runtime environment
and always wins. When empty, the mode auto-detects from `VERCEL_ENV` /
`NODE_ENV` (production signals yield production, development/test signals
yield development) and otherwise defaults to production. Invalid values
fail fast. Empty placeholder values (`KEY=`) in `.env` files count as
unset across all typed parsers.

## Architecture

```text
MCP Client -> Transport -> Protocol -> Origin check -> Registry
  -> Tool adapter -> Application service -> Domain -> Infrastructure
  -> Supabase / External providers
```

Application use cases live in `src/application/` and domain rules in
`src/domain/`. Transports and tools never contain business logic.
Database schema is versioned in `supabase/migrations/`.
