/**
 * Test-file cleanup for the repository.
 *
 * Lists (default) or deletes (`--apply`) test files and test-only
 * directories so a checked-in test suite can be trimmed once it is no
 * longer needed, without hand-deleting dozens of paths.
 *
 * Safety contract (read before using with `--apply`):
 * - Dry-run is the default: without `--apply` nothing is deleted and the
 *   plan is printed with "(no changes made)".
 * - Only paths matching test patterns are ever deleted: `*.test.*`,
 *   `*.spec.*`, and (with `--include-dirs`) directories named
 *   `__tests__`, or named `tests` when every file inside matches the file
 *   patterns. Anything else is left untouched.
 * - Never traverses or deletes inside `node_modules`, `.next`, `.git`,
 *   `dist`, `build`, or `coverage`.
 * - The target directory must resolve inside the repository root, so a
 *   typo cannot wipe an unrelated path.
 * - Deleting the suite weakens the `bun run validate` quality gate (it
 *   runs `bun run test`). Commit first, and expect typecheck/lint/build
 *   to keep passing while test coverage goes to zero.
 */
import { existsSync, readdirSync, rmSync, statSync } from "fs";
import { join, relative, resolve } from "path";

const LOG_PREFIX = "clean-test";
const ROOT = resolve(join(import.meta.dir, ".."));

const NEVER_TRAVERSE = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage"]);

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx|mts|cts)$/;

interface CleanOptions {
  dir: string | null;
  apply: boolean;
  includeDirs: boolean;
  help: boolean;
}

interface CleanPlan {
  files: string[];
  dirs: string[];
}

function parseArgs(argv: string[]): CleanOptions {
  const options: CleanOptions = { dir: null, apply: false, includeDirs: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--include-dirs") {
      options.includeDirs = true;
    } else if (arg === "--dir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --dir.");
      }
      i += 1;
      options.dir = value;
    } else {
      throw new Error(`Unknown argument: ${arg}. See --help.`);
    }
  }
  return options;
}

function usage(): string {
  return [
    "List (default) or delete test files and test-only directories.",
    "",
    "Usage:",
    "  bun scripts/clean-test.ts [--dir <path>] [--include-dirs] [--apply]",
    "",
    "Options:",
    "  --dir <path>     Directory to scan, relative to the repo root or absolute.",
    "                   Defaults to src. Must resolve inside the repo root.",
    "  --include-dirs   Also remove __tests__ dirs, and tests dirs whose files",
    "                   are all test files. Without it, only test files are handled.",
    "  --apply          Actually delete. Without it, only print the plan",
    "                   (dry-run, no changes made).",
    "  --help, -h       Show this text.",
    "",
    "Examples:",
    "  bun scripts/clean-test.ts",
    "  bun scripts/clean-test.ts --include-dirs",
    "  bun scripts/clean-test.ts --dir src/server --include-dirs --apply",
  ].join("\n");
}

function fail(message: string): never {
  console.error(`${LOG_PREFIX}: ${message}`);
  process.exit(1);
}

/** Resolve the scan target and jail it inside the repository root. */
function resolveTarget(raw: string | null): string {
  const candidate = raw ?? join(ROOT, "src");
  const resolved = resolve(ROOT, candidate);
  const rel = relative(ROOT, resolved);
  if (rel.startsWith("..") || rel === "..") {
    fail(`refusing target outside the repo root: ${candidate}.`);
  }
  if (!existsSync(resolved)) {
    fail(`target directory not found: ${candidate}.`);
  }
  let isDirectory = false;
  try {
    isDirectory = statSync(resolved).isDirectory();
  } catch {
    fail(`target is not readable: ${candidate}.`);
  }
  if (!isDirectory) {
    fail(`target is not a directory: ${candidate}.`);
  }
  return resolved;
}

function isTestFileName(entry: string): boolean {
  return TEST_FILE_PATTERN.test(entry);
}

/** True when every file under dir (recursively) is a test file. */
function isTestOnlyDir(dir: string): boolean {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return false;
  }
  if (entries.length === 0) return false;
  for (const entry of entries) {
    if (NEVER_TRAVERSE.has(entry)) continue;
    const full = join(dir, entry);
    let isDirectory = false;
    try {
      isDirectory = statSync(full).isDirectory();
    } catch {
      return false;
    }
    if (isDirectory) {
      if (!isTestOnlyDir(full)) return false;
    } else if (!isTestFileName(entry)) {
      return false;
    }
  }
  return true;
}

function collectPlan(dir: string, includeDirs: boolean, plan: CleanPlan): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (NEVER_TRAVERSE.has(entry)) continue;
    const full = join(dir, entry);
    let isDirectory = false;
    try {
      isDirectory = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (!isDirectory) {
      if (isTestFileName(entry)) plan.files.push(full);
      continue;
    }
    if (includeDirs && (entry === "__tests__" || (entry === "tests" && isTestOnlyDir(full)))) {
      plan.dirs.push(full);
      continue;
    }
    collectPlan(full, includeDirs, plan);
  }
}

function removePath(path: string): boolean {
  try {
    rmSync(path, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX}: could not remove ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function main(): void {
  let options: CleanOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (options.help) {
    console.log(usage());
    return;
  }
  const target = resolveTarget(options.dir);
  const plan: CleanPlan = { files: [], dirs: [] };
  collectPlan(target, options.includeDirs, plan);
  plan.files.sort();
  plan.dirs.sort();

  const rel = (path: string): string => relative(ROOT, path) || ".";
  if (!options.apply) {
    const total = plan.files.length + plan.dirs.length;
    console.log(`${LOG_PREFIX}: plan for ${rel(target)} (${total} paths, no changes made)`);
    for (const dir of plan.dirs) console.log(`${LOG_PREFIX}:   dir  ${rel(dir)}`);
    for (const file of plan.files) console.log(`${LOG_PREFIX}:   file ${rel(file)}`);
    if (total === 0) {
      console.log(`${LOG_PREFIX}: nothing to clean. Re-run with --apply to delete, --include-dirs to include test folders.`);
    } else {
      console.log(`${LOG_PREFIX}: re-run with --apply to delete these paths.`);
    }
    return;
  }

  let removedFiles = 0;
  let removedDirs = 0;
  let failed = 0;
  for (const dir of plan.dirs) {
    if (removePath(dir)) removedDirs += 1;
    else failed += 1;
  }
  for (const file of plan.files) {
    if (!existsSync(file)) continue;
    if (removePath(file)) removedFiles += 1;
    else failed += 1;
  }
  console.log(`${LOG_PREFIX}: done removed=${removedFiles + removedDirs} (files=${removedFiles}, dirs=${removedDirs}) failed=${failed}.`);
  if (failed > 0) process.exit(2);
}

main();
