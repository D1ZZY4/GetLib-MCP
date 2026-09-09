import { config } from "../config";

type LogLevel = "debug" | "info" | "warn" | "error";

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
const SENSITIVE_KEYS = new Set([
  "password",
  "pass",
  "passwd",
  "pwd",
  "token",
  "secret",
  "authorization",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "client_secret",
  "private_key",
]);

const BEARER_PATTERN = /Bearer [A-Za-z0-9\-._~+/=]+/g;

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) return "[redacted]";
  if (typeof value === "string") {
    const scrubbed = value.replace(BEARER_PATTERN, "Bearer [redacted]");
    return scrubbed === value ? value : scrubbed;
  }
  return value;
}

function redactEntry(entry: LogEntry): LogEntry {
  const clean: LogEntry = { level: entry.level, msg: entry.msg };
  for (const key of Object.keys(entry)) {
    if (key === "level" || key === "msg") continue;
    clean[key] = redactValue(key, entry[key]);
  }
  return clean;
}

export function log(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;
  const safe = redactEntry(entry);

  if (config.logFormat === "json") {
    const { level, msg, ...rest } = safe;
    console.error(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...rest }));
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
    console.error(parts.join(" "));
  }
}
