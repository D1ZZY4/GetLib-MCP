import { execSync } from "child_process";
import { chmodSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { dirname, join, relative, resolve, sep } from "path";

const ROOT = resolve(import.meta.dir, "..");
const DIST = join(ROOT, "dist");
const BUILD_ENTRY = join(DIST, "server", "mcp", "stdio-entry.js");
const PROMOTED_ENTRY = join(DIST, "index.js");
const TSC_BUILD_PROJECT = "tsconfig.build.json";

/** Matches static/dynamic import specifiers so extensionless paths can be fixed for Node. */
const IMPORT_SPEC_PATTERN =
  /((?:import|export)[^'"]*?from\s*['"]|import\s*\(\s*['"]|import\s+['"])([^'"]+)(['"])/g;

const KNOWN_EXACT_EXTENSIONS = [".js", ".json", ".node"] as const;

function collectJs(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    let isDirectory = false;
    try {
      isDirectory = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDirectory) {
      out.push(...collectJs(full));
    } else if (full.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function withDotPrefix(rel: string): string {
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function hasKnownExtension(spec: string): boolean {
  return KNOWN_EXACT_EXTENSIONS.some((ext) => spec.endsWith(ext));
}

function resolveTarget(spec: string, fromFile: string): string | null {
  if (spec.startsWith("@/")) {
    const targetAbs = join(DIST, spec.slice(2));
    const rel = toPosix(relative(dirname(fromFile), targetAbs));
    const dot = withDotPrefix(rel);
    if (hasKnownExtension(dot)) return dot;
    if (existsSync(`${targetAbs}.js`)) return `${dot}.js`;
    if (existsSync(join(targetAbs, "index.js"))) return `${dot}/index.js`;
    return `${dot}.js`;
  }
  if (spec.startsWith(".")) {
    if (hasKnownExtension(spec)) return null;
    const targetAbs = resolve(dirname(fromFile), spec);
    if (existsSync(`${targetAbs}.js`)) return `${spec}.js`;
    if (existsSync(join(targetAbs, "index.js"))) return `${spec}/index.js`;
    return `${spec}.js`;
  }
  return null;
}

function rewriteImportSpecs(source: string, resolveSpec: (spec: string) => string | null): { text: string; changed: boolean } {
  let changed = false;
  const text = source.replace(
    IMPORT_SPEC_PATTERN,
    (whole, pre: string, spec: string, post: string) => {
      const next = resolveSpec(spec);
      if (!next) return whole;
      changed = true;
      return `${pre}${next}${post}`;
    },
  );
  // A global regex keeps lastIndex state; reset so reuse is deterministic.
  IMPORT_SPEC_PATTERN.lastIndex = 0;
  return { text, changed };
}

function rewriteFile(file: string): boolean {
  const source = readFileSync(file, "utf-8");
  const { text, changed } = rewriteImportSpecs(source, (spec) => resolveTarget(spec, file));
  if (changed) writeFileSync(file, text);
  return changed;
}

function cleanDist(): void {
  rmSync(DIST, { recursive: true, force: true });
}

function compileBuild(): void {
  execSync(`bunx tsc -p ${TSC_BUILD_PROJECT}`, { cwd: ROOT, stdio: "inherit" });
}

function promoteEntry(): void {
  if (!existsSync(BUILD_ENTRY)) {
    throw new Error(`modular build entry missing: ${BUILD_ENTRY}`);
  }
  const entrySource = readFileSync(BUILD_ENTRY, "utf-8");
  const entryDir = dirname(BUILD_ENTRY);
  const { text: promoted } = rewriteImportSpecs(entrySource, (spec) => {
    if (!spec.startsWith(".")) return null;
    const targetAbs = resolve(entryDir, spec);
    const rel = toPosix(relative(DIST, targetAbs));
    return withDotPrefix(rel);
  });
  writeFileSync(PROMOTED_ENTRY, `#!/usr/bin/env node\n${promoted}`);
  chmodSync(PROMOTED_ENTRY, 0o755);
  rmSync(BUILD_ENTRY);
}

function usage(): string {
  return [
    "Build the standalone MCP server bundle into dist/.",
    "",
    "Usage:",
    "  bun scripts/mcp-build.ts [--help]",
    "",
    "Options:",
    "  --help, -h  Show this text.",
  ].join("\n");
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usage());
    return;
  }
  if (argv.length > 0) {
    throw new Error(`Unknown argument: ${argv[0]}. See --help.`);
  }

  cleanDist();
  compileBuild();

  const files = collectJs(DIST);
  let rewritten = 0;
  for (const file of files) {
    if (rewriteFile(file)) rewritten += 1;
  }

  promoteEntry();

  const finalFiles = collectJs(DIST);
  console.log(`modular build: clean (${finalFiles.length} modules, ${rewritten} rewritten, entry dist/index.js)`);
}

main();
