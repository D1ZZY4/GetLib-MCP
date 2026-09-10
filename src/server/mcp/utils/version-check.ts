import { SERVER_VERSION, NPM_REGISTRY_URL } from "../constants";
import { fetchWithTimeout, readBodyCapped } from "../services/http/request";
import { externalSchemas, parseJsonExternal } from "./validate-external";
import { log } from "./logger";

let cachedLatest: { version: string; checkedAt: number } | null = null;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function getLatestVersion(): Promise<string | null> {
  if (cachedLatest && Date.now() - cachedLatest.checkedAt < CHECK_INTERVAL_MS) {
    return cachedLatest.version;
  }
  try {
    // Centralized fetch boundary: timeout, redirect policy, semaphore, and
    // SSRF guard in one place instead of a bespoke AbortController here.
    const res = await fetchWithTimeout(`${NPM_REGISTRY_URL}/getlib-mcp/latest`, 5_000, {
      Accept: "application/json",
    });
    if (!res.ok) return null;
    // Cap the body before parsing - an unbounded res.json() lets a
    // compromised mirror exhaust memory with a huge payload.
    const text = await readBodyCapped(res, 64 * 1024);
    if (text === null) return null;
    const data = parseJsonExternal(externalSchemas.versionCheck, text);
    if (typeof data?.version === "string" && /^\d+\.\d+\.\d+/.test(data.version)) {
      cachedLatest = { version: data.version, checkedAt: Date.now() };
      return data.version;
    }
  } catch (error) {
    // network error - structured log and stay silent to the caller
    log({ level: "debug", msg: "version-check.failed", error: error instanceof Error ? error.message : String(error) });
  }
  return null;
}

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => (v.replace(/^v/, "").split("-")[0] ?? "").split(".").map(Number);
  const [lMaj = 0, lMin = 0, lPat = 0] = parse(latest);
  const [cMaj = 0, cMin = 0, cPat = 0] = parse(current);
  if (!Number.isFinite(lMaj) || !Number.isFinite(cMaj)) return false;
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

export async function checkForUpdate(): Promise<string | null> {
  const latest = await getLatestVersion();
  if (!latest) return null;
  if (isNewerVersion(latest, SERVER_VERSION)) {
    return latest;
  }
  return null;
}

let pendingUpdateVersion: string | null = null;

export function setPendingUpdate(version: string): void {
  pendingUpdateVersion = version;
}

export function getUpdateNoticeForResponse(): string {
  if (!pendingUpdateVersion) return "";
  return `\n\n---\n> [UPDATE AVAILABLE] GetLib v${pendingUpdateVersion} is out (you have v${SERVER_VERSION}). Restart your MCP client to get the latest version automatically via npx.`;
}

export function formatUpdateNotice(latestVersion: string): string {
  return `[UPDATE AVAILABLE] GetLib v${latestVersion} is out (you have v${SERVER_VERSION}). Run: npx getlib-mcp@latest`;
}
