import type { RuntimeDeps } from "@/application/runtime/runtime.service";
import { getDatabaseStatus } from "@/server/mcp/infrastructure/database";
import { liveHealthDeps } from "@/server/mcp/infrastructure/deps/health-deps";

/**
 * Live infrastructure binding for the runtime snapshot. Route adapters
 * inject this; tests inject stubs. No business logic lives here, only
 * wiring between the application seam and the concrete providers.
 */
export const liveRuntimeDeps: RuntimeDeps = {
  getDatabaseStatus,
  health: liveHealthDeps,
};
