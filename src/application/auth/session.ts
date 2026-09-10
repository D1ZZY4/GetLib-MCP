import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { config } from "@/server/mcp/config";
import { detectEnvironment } from "@/server/mcp/runtime";
import { normalizeEmail } from "@/domain/auth/policy";
import { log } from "@/server/mcp/utils/logger";

/**
 * Session boundary for authenticated management and MCP access.
 *
 * When authentication is disabled every caller proceeds with an explicit
 * anonymous context (rules #25). When enabled, callers present either the
 * session token issued by POST /api/management/auth/signin (as the
 * getlib_session HttpOnly cookie for the dashboard, or an Authorization:
 * Bearer token for scripts) or a long-lived API key (Authorization:
 * Bearer glk_..., managed on the API keys page). Session tokens are
 * stateless HMAC-SHA256 over email + expiry, so they validate on every
 * serverless instance without shared storage; API keys verify against
 * stored hashes through the injected seam.
 */

export const SESSION_COOKIE = "getlib_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const UNAUTHORIZED_MESSAGE = "Authentication is required for this endpoint.";
export const SESSION_SECRET_MISSING_MESSAGE = "Session signing is not configured.";

export class UnauthorizedError extends Error {
  constructor(message: string = UNAUTHORIZED_MESSAGE) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

let fallbackSecret: Buffer | null = null;

export class SessionSecretMissingError extends Error {
  constructor() {
    super(SESSION_SECRET_MISSING_MESSAGE);
    this.name = "SessionSecretMissingError";
  }
}

function signingSecret(): Buffer {
  if (config.sessionSecret) return Buffer.from(config.sessionSecret, "utf-8");
  if (detectEnvironment() === "production" && config.authEnabled) {
    throw new SessionSecretMissingError();
  }
  if (!fallbackSecret) {
    fallbackSecret = randomBytes(32);
    log({
      level: "warn",
      msg: "auth.session.ephemeral-secret",
      detail:
        "GETLIB_SESSION_SECRET is unset - sessions validate on this process only. Set it for multi-instance production.",
    });
  }
  return fallbackSecret;
}

function sign(email: string, expiresAt: number): string {
  return createHmac("sha256", signingSecret()).update(`${email}.${expiresAt}`).digest("hex");
}

export function createSessionToken(email: string, now: number = Date.now()): string {
  // Normalized before signing so "Ops@X" and "ops@x" are one identity,
  // matching password verification. Idempotent for clean addresses.
  const normalized = normalizeEmail(email);
  const expiresAt = now + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ email: normalized, exp: expiresAt }), "utf-8").toString(
    "base64url",
  );
  return `v1.${payload}.${sign(normalized, expiresAt)}`;
}

export function verifySessionToken(token: string, now: number = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, payload, signature] = parts as [string, string, string];
  let parsed: { email?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
      email?: unknown;
      exp?: unknown;
    };
  } catch {
    return null;
  }
  if (typeof parsed.email !== "string" || typeof parsed.exp !== "number") return null;
  if (!Number.isFinite(parsed.exp) || parsed.exp <= now) return null;
  // Normalized before verifying so issuance and verification agree on
  // one identity per account. Tokens minted before normalization with a
  // non-normalized address stop validating here and the owner simply
  // signs in again (12h TTL bounds the transition).
  const email = normalizeEmail(parsed.email);
  const expected = Buffer.from(sign(email, parsed.exp), "utf-8");
  const actual = Buffer.from(signature, "utf-8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return email;
}

function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer (.+)$/.exec(header.trim());
  return match?.[1] ? match[1].trim() : null;
}

/** Email from a valid session token, or null when absent/invalid/expired. */
export function sessionEmailFromRequest(req: Request, now: number = Date.now()): string | null {
  const token = cookieValue(req, SESSION_COOKIE) ?? bearerToken(req);
  if (!token) return null;
  return verifySessionToken(token, now);
}

export interface AuthContext {
  /** Authenticated identity, or null for the explicit anonymous context. */
  email: string | null;
  /** Present only when the caller authenticated with an API key. */
  apiKey?: { id: number; name: string };
}

/**
 * Capability seams of the auth boundary. API key verification goes
 * through the injected seam; session tokens stay stateless and
 * database-free.
 */
export interface ApiKeyAuthDeps {
  verifyApiKey: (presentedKey: string) => Promise<{ id: number; name: string } | null>;
}

/**
 * Management/MCP authorization boundary. Auth-disabled mode always
 * allows with an anonymous context. Auth-enabled mode accepts a valid
 * session first (cookie or Bearer, stateless), then a Bearer API key
 * (revocable, hash-verified), and throws UnauthorizedError (mapped to
 * 401) otherwise. The failure never reveals which credential was wrong.
 */
export async function requireManagementAuth(req: Request, deps: ApiKeyAuthDeps): Promise<AuthContext> {
  if (!config.authEnabled) return { email: null };
  // Cookie session wins over Bearer API key when a client presents both:
  // an interactive user session is the stronger identity signal, and
  // dual-credential requests are pathological, never routine.
  const email = sessionEmailFromRequest(req);
  if (email) return { email };
  const bearer = bearerToken(req);
  if (bearer) {
    const apiKey = await deps.verifyApiKey(bearer);
    if (apiKey) return { email: null, apiKey };
  }
  throw new UnauthorizedError();
}

export function sessionCookieAttributes(): string {
  const secure = detectEnvironment() === "production" ? "; Secure" : "";
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

/**
 * Full Set-Cookie value that deletes the session cookie. Mirrors
 * sessionCookieAttributes (including Secure in production) so browsers
 * actually drop the cookie instead of keeping the Secure one alive.
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${sessionCookieAttributes().replace(
    /Max-Age=\d+/,
    "Max-Age=0",
  )}`;
}
