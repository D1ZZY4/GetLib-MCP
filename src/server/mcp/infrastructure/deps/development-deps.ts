import type { DevelopmentDeps } from "@/application/development/development.service";
import { liveAuthDeps } from "@/server/mcp/infrastructure/deps/auth-deps";
import { resetDatabaseCache } from "@/server/mcp/infrastructure/database";

/**
 * Live infrastructure binding for the development mutations. Route
 * adapters inject this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveDevelopmentDeps: DevelopmentDeps = {
  auth: liveAuthDeps,
  resetDatabaseCache,
};
