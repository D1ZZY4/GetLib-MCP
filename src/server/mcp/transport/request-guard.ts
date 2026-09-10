import { config } from "../config";
import { log } from "../utils/logger";

/**
 * Transport request guard - thin protocol-boundary validation shared by
 * Streamable HTTP and SSE routes. Owns only transport concerns:
 * origin/host validation, auth-context resolution, and fail-closed
 * rejection of forged or oversized requests.
 *
 * No business logic, provider calls, or tool execution live here.
 */

export class OriginRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OriginRejectedError";
  }
}

function allowedHosts(): string[] {
  const hosts: string[] = [];
  if (config.vercelUrl) hosts.push(config.vercelUrl.toLowerCase());
  for (const entry of config.allowedHosts) hosts.push(entry);
  return hosts;
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

/**
 * Fail-closed origin/host validation for browser-carried MCP requests.
 * Non-browser clients (no Origin header) pass through; forged cross-site
 * origins are rejected. Same-host and localhost origins always pass.
 */
export function assertAllowedOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new OriginRejectedError("Invalid Origin header.");
  }
  let requestHost = "";
  try {
    requestHost = new URL(req.url).hostname.toLowerCase();
  } catch {
    requestHost = "";
  }
  const originHost = originUrl.hostname.toLowerCase();
  if (originHost === requestHost || isLocalHost(originHost)) return;
  const allowList = allowedHosts();
  if (allowList.includes(originHost)) return;
  log({ level: "warn", msg: "mcp.transport.origin-rejected", origin: originHost });
  throw new OriginRejectedError("Origin is not allowed for this MCP endpoint.");
}

/**
 * Host-observability companion to the Origin gate above. The Host header
 * is NOT enforced: legitimate deployments sit behind proxies and custom
 * domains that operator allowlists may not enumerate, so rejecting here
 * would break them silently. When the operator did configure expected
 * hosts, anything else is logged (debug) for DNS-rebinding watchers.
 */
export function noteUnexpectedHost(req: Request): void {
  const known = allowedHosts();
  if (known.length === 0) return;
  let host = "";
  try {
    host = new URL(req.url).hostname.toLowerCase();
  } catch {
    return;
  }
  if (host === "" || isLocalHost(host) || known.includes(host)) return;
  log({ level: "debug", msg: "mcp.transport.unexpected-host", host });
}
