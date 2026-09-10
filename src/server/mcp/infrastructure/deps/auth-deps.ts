import type { AuthDeps } from "@/application/auth/auth.service";
import { getDatabase } from "@/server/mcp/infrastructure/database";

/**
 * Live infrastructure binding for the bootstrap use case. Startup
 * initialization injects this; tests inject stubs or the mock
 * repository. No business logic lives here, only wiring between the
 * application seam and the concrete providers.
 */
export const liveAuthDeps: AuthDeps = {
  getDatabase,
};
