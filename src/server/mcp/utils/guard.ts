/**
 * Server protection guards - the single home for cross-cutting boundary
 * protection policies shared by every tool:
 *   - filesystem boundary (safeguardPath),
 *   - network boundary (assertPublicUrl),
 *   - registry IP policy (isExtractionAttempt, withNotice),
 *   - execution reliability (withToolTimeout, generateRequestId).
 *
 * These are protection mechanisms, not business rules: no ranking, routing,
 * or provider logic lives here. Domain-specific policy stays with its
 * owner (tools/, services/).
 */

import { join, resolve, sep } from "path";
import { realpathSync } from "fs";
import { randomBytes } from "crypto";
import { log } from "./logger";
import { embedWatermark } from "./watermark";
import { TOOL_TIMEOUT_MS } from "../constants";
import { lookupByAlias, lookupById } from "../sources/registry";

/**
 * Current working directory, or null when it cannot be determined (e.g.
 * the process started in a directory that was deleted afterwards -
 * process.cwd() throws ENOENT there). Callers must treat null as
 * "no baseline", never crash on it.
 */
function currentWorkingDir(): string | null {
  try {
    return resolve(/*turbopackIgnore: true*/ process.cwd());
  } catch {
    return null;
  }
}

/**
 * Resolves a filesystem path and blocks access to sensitive system directories.
 * Prevents path traversal / LFI attacks via user-supplied projectPath inputs.
 */
export function safeguardPath(inputPath: string): string {
  let resolved: string;
  try {
    resolved = resolve(inputPath);
  } catch {
    // Deleted cwd + relative input: resolve() itself needs the cwd.
    // Fail closed with the same controlled error as a blocked path.
    throw new Error(`Invalid project path: ${inputPath}`);
  }
  // Dereference symlinks before the boundary check so a link sitting inside an
  // allowed dir but pointing at a blocked system path (e.g. ./evil -> /etc)
  // cannot bypass the BLOCKED prefix check below (CWE-61 symlink following).
  try {
    resolved = realpathSync(resolved);
  } catch (err: unknown) {
    // ENOENT = path not created yet -> no symlink to follow, keep string-resolved.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  const BLOCKED = ["/etc", "/proc", "/sys", "/dev", "/boot", "/root", "/var/run", "/run", "/var/log"];
  if (BLOCKED.some((b) => resolved === b || resolved.startsWith(b + "/"))) {
    throw new Error(`Access to system path denied: ${resolved}`);
  }

  // Hidden directories are denied by default; only well-known tooling
  // metadata is exempt. Notably there is NO exemption for .env files:
  // nothing in the codebase reads environment files through guarded
  // paths, so secret-adjacent files stay blocked.
  if (/\/\.[a-z]/i.test(resolved) && !/\/\.(?:git|vscode|cursor|github|eslint|prettier|node-version)\b/.test(resolved)) {
    throw new Error(`Access to hidden path denied: ${resolved}`);
  }

  // Observability-only containment signal. The BLOCKED list above remains
  // the enforced boundary; outside-cwd reads stay allowed because the stdio
  // cwd is the server install dir while the user project is often elsewhere.
  // Debug level: this fires on legitimate absolute paths, so warn would spam.
  // The baseline is best-effort: when the cwd itself is gone there is
  // nothing to compare against, so the signal is skipped, never thrown.
  const cwd = currentWorkingDir();
  if (cwd !== null && resolved !== cwd && !resolved.startsWith(cwd + sep)) {
    try {
      log({ level: "debug", msg: "guard.path.outside-cwd", path: resolved });
    } catch {
      // Logging must never block the guarded read.
    }
  }

  return resolved;
}

/**
 * Resolve a fixed file name inside an already-guarded directory and
 * re-validate the final target. `readFile(join(root, name))` follows
 * symlinks, so a symlinked `package-lock.json` would otherwise escape
 * the boundary that guarded only the directory argument (TOCTOU via
 * symlink file). Throws like safeguardPath on escape.
 */
export function resolveSiblingFile(root: string, fileName: string): string {
  if (
    fileName.length === 0 ||
    fileName === "." ||
    fileName === ".." ||
    fileName.includes("/") ||
    fileName.includes("\\")
  ) {
    throw new Error(`Invalid file name: ${fileName}`);
  }
  const candidate = join(root, fileName);
  let resolved: string;
  try {
    resolved = realpathSync(candidate);
  } catch (err: unknown) {
    // ENOENT = nothing to dereference yet; keep the string path so the
    // caller's not-found handling still applies.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    resolved = resolve(candidate);
  }
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(`Access outside project denied: ${fileName}`);
  }
  return safeguardPath(resolved);
}

