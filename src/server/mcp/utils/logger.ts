import { config } from "../config";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogStreamMode = "stderr" | "split";

// Default is protocol-safe: the stdio transport reserves stdout for MCP
// messages, so every level goes to stderr unless a host explicitly opts
// into split mode. Vercel maps stderr lines to level:error, which buried
// real errors under info noise - the Next.js instrumentation hook below
// switches to split so info/debug land on stdout there.
let streamMode: LogStreamMode = "stderr";

/**
 * Select where log lines are written. stdio entry keeps "stderr";
 * server runtimes (Next.js instrumentation) use "split" so platform
 * log levels stay truthful (info/debug to stdout, warn/error to
 * stderr). Test-only callers must restore the previous mode.
 */
export function setLogStreamMode(mode: LogStreamMode): void {
  streamMode = mode;
}

function writeLine(line: string, level: LogLevel): void {
  if (streamMode === "split" && (level === "debug" || level === "info")) {
    console.log(line);
  } else {
    console.error(line);
  }
}

export interface LogEntry {
  level: LogLevel;
  msg: string;
  tool?: string;
  requestId?: string;
  durationMs?: number;
  cacheHit?: boolean;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[config.logLevel];
}

// Field names that must never reach logs in readable form. Values under
// these keys are replaced before either output format renders them.
// Lookup strips separators so snake_case, camelCase, and kebab-case spell
// the same secret (accessToken and access_token both match "accesstoken").
const SENSITIVE_KEYS = new Set([
  "password",
  "pass",
  "passwd",
  "pwd",
  "token",
  "secret",
  "session",
  "cookie",
  "set-cookie",
  "authorization",
  "api_key",
  "apikey",
  "api-key",
  "x-api-key",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "client_secret",
  "clientsecret",
  "github_token",
  "githubtoken",
  "install_id",
  "installid",
  "installation_id",
  "installationid",
  "private_key",
  "privatekey",
  "auth_token",
  "authtoken",
  "user_email",
  "useremail",
  "account",
  "key_hash",
  "keyhash",
  "password_hash",
  "passwordhash",
  "key_prefix",
  "keyprefix",
  "presented_key",
  "presentedkey",
  "session_token",
  "sessiontoken",
  "email",
]);

function sensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ""));
}

const BEARER_PATTERN = /Bearer [A-Za-z0-9\-._~+/=]+/g;
const BASIC_PATTERN = /Basic [A-Za-z0-9\-._~+/=]+/g;
// Long-lived API keys in free text: glk_<base64url> outside an
// Authorization header (which BEARER_PATTERN already covers).
const API_KEY_PATTERN = /\bglk_[A-Za-z0-9_-]+\b/g;
// Header-style credentials in free text: api_key: <value>, x-api-key=<value>.
const HEADER_KEY_PATTERN = /((?:api[_-]?key|x-api-key)\s*[:=]\s*)['"]?[A-Za-z0-9\-._~+/=]+['"]?/gi;
// Query-string secrets in logged URLs: ?token=<value>&api_key=<value>.
const QUERY_TOKEN_PATTERN = /([?&](?:token|api_key|apikey|access_token|refresh_token|secret|client_secret|github_token|client_id|password|passwd|auth|session|code|key)=)[^&\s"']*/gi;

const REDACT_MAX_DEPTH = 5;

function redactValue(key: string, value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (sensitiveKey(key)) return "[redacted]";
  if (typeof value === "string") {
    return value
      .replace(BEARER_PATTERN, "Bearer [redacted]")
      .replace(BASIC_PATTERN, "Basic [redacted]")
      .replace(API_KEY_PATTERN, "glk_[redacted]")
      .replace(HEADER_KEY_PATTERN, "$1[redacted]")
      .replace(QUERY_TOKEN_PATTERN, "$1[redacted]");
  }
  if (value instanceof Error) {
    // Error messages often embed URLs, tokens, or session values from the
    // failing operation. Redact them with the same string rules instead of
    // passing the instance through untouched.
    const message = redactValue("", value.message, seen, depth + 1);
    return message;
  }
  if (Array.isArray(value)) {
    if (depth >= REDACT_MAX_DEPTH || seen.has(value)) return "[redacted]";
    seen.add(value);
    return value.map((item) => redactValue("", item, seen, depth + 1));
  }
  if (typeof value === "object" && value !== null) {
    // Class instances (Error, Date, Buffer...) keep their current
    // rendering untouched - only plain data objects are traversed.
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    if (depth >= REDACT_MAX_DEPTH || seen.has(value)) return "[redacted]";
    seen.add(value);
    const clean: Record<string, unknown> = {};
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      clean[nestedKey] = redactValue(nestedKey, nestedValue, seen, depth + 1);
    }
    return clean;
  }
  return value;
}

function redactEntry(entry: LogEntry): LogEntry {
  const seen = new WeakSet<object>();
  const clean: LogEntry = { level: entry.level, msg: entry.msg };
  for (const key of Object.keys(entry)) {
    if (key === "level" || key === "msg") continue;
    clean[key] = redactValue(key, entry[key], seen, 0);
  }
  return clean;
}

export function log(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;
  const safe = redactEntry(entry);

  if (config.logFormat === "json") {
    const { level, msg, ...rest } = safe;
    writeLine(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...rest }), level);
  } else {
    // Collapse CR/LF so untrusted strings (fetched URLs, error messages) cannot
    // forge extra log lines (log injection) in the line-oriented text format.
    const oneLine = (s: string): string => s.replace(/[\r\n]+/g, " ");
    const parts = [`[${safe.level}] ${oneLine(safe.msg)}`];
    if (safe.tool) parts.push(`tool=${oneLine(String(safe.tool))}`);
    if (safe.requestId) parts.push(`req=${oneLine(String(safe.requestId))}`);
    if (safe.durationMs !== undefined) parts.push(`${safe.durationMs}ms`);
    if (safe.cacheHit !== undefined) parts.push(safe.cacheHit ? "cache=hit" : "cache=miss");
    // Render remaining structured fields (url, error, domain, status, ...) so the
    // default text format keeps the debug context JSON mode already carries.
    const KNOWN = new Set(["level", "msg", "tool", "requestId", "durationMs", "cacheHit"]);
    for (const key of Object.keys(safe)) {
      if (KNOWN.has(key)) continue;
      const v = safe[key];
      if (v === undefined) continue;
      parts.push(`${key}=${oneLine(typeof v === "string" ? v : JSON.stringify(v))}`);
    }
    writeLine(parts.join(" "), safe.level);
  }
}
