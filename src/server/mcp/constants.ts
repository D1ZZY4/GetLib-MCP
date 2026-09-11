import { config } from "./config";

export const SERVER_NAME = "getlib-mcp";
export const SERVER_VERSION = "1.3.1";

// Tool counts are always derived from the registry (listTools().length)
// so they cannot silently drift when a tool is added or removed.

export const CHARS_PER_TOKEN = 3.8;

// Disk cache directory for persistent cross-invocation caching.
// Resolved through the centralized config boundary (config.cacheDir);
// the system-directory guard below stays here so misconfiguration
// fails fast at import time.
const _rawCacheDir = config.cacheDir;
const _SYSTEM_DIRS = ["/etc", "/proc", "/sys", "/dev", "/boot", "/root", "/bin", "/sbin", "/usr", "/var/run", "/run", "/var/log"];
if (_SYSTEM_DIRS.some((d) => _rawCacheDir === d || _rawCacheDir.startsWith(d + "/"))) {
  throw new Error(`GETLIB_CACHE_DIR must not point to a system directory: ${_rawCacheDir}`);
}
export const DISK_CACHE_DIR = _rawCacheDir;

export const DEFAULT_TOKEN_LIMIT = config.tokenLimit;
export const MAX_TOKEN_LIMIT = config.maxTokenLimit;
export const CACHE_TTL_MS = config.cacheTtlMs;

export const CACHE_TTLS = {
  LLMS_TXT: 30 * 60 * 1000,
  DOCS_PAGE: 60 * 60 * 1000,
  GITHUB_README: 60 * 60 * 1000,
  GITHUB_RELEASES: 6 * 60 * 60 * 1000,
  PACKAGE_METADATA: 60 * 60 * 1000,
  DEVDOCS: 24 * 60 * 60 * 1000,
  SITEMAP: 24 * 60 * 60 * 1000,
  CHANGELOG: 6 * 60 * 60 * 1000,
  JINA_RESULT: 60 * 60 * 1000,
  SEARCH_RESULT: 30 * 60 * 1000,
  WEB_SEARCH: 15 * 60 * 1000,
  RESOLVE: 2 * 60 * 60 * 1000,
} as const;
export const FETCH_TIMEOUT_MS = config.fetchTimeoutMs;

export const SWR_STALE_TTL_MS = config.swrStaleTtlMs;
export const CIRCUIT_BREAKER_THRESHOLD = config.circuitBreakerThreshold;
export const CIRCUIT_BREAKER_RESET_MS = config.circuitBreakerResetMs;
export const DEEP_FETCH_MAX_PAGES = config.deepFetchMaxPages;
export const DEEP_FETCH_RELEVANCE_THRESHOLD = config.deepFetchRelevanceThreshold;
export const DEEP_FETCH_TIMEOUT_MS = config.deepFetchTimeoutMs;
export const MAX_CONCURRENT_FETCHES = config.maxConcurrentFetches;
export const TOOL_TIMEOUT_MS = config.toolTimeoutMs;

/**
 * Shared singleflight pipeline budget for search and snippet rebuilds.
 * Kept comfortably below the outer tool timeout so the outer per-caller
 * race never decides the outcome first. One implementation so parallel
 * pipelines cannot drift into different timeout behavior.
 */
export function sharedPipelineBudgetMs(outerTimeoutMs: number = TOOL_TIMEOUT_MS): number {
  const outer =
    typeof outerTimeoutMs === "number" && Number.isFinite(outerTimeoutMs)
      ? outerTimeoutMs
      : 55_000;
  return Math.max(10_000, Math.min(45_000, outer - 5_000));
}

export const JINA_BASE_URL = "https://r.jina.ai";
export const NPM_REGISTRY_URL = "https://registry.npmjs.org";
export const PYPI_URL = "https://pypi.org/pypi";
export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_RAW_URL = "https://raw.githubusercontent.com";

// Prompt injection guard patterns - strip suspicious LLM instruction attempts from fetched content
export const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /you\s+(are|must|should|will|have\s+to)\s+now/gi,
  /\bSYSTEM\s*:/g,
  /\bASSISTANT\s*:/g,
  /\b(JAILBREAK|DAN|DO ANYTHING NOW)\b/gi,
  /<\s*(?:system|instructions?)\s*>/gi,
  /forget\s+(everything|all)\s+(you|your)/gi,
  /new\s+instructions?.*?:/gi,
  /override\s+(your\s+)?(previous\s+)?instructions?/gi,
  // Modern injection vectors
  /<!--[\s\S]*?-->/g,
  /[\u202A-\u202E\u2066-\u2069]/g,
  /\bact\s+as\b.{0,50}(?:you are|you're|an?\s+ai|a\s+model)/gi,
  /\bpretend\s+(?:you\s+are|to\s+be)\b/gi,
  /\bfrom\s+now\s+on\b.{0,30}(?:you|ignore|forget)/gi,
  // ChatML / special token delimiters
  /<\|(?:im_|system|user|assistant|endoftext)[_a-z]*\|?>/gi,
  // Markdown image exfiltration attempts (incl. modern OAST / callback platforms)
  /!\[.*?\]\(https?:\/\/[^)]*(?:exfil|steal|leak|callback|webhook|requestbin|hookbin|burp|interact\.sh|oast\.(?:me|site|fun|live|pro)|canarytokens|pipedream\.net|ngrok(?:\.io|-free\.app)|webhook\.site|beeceptor)[^)]*\)/gi,
  // Tool/function override attempts - scoped to delimiter / role-key usage so
  // legitimate prose references (e.g. ".tool_calls" in OpenAI/MCP API docs) survive.
  /(?:^|<)\s*(?:tool_call|function_call|tool_result)\s*(?:>|\s*:\s*"(?:tool|function))/gim,
  // Claude / Llama role delimiters + instruction-exfiltration prompts
  /\bHUMAN\s*:/g,
  /<\|(?:begin_of_text|eot_id|start_header_id|end_header_id)[^|]*\|>/gi,
  /(?:reveal|print|show|output|display)\s+your\s+(?:instructions?|system\s+prompt|context|prompt)/gi,
  /repeat\s+(?:the\s+following|after\s+me)\b/gi,
];
