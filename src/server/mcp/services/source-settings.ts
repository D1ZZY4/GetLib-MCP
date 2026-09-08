import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { DISK_CACHE_DIR } from "../constants";

/**
 * Runtime settings for documentation sources - the enforcement backend of
 * the Sources settings page. Tools consult isSourceEnabled /
 * isLibraryBlocked before touching a source table or provider, so toggles
 * on the page take real effect in this server process.
 *
 * Persistence is a small JSON file next to the disk cache (no database
 * required). State loads once, synchronously, on first read - the file is
 * tiny and the read happens at most once per process.
 */

export const KNOWN_SOURCE_IDS = [
  "library-registry",
  "doc-url-patterns",
  "best-practice-urls",
  "topic-urls",
  "migration-paths",
  "audit-patterns",
  "fix-targets",
  "search-mdn",
  "search-ddg",
  "search-searxng",
  "search-mojeek",
] as const;

export type KnownSourceId = (typeof KNOWN_SOURCE_IDS)[number];

const MAX_LIST_ENTRIES = 200;
const MAX_ENTRY_LENGTH = 200;

export interface SourceSettingsState {
  disabled: string[];
  blocked: string[];
  wildcards: string[];
}

const DEFAULTS: SourceSettingsState = { disabled: [], blocked: [], wildcards: [] };

function settingsPath(): string {
  return join(DISK_CACHE_DIR, "source-settings.json");
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim();
    if (normalized.length === 0 || normalized.length > MAX_ENTRY_LENGTH) continue;
    seen.add(normalized);
    if (seen.size >= MAX_LIST_ENTRIES) break;
  }
  return [...seen];
}

function loadState(): SourceSettingsState {
  try {
    const raw = readFileSync(settingsPath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<SourceSettingsState>;
    return {
      disabled: normalizeList(parsed.disabled).filter((id) =>
        (KNOWN_SOURCE_IDS as readonly string[]).includes(id),
      ),
      blocked: normalizeList(parsed.blocked),
      wildcards: normalizeList(parsed.wildcards),
    };
  } catch {
    return { ...DEFAULTS, disabled: [...DEFAULTS.disabled], blocked: [], wildcards: [] };
  }
}

let state: SourceSettingsState | null = null;

function current(): SourceSettingsState {
  if (!state) state = loadState();
  return state;
}

async function persist(): Promise<void> {
  const snapshot = current();
  try {
    await mkdir(dirname(settingsPath()), { recursive: true });
    await writeFile(settingsPath(), JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
  } catch {
    // Cache dir unwritable (read-only fs) - settings still apply in memory
    // for this process lifetime.
  }
}

/** True unless the source id was disabled on the Sources page. Unknown ids stay enabled. */
export function isSourceEnabled(id: string): boolean {
  return !current().disabled.includes(id);
}

function matchesEntry(candidates: string[], value: string): boolean {
  const lower = value.toLowerCase();
  return candidates.some((entry) => {
    const e = entry.toLowerCase();
    return lower === e || lower.startsWith(`${e}/`);
  });
}

/**
 * True when a library id or name is blocked, unless it is wild-carded.
 * Wildcards always win over blocked entries.
 */
export function isLibraryBlocked(libraryId: string, aliases: string[] = []): boolean {
  const { blocked, wildcards } = current();
  const names = [libraryId, ...aliases];
  if (names.some((name) => matchesEntry(wildcards, name))) return false;
  return names.some((name) => matchesEntry(blocked, name));
}

/**
 * Refusal message when a lookup names a blocked library, or null when the
 * lookup may proceed. Checks the raw input plus resolved entry names so
 * blocking "vercel/next.js" also stops the "nextjs" alias.
 */
export function checkLibraryAccess(libraryId: string, resolvedNames: string[] = []): string | null {
  if (!isLibraryBlocked(libraryId, resolvedNames)) return null;
  return `Library "${libraryId}" is blocked by the Sources settings. Remove it from the blocked list to look it up.`;
}

export function getSourceSettings(): SourceSettingsState {
  const { disabled, blocked, wildcards } = current();
  return { disabled: [...disabled], blocked: [...blocked], wildcards: [...wildcards] };
}

export class SourceSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceSettingsValidationError";
  }
}

/**
 * Replace settings wholesale and persist. Unknown source ids are rejected
 * so typos cannot silently disable nothing. Returns the stored snapshot.
 */
export async function updateSourceSettings(input: {
  disabled?: unknown;
  blocked?: unknown;
  wildcards?: unknown;
}): Promise<SourceSettingsState> {
  const disabled = normalizeList(input.disabled);
  const unknown = disabled.filter(
    (id) => !(KNOWN_SOURCE_IDS as readonly string[]).includes(id),
  );
  if (unknown.length > 0) {
    throw new SourceSettingsValidationError(
      `Unknown source ids: ${unknown.join(", ")}. Known ids: ${KNOWN_SOURCE_IDS.join(", ")}.`,
    );
  }
  state = {
    disabled,
    blocked: normalizeList(input.blocked),
    wildcards: normalizeList(input.wildcards),
  };
  await persist();
  return getSourceSettings();
}
