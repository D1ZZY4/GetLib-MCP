import { z } from "zod";
import { requireManagementAuth } from "@/application/auth/session";
import {
  DOCS_LIBRARY_ID_MAX,
  DOCS_PROJECT_PATH_MAX,
  DOCS_TOPIC_MAX,
  DOCS_VERSION_MAX,
  fetchLibraryDocsUseCase,
} from "@/application/library/docs.service";
import { SEARCH_TOKENS_DEFAULT, SEARCH_TOKENS_MAX, SEARCH_TOKENS_MIN } from "@/application/library/search.service";
import { checkRateLimit, EXECUTION_TIER } from "@/server/mcp/utils/rate-limit";
import { nonBlankString } from "@/server/mcp/utils/schemas";
import { jsonOk, mapRouteError, readJsonBody, requestId } from "@/app/api/_lib/route-helpers";

const DocsBody = z.object({
  libraryId: nonBlankString(DOCS_LIBRARY_ID_MAX),
  topic: z.string().max(DOCS_TOPIC_MAX).optional(),
  version: z.string().max(DOCS_VERSION_MAX).optional(),
  tokens: z.number().int().min(SEARCH_TOKENS_MIN).max(SEARCH_TOKENS_MAX).optional(),
  projectPath: z.string().max(DOCS_PROJECT_PATH_MAX).optional(),
});

/**
 * Dashboard documentation fetch. Same application capability as the
 * gl_get_docs MCP tool - the protocol adapter at /api/mcp never serves
 * browsers.
 */
export async function POST(req: Request) {
  const id = requestId();
  try {
    checkRateLimit(req, "management/docs", EXECUTION_TIER);
    requireManagementAuth(req);
    const body = DocsBody.parse(await readJsonBody(req));
    const started = Date.now();
    const { response, resolved } = await fetchLibraryDocsUseCase({
      libraryId: body.libraryId,
      topic: body.topic,
      version: body.version,
      tokens: body.tokens ?? SEARCH_TOKENS_DEFAULT,
      projectPath: body.projectPath,
    });
    return jsonOk({ resolved, result: response, durationMs: Date.now() - started }, id);
  } catch (error) {
    return mapRouteError(error, id);
  }
}