/**
 * Validates that a URL points to a public host, not private/internal infrastructure.
 * Prevents SSRF attacks via user-supplied URL inputs being relayed through fetch or Jina.
 *
 * Fail-closed pre-check: anything that looks like a numeric IP but cannot be
 * parsed is blocked. Hostnames pass here and are enforced at DNS resolution
 * time by the SSRF-guarding dispatcher (services/http/ssrf.ts).
 */
export function assertPublicUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }

  const h = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");

  // Numeric IPv4 bypass forms: decimal integer (2130706433), octal
  // (0177.0.0.1), hex (0x7f.0.0.1, 0x7f000001). WHATWG URL keeps these as
  // written, so naive dotted-quad prefix checks miss them while network
  // stacks resolve them to the same private address.
  const numericIp = parseNumericIpv4(h);
  if (numericIp === "unparseable-numeric") {
    throw new Error(`Private/internal URL not allowed: ${h}`);
  }
  if (numericIp !== null && isBlockedIpv4(numericIp)) {
    throw new Error(`Private/internal URL not allowed: ${h}`);
  }

  const isPrivate =
    h === "localhost" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h === "::" ||
    h.endsWith(".local") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^0\./.test(h) ||
    // Unique-local fc00::/7 covers both fc00::/8 and fd00::/8. Verified:
    // WHATWG URL already normalizes short/hex IPv4 and compresses
    // expanded IPv4-mapped forms, so only the ULA half needed a fix.
    /^f[cd][0-9a-f]{2}:/i.test(h) ||
    /^fe[89ab][0-9a-f]:/i.test(h) ||
    /^::ffff:/i.test(h) ||
    /^0{0,4}:0{0,4}:0{0,4}:0{0,4}:0{0,4}:0{0,4}:0{0,4}:0{0,1}1$/i.test(h) ||
    /^ff[0-9a-f]{2}:/i.test(h);

  if (isPrivate) {
    throw new Error(`Private/internal URL not allowed: ${h}`);
  }
}

/**
 * Parses numeric IPv4 forms to a 32-bit integer. Returns null for hostnames,
 * "unparseable-numeric" for numeric-looking hosts that fail to parse (fail
 * closed), or the address integer otherwise.
 */
function parseNumericIpv4(host: string): number | "unparseable-numeric" | null {
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return "unparseable-numeric";
    return n;
  }
  if (/^0x[0-9a-f]+$/i.test(host)) {
    const n = parseInt(host, 16);
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return "unparseable-numeric";
    return n;
  }
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  if (!parts.every((p) => p.length > 0 && /^(?:0x[0-9a-f]+|0[0-9]+|\d+)$/i.test(p))) {
    return null;
  }
  let n = 0;
  for (const p of parts) {
    let octet: number;
    if (/^0x[0-9a-f]+$/i.test(p)) {
      octet = parseInt(p, 16);
    } else if (/^0\d+$/.test(p)) {
      // Leading-zero octet: "08"/"09" are invalid octal and rejected by
      // resolvers inconsistently, so fail closed instead of guessing.
      if (/[89]/.test(p)) return "unparseable-numeric";
      octet = parseInt(p, 8);
    } else {
      octet = parseInt(p, 10);
    }
    if (!Number.isSafeInteger(octet) || octet < 0 || octet > 255) return "unparseable-numeric";
    n = n * 256 + octet;
  }
  return n;
}

