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

- `server.ts` — creates `McpServer`, registers everything, connects over stdio.
- `transport/stdio.ts` — stdio transport connector.
- `transport/http.ts` — Streamable HTTP transport for the Next.js `/api/mcp/http` route.
- `registry/` — tool, resource, and prompt registries (`define*`, `list*`, runners).
- `tools/` — one file per `gl_*` tool plus shared helpers (`docs-fetch`,
  `docs-report`, `audit-scan`, ...). Each file exports `register*Tools()`
  which adapts the tool to the `defineTool` pattern.
- `services/` — fetch pipeline, caches, telemetry, intent router, resolvers.
- `sources/` — offline registry data plus curated URL/pattern tables.
- `utils/` — HTML/markdown, extract, guard, logger, snippets, versioning.
- `resources/` — `getlib://libraries`, `getlib://stats`.
- `prompts/` — `review-libraries`.
- `types.ts`, `config.ts` (`GETLIB_*` env), `constants.ts`, `utils/logger.ts`.

## Next step

Remaining mock surfaces: `resources/libraries.resource.ts` and
`prompts/review.prompt.ts` still read dashboard mock data — port
`registerResources` / `registerPrompts` equivalents next. Then add auth and
middleware.
