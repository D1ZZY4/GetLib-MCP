import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { ApiKeyRecord, DatabaseRepository, NewApiKey } from "@/server/mcp/infrastructure/database";

export const API_KEY_PREFIX = "glk_";
export const API_KEY_NAME_MAX = 100;

/**
 * Capability seams of the API key use case. Persistence goes through
 * the repository contract injected here; token generation and hashing
 * use node crypto directly (no network, no config).
 */
export interface ApiKeyDeps {
  getDatabase: () => Pick<
    DatabaseRepository,
    "findApiKeyByHash" | "listApiKeys" | "saveApiKey" | "deleteApiKey" | "touchApiKeyLastUsed"
  >;
}

export interface ApiKeyView {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreatedApiKey extends ApiKeyView {
  /** Plaintext key, shown once at creation and never stored. */
  key: string;
}

export interface ApiKeyIdentity {
  id: number;
  name: string;
}

export class ApiKeyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyValidationError";
  }
}

function toView(record: ApiKeyRecord): ApiKeyView {
  return {
    id: record.id,
    name: record.name,
    prefix: record.keyPrefix,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
  };
}

function hashKey(presented: string): Buffer {
  return createHash("sha256").update(presented, "utf-8").digest();
}

/**
 * Long-lived programmatic credentials for MCP clients and scripts.
 * Unlike 12-hour session tokens, API keys do not expire; unlike the
 * session secret, they are deletable individually and never grant
 * dashboard cookie sessions. Only hashes reach storage. Deletion
 * removes the row permanently.
 */
export async function listApiKeys(deps: ApiKeyDeps): Promise<ApiKeyView[]> {
  const records = await deps.getDatabase().listApiKeys();
  return records.map(toView);
}

export async function createApiKey(deps: ApiKeyDeps, name: string): Promise<CreatedApiKey> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ApiKeyValidationError("API key name must contain at least one non-whitespace character.");
  }
  if (trimmed.length > API_KEY_NAME_MAX) {
    throw new ApiKeyValidationError(`API key name must be at most ${API_KEY_NAME_MAX} characters.`);
  }
  const raw = randomBytes(32).toString("base64url");
  const key = `${API_KEY_PREFIX}${raw}`;
  const stored = await deps.getDatabase().saveApiKey({
    name: trimmed,
    keyHash: hashKey(key).toString("hex"),
    keyPrefix: key.slice(0, 12),
  } satisfies NewApiKey);
  return { ...toView(stored), key };
}

export async function deleteApiKey(deps: ApiKeyDeps, id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiKeyValidationError("API key id must be a positive integer.");
  }
  return deps.getDatabase().deleteApiKey(id);
}

/**
 * Verify a presented Bearer value against the stored hash via the
 * indexed lookup (no table scan, no per-row timing oracle). Unknown
 * keys return null (the caller maps that to 401 without saying
 * which). Comparison is constant-time; the last-used stamp is
 * best-effort and never fails verification.
 */
export async function verifyApiKey(deps: ApiKeyDeps, presented: string): Promise<ApiKeyIdentity | null> {
  if (!presented.startsWith(API_KEY_PREFIX)) return null;
  const candidate = hashKey(presented);
  const record = await deps.getDatabase().findApiKeyByHash(candidate.toString("hex"));
  if (!record) return null;
  const stored = Buffer.from(record.keyHash, "hex");
  if (stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) return null;
  try {
    await deps.getDatabase().touchApiKeyLastUsed(record.id);
  } catch {
    // Best-effort observability: a stamp failure must never turn valid
    // credentials into a 500.
  }
  return { id: record.id, name: record.name };
}
