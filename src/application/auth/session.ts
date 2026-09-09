import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { config } from "@/server/mcp/config";
import { detectEnvironment } from "@/server/mcp/runtime";
import { log } from "@/server/mcp/utils/logger";

/**
 * Session boundary for authenticated management and MCP access.
 *
 * When authentication is disabled every caller proceeds with an explicit
 * anonymous context (rules #25). When enabled, callers present the session
 * token issued by POST /api/management/auth/signin, either as the
 * getlib_session HttpOnly cookie (dashboard) or an Authorization: Bearer
 * token (MCP clients, scripts). Tokens are stateless HMAC-SHA256 over
 * email + expiry, so they validate on every serverless instance without
 * shared storage.
 */

export const SESSION_COOKIE = "getlib_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export class UnauthorizedError extends Error {
  constructor(message = "Authentication is required for this endpoint.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

let fallbackSecret: Buffer | null = null;

export class SessionSecretMissingError extends Error {
  constructor() {
    super("GETLIB_SESSION_SECRET is required in production when authentication is enabled.");
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
  const expiresAt = now + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ email, exp: expiresAt }), "utf-8").toString(
    "base64url",
  );
  return `v1.${payload}.${sign(email, expiresAt)}`;
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
  const expected = Buffer.from(sign(parsed.email, parsed.exp), "utf-8");
  const actual = Buffer.from(signature, "utf-8");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return parsed.email;
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
}

/**
 * Management/MCP authorization boundary. Auth-disabled mode always
 * allows with an anonymous context. Auth-enabled mode requires a valid
 * session and throws UnauthorizedError (mapped to 401) otherwise.
 */
export function requireManagementAuth(req: Request): AuthContext {
  if (!config.authEnabled) return { email: null };
  const email = sessionEmailFromRequest(req);
  if (!email) {
    throw new UnauthorizedError();
  }
  return { email };
}

export function sessionCookieAttributes(): string {
  const secure = detectEnvironment() === "production" ? "; Secure" : "";
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}
