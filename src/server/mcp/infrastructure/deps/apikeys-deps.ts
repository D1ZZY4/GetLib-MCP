import type { ApiKeyDeps } from "@/application/apikeys/apikeys.service";
import { getDatabase } from "@/server/mcp/infrastructure/database";
import { verifyApiKey } from "@/application/apikeys/apikeys.service";

/**
 * Live infrastructure binding for API keys. Route and transport
 * adapters inject these; tests inject stubs. No business logic lives
 * here, only wiring between the application seam and the concrete
 * providers.
 */
export const liveApiKeyDeps: ApiKeyDeps = {
  getDatabase,
};

/**
 * Live binding for the transport auth boundary (session.ts). Kept next
 * to the repository binding so every Bearer API key verification flows
 * through one seam.
 */
export const liveApiKeyAuthDeps: {
  verifyApiKey: (presentedKey: string) => Promise<{ id: number; name: string } | null>;
} = {
  verifyApiKey: (presentedKey: string) => verifyApiKey(liveApiKeyDeps, presentedKey),
};
