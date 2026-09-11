import { createHash } from "crypto";
import type { ClientAuthType } from "../infrastructure/database/types";

/**
 * Stable client identities for the control plane.
 *
 * Transports used to key sightings by raw user-agent strings, which break
 * dashboard routes (slashes) and churn on every client update. Every
 * sighting now resolves through identifyClient to one stable
 * `<slug>=<uuid>` id: the slug is human-readable display metadata, the
 * uuid is a deterministic v5 over the identity key so every serverless
 * instance agrees without coordination. Identity labels are display
 * only - auth still comes from sessions and API keys, never from these.
 */

const UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/** Deterministic RFC 4122 v5 UUID from a namespace plus a name. */
export function uuidv5(name: string, namespace: string = UUID_NAMESPACE): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const digest = createHash("sha1").update(nsBytes).update(name, "utf-8").digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  const view = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view[6] !== undefined) view[6] = (view[6] & 0x0f) | 0x50;
  if (view[8] !== undefined) view[8] = (view[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Collapse arbitrary client names to URL-safe slugs for ids and display. */
export function slugifyClientName(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug.length > 0 ? slug : "unknown";
}

export interface ParsedClientName {
  name: string;
  version?: string;
}

/**
 * Split a `product/version ...` user-agent head into a name and version.
 * Unknown or absent agents become "unknown" with no version - never an
 * empty string, so downstream ids stay well-formed.
 */
export function parseClientName(userAgent: string | undefined): ParsedClientName {
  if (!userAgent) return { name: "unknown" };
  const head = userAgent.split(/[\s;(]/, 1)[0] ?? "";
  const slash = head.indexOf("/");
  if (slash > 0) {
    const name = slugifyClientName(head.slice(0, slash));
    const version = head.slice(slash + 1).replace(/[^0-9A-Za-z._-]+/g, "").slice(0, 20);
    return version.length > 0 ? { name, version } : { name };
  }
  return { name: slugifyClientName(head) };
}

export interface ClientIdentityInput {
  transport: string;
  userAgent?: string;
  apiKeyName?: string;
  apiKeyId?: number;
  sessionEmail?: string;
}

export interface ClientIdentity {
  /** Stable `<slug>=<uuid>` identity, safe as a single route segment. */
  id: string;
  name: string;
  version?: string;
  authType: ClientAuthType;
  userAgent?: string;
  apiKeyId?: number;
}

/**
 * Resolve one sighting to its stable identity. Authenticated callers
 * key on stable account material: API key names survive client updates,
 * session emails survive reconnects. Anonymous callers key on the full
 * user-agent; a version bump mints a fresh id while the stale row ages
 * out by last-seen ordering. Identity labels are display only - auth
 * still comes from sessions and API keys, never from these.
 */
export function identifyClient(input: ClientIdentityInput): ClientIdentity {
  if (input.apiKeyName && input.apiKeyName.trim().length > 0) {
    const name = slugifyClientName(input.apiKeyName);
    const key = `apikey:${input.apiKeyName.trim().toLowerCase()}`;
    return {
      id: `${name}=${uuidv5(key)}`,
      name,
      ...(input.apiKeyId !== undefined ? { apiKeyId: input.apiKeyId } : {}),
      authType: "api_key",
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    };
  }
  if (input.sessionEmail && input.sessionEmail.trim().length > 0) {
    const key = `session:${input.sessionEmail.trim().toLowerCase()}`;
    return {
      id: `session=${uuidv5(key)}`,
      name: "session",
      authType: "session",
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    };
  }
  const parsed = parseClientName(input.userAgent);
  const key = input.userAgent ? `ua:${input.userAgent}` : `transport:${input.transport}:anonymous`;
  return {
    id: `${parsed.name}=${uuidv5(key)}`,
    name: parsed.name,
    ...(parsed.version !== undefined ? { version: parsed.version } : {}),
    authType: "anonymous",
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
  };
}
