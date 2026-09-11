import { randomBytes } from "crypto";
import { equalBytes, sha256Bytes } from "../auth/hash";
import type { ApiKeyRecord, DatabaseRepository, NewApiKey } from "@/server/mcp/infrastructure/database";
import { log } from "@/server/mcp/utils/logger";

export const API_KEY_PREFIX = "glk_";
export const API_KEY_NAME_MAX = 100;
/** Prefix for platform-generated key names when the form leaves it blank. */
export const GENERATED_KEY_NAME_PREFIX = "key-";

/**
 * Capability seams of the API key use case. Persistence goes through
 * the repository contract injected here; token generation and hashing
 * use node crypto directly (no network, no config).
 */
export interface ApiKeyDeps {
  getDatabase: () => Pick<
    DatabaseRepository,
    "findApiKeyByHash" | "listApiKeys" | "saveApiKey" | "deleteApiKey" | "renameApiKey" | "rotateApiKey" | "updateApiKeyExpiry" | "touchApiKeyLastUsed"
  >;
}

export interface ApiKeyView {
  id: number;
  name: string;
  prefix: string;
  /** Null means the key never expires. */
  expiresAt: string | null;
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
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
  };
}

function hashKey(presented: string): Buffer {
  return sha256Bytes(presented);
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

/** Platform-generated name for blank inputs: key-a1b2c3 style. */
export function generateKeyName(): string {
  return `${GENERATED_KEY_NAME_PREFIX}${randomBytes(3).toString("hex")}`;
}

function normalizeName(name: string | undefined): string {
  if (name === undefined) return generateKeyName();
  const trimmed = name.trim();
  if (trimmed.length === 0) return generateKeyName();
  if (trimmed.length > API_KEY_NAME_MAX) {
    throw new ApiKeyValidationError(`API key name must be at most ${API_KEY_NAME_MAX} characters.`);
  }
  return trimmed;
}

function normalizeExpiry(expiresAt: string | undefined): string | null {
  if (expiresAt === undefined) return null;
  const trimmed = expiresAt.trim();
  if (trimmed.length === 0) return null;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new ApiKeyValidationError("API key expiry must be an ISO-8601 date string.");
  }
  if (parsed <= Date.now()) {
    throw new ApiKeyValidationError("API key expiry must be in the future.");
  }
  return new Date(parsed).toISOString();
}

function mintSecret(): { key: string; keyHash: string; keyPrefix: string } {
  const raw = randomBytes(32).toString("base64url");
  const key = `${API_KEY_PREFIX}${raw}`;
  return { key, keyHash: hashKey(key).toString("hex"), keyPrefix: key.slice(0, 12) };
}

export async function createApiKey(
  deps: ApiKeyDeps,
  name?: string,
  expiresAt?: string,
): Promise<CreatedApiKey> {
  const secret = mintSecret();
  const stored = await deps.getDatabase().saveApiKey({
    name: normalizeName(name),
    keyHash: secret.keyHash,
    keyPrefix: secret.keyPrefix,
    expiresAt: normalizeExpiry(expiresAt),
  } satisfies NewApiKey);
  return { ...toView(stored), key: secret.key };
}

export async function renameApiKey(deps: ApiKeyDeps, id: number, name?: string): Promise<boolean> {
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiKeyValidationError("API key id must be a positive integer.");
  }
  return deps.getDatabase().renameApiKey(id, normalizeName(name));
}

export async function updateApiKeyExpiry(
  deps: ApiKeyDeps,
  id: number,
  expiresAt?: string | null,
): Promise<boolean> {
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiKeyValidationError("API key id must be a positive integer.");
  }
  if (expiresAt === undefined || expiresAt === null) {
    return deps.getDatabase().updateApiKeyExpiry(id, null);
  }
  return deps.getDatabase().updateApiKeyExpiry(id, normalizeExpiry(expiresAt));
}

/**
 * Revoke-and-reissue in one step: the old secret stops working
 * immediately and the new plaintext is returned once, like creation.
 * Row history (name, expiry, timestamps) is preserved. Null when the
 * id does not exist.
 */
export async function regenerateApiKey(deps: ApiKeyDeps, id: number): Promise<CreatedApiKey | null> {
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiKeyValidationError("API key id must be a positive integer.");
  }
  const secret = mintSecret();
  const rotated = await deps
    .getDatabase()
    .rotateApiKey(id, { keyHash: secret.keyHash, keyPrefix: secret.keyPrefix });
  if (!rotated) return null;
  return { ...toView(rotated), key: secret.key };
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
  // Expired keys fail closed like unknown ones: no oracle distinguishing
  // "expired" from "wrong" ever reaches the caller.
  if (record.expiresAt !== null && Date.parse(record.expiresAt) <= Date.now()) return null;
  const stored = Buffer.from(record.keyHash, "hex");
  if (!equalBytes(stored, candidate)) return null;
  try {
    await deps.getDatabase().touchApiKeyLastUsed(record.id);
  } catch (error) {
    // Best-effort observability: a stamp failure must never turn valid
    // credentials into a 500. Logged without the key id to keep key
    // usage out of retained logs.
    log({ level: "debug", msg: "apikeys.touch-last-used.failed", error: error instanceof Error ? error.message : String(error) });
  }
  return { id: record.id, name: record.name };
}
