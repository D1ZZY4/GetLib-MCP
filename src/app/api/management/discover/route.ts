import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import { liveApiKeyAuthDeps } from "@/server/mcp/infrastructure/deps/apikeys-deps";
import {
  SEARCH_QUERY_MAX,
  SEARCH_TOKENS_DEFAULT,
  SEARCH_TOKENS_MAX,
  SEARCH_TOKENS_MIN,
  searchLibrariesUseCase,
} from "@/application/library/search.service";
import { checkRateLimit, EXECUTION_TIER } from "@/server/mcp/utils/rate-limit";
import { liveSearchDeps } from "@/server/mcp/infrastructure/deps/search-deps";
import { nonBlankString } from "@/server/mcp/utils/schemas";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const DiscoverBody = z.object({
  query: nonBlankString(SEARCH_QUERY_MAX),
  tokens: z.number().int().min(SEARCH_TOKENS_MIN).max(SEARCH_TOKENS_MAX).optional(),
});

/**
 * Dashboard search. Same application capability as the gl_search
 * MCP tool - the protocol adapter at /api/mcp never serves browsers.
 */
export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/discover", EXECUTION_TIER);
    await requireManagementAuth(req, liveApiKeyAuthDeps);
    const body = DiscoverBody.parse(await readJsonBody(req));
    const started = Date.now();
    const { response, resolved } = await searchLibrariesUseCase(
      {
        query: body.query,
        tokens: body.tokens ?? SEARCH_TOKENS_DEFAULT,
      },
      liveSearchDeps,
    );
    return jsonOk({ query: body.query, resolved, result: response, durationMs: Date.now() - started }, id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