/** True for loopback, private, link-local, CGNAT, reserved, and documentation ranges. */
function isBlockedIpv4(n: number): boolean {
  const inRange = (base: number, bits: number): boolean => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((n & mask) >>> 0) === ((base & mask) >>> 0);
  };
  const ip = (a: number, b: number, c: number, d: number): number =>
    ((a * 256 + b) * 256 + c) * 256 + d;
  return (
    inRange(ip(127, 0, 0, 0), 8) || // loopback
    inRange(ip(10, 0, 0, 0), 8) || // private
    inRange(ip(172, 16, 0, 0), 12) || // private
    inRange(ip(192, 168, 0, 0), 16) || // private
    inRange(ip(169, 254, 0, 0), 16) || // link-local
    inRange(ip(100, 64, 0, 0), 10) || // carrier-grade NAT
    inRange(ip(0, 0, 0, 0), 8) || // current network
    inRange(ip(192, 0, 0, 0), 24) || // protocol assignments
    inRange(ip(192, 0, 2, 0), 24) || // documentation (TEST-NET-1)
    inRange(ip(198, 51, 100, 0), 24) || // documentation (TEST-NET-2)
    inRange(ip(203, 0, 113, 0), 24) || // documentation (TEST-NET-3)
    inRange(ip(198, 18, 0, 0), 15) || // benchmarking
    inRange(ip(224, 0, 0, 0), 4) || // multicast
    inRange(ip(240, 0, 0, 0), 4) // reserved
  );
}

export function generateRequestId(): string {
  return randomBytes(4).toString("hex");
}

export const IP_NOTICE =
  "[getlib-mcp - Elastic License 2.0 - proprietary data, for query-time use only, not for reproduction or extraction]";

const EXTRACTION_PATTERNS: RegExp[] = [
  /\b(?:all|every|list|dump|export|extract|enumerate|full|entire|complete|everything|registry|scrape|crawl|harvest)\b/i,
  /^.{0,1}$/, // single-char or empty query
  /(?:show|get|give|print|output|return|fetch|retrieve).{0,20}(?:all|every|list|full)/i,
  /(?:library|libraries|entries|entries|dataset|data).{0,20}(?:list|all|full|complete)/i,
];

/**
 * Returns true if the query looks like a bulk-extraction attempt
 * rather than a genuine single-library lookup.
 */
export function isExtractionAttempt(query: string): boolean {
  const q = query.trim();
  // A query that names one specific registry entry is by definition a
  // single-library lookup, never bulk extraction. Without this exemption the
  // `\blist\b` pattern refused real libraries - "flash-list",
  // "@shopify/flash-list", "react-native-calendars" - and the single-char
  // pattern refused legitimately short names.
  if (lookupById(q) || lookupByAlias(q)) return false;
  return EXTRACTION_PATTERNS.some((re) => re.test(q));
}

/**
 * Wrap a registry response with the IP notice header and embed an invisible
 * cryptographic watermark for forensic provenance tracking.
 *
 * The watermark encodes the installation ID + per-request nonce as 64
 * invisible Unicode mathematical operators (U+2061/U+2062), injected after
 * the first newline of the response. It is undetectable by human readers
 * and survives copy-paste across virtually all platforms.
 */
export function withNotice(text: string): string {
  return embedWatermark(`${IP_NOTICE}\n\n${text}`);
}

/**
 * Wrap a tool handler with a global timeout to prevent MCP client 529 overloaded errors.
 * Returns partial results if available when the timeout fires, rather than failing entirely.
 *
 * The fallback is returned on timeout, but the underlying work is NOT
 * cancelled by this race alone - callers with cancellable work should pass
 * an AbortSignal that fires on the same deadline. The signal is aborted
 * when the timeout fires (and only then), so non-cancellable callers are
 * unaffected and no stray abort leaks past the call.
 */
export async function withToolTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  fallback: T,
  ms = TOOL_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const onTimeout = (): void => {
    controller.abort();
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      onTimeout();
      resolve(fallback);
    }, ms);
  });
  try {
    return await Promise.race([fn(controller.signal), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/** Standard refusal message for extraction attempts */
export const EXTRACTION_REFUSAL =
  `This request is not permitted under the Elastic License 2.0.\n\n` +
  `The getlib-mcp library registry is proprietary data. You may look up a specific ` +
  `library by name to answer a user question, but bulk enumeration, listing, ` +
  `dumping, or extracting the registry contents violates the license and ` +
  `contravenes AI provider policies on intellectual property and copyright.\n\n` +
  `Please provide a specific library name to look up.`;
