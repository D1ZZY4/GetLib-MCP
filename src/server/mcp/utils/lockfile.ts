import { readFile } from "fs/promises";
import { join } from "path";
import { safeguardPath } from "./guard";
import type { LibraryEntry } from "../types";

export interface LockfileVersion {
  packageName: string;
  version: string;
  source: "package-lock" | "pnpm-lock" | "yarn-lock" | "cargo-lock" | "poetry-lock" | "uv-lock" | "go-mod";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function detectVersionFromLockfile(
  projectPath: string,
  packageName: string,
): Promise<string | null> {
  // Fail closed at the filesystem boundary: callers pass user-controlled
  // projectPath straight from tool input, so validate here even when the
  // caller already guarded (defense in depth, rule 31).
  let safePath: string;
  try {
    safePath = safeguardPath(projectPath);
  } catch {
    return null;
  }
  try {
    const raw = await readFile(join(safePath, "package-lock.json"), "utf-8");
    const lock = JSON.parse(raw) as {
      packages?: Record<string, { version?: string }>;
      dependencies?: Record<string, { version?: string }>;
    };
    const pkgKey = `node_modules/${packageName}`;
    const v = lock.packages?.[pkgKey]?.version ?? lock.dependencies?.[packageName]?.version;
    if (v) return v;
  } catch { /* not found */ }

  try {
    const raw = await readFile(join(safePath, "pnpm-lock.yaml"), "utf-8");
    const escaped = escapeRegex(packageName);
    // Anchored on a real name boundary - an unanchored search matched
    // substrings of unrelated packages (eslint-plugin-react vs react).
    const re = new RegExp(`(?:^|["',])\\s*/?${escaped}[@/]([\\d.]+)`, "m");
    const match = raw.match(re);
    if (match?.[1]) return match[1];
  } catch { /* not found */ }

  try {
    const raw = await readFile(join(safePath, "yarn.lock"), "utf-8");
    const escaped = escapeRegex(packageName);
    // Same boundary anchoring as pnpm above (super-react@1 must not answer
    // a lookup for react).
    const re = new RegExp(`(?:^|["',])\\s*${escaped}@[^"]*"?[\\s\\S]*?\\n\\s+version\\s+"([^"]+)"`, "m");
    const match = raw.match(re);
    if (match?.[1]) return match[1];
  } catch { /* not found */ }

  try {
    const raw = await readFile(join(safePath, "Cargo.lock"), "utf-8");
    const escaped = escapeRegex(packageName);
    const re = new RegExp(`\\[\\[package\\]\\]\\nname = "${escaped}"\\nversion = "([^"]+)"`, "m");
    const match = raw.match(re);
    if (match?.[1]) return match[1];
  } catch { /* not found */ }

  try {
    const raw = await readFile(join(safePath, "poetry.lock"), "utf-8");
    const escaped = escapeRegex(packageName);
    const re = new RegExp(`\\[\\[package\\]\\]\\nname = "${escaped}"\\nversion = "([^"]+)"`, "m");
    const match = raw.match(re);
    if (match?.[1]) return match[1];
  } catch { /* not found */ }

  try {
    const raw = await readFile(join(safePath, "uv.lock"), "utf-8");
    const escaped = escapeRegex(packageName);
    const re = new RegExp(`\\[\\[package\\]\\]\\nname = "${escaped}"\\nversion = "([^"]+)"`, "m");
    const match = raw.match(re);
    if (match?.[1]) return match[1];
  } catch { /* not found */ }

  try {
    const raw = await readFile(join(safePath, "go.sum"), "utf-8");
    const escaped = escapeRegex(packageName);
    const re = new RegExp(`^${escaped}\\s+v([\\d.a-zA-Z-]+)`, "m");
    const match = raw.match(re);
    if (match?.[1]) return match[1];
  } catch { /* not found */ }

  return null;
}

export async function detectAllVersions(
  projectPath: string,
  packageNames: string[],
): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  // Detect all packages in parallel - auto-scan can request 20+ at once, and
  // each detection independently reads the same lockfiles.
  const entries = await Promise.all(
    packageNames.map(async (name) => [name, await detectVersionFromLockfile(projectPath, name)] as const),
  );
  for (const [name, v] of entries) {
    if (v) versions.set(name, v);
  }
  return versions;
}

/**
 * Shared lockfile version auto-detection for tools that accept an optional
 * projectPath (gl_get_docs, gl_snippets). Returns the detected version, or
 * undefined when detection is inapplicable or fails. Never throws - a
 * missing lockfile is a normal case, not an error.
 */
export async function detectVersionForEntry(
  projectPath: string | undefined,
  version: string | undefined,
  entry: Pick<LibraryEntry, "id" | "npmPackage" | "pypiPackage"> | null | undefined,
): Promise<string | undefined> {
  if (version || !projectPath || !entry) return version;
  const pkgName = entry.npmPackage ?? entry.pypiPackage ?? entry.id.split("/").pop() ?? "";
  if (!pkgName) return version;
  const detected = await detectVersionFromLockfile(projectPath, pkgName).catch(() => null);
  return detected ?? version;
}
