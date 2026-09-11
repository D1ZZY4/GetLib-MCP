import type { ClientsDeps } from "@/application/clients/clients.service";
import { getDatabase } from "@/server/mcp/infrastructure/database";

/**
 * Live infrastructure binding for persistent client identities. Route
 * adapters inject this; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * repository.
 */
export const liveClientsDeps: ClientsDeps = {
  getDatabase,
};
