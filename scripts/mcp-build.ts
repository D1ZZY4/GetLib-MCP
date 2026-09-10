import { execSync } from "child_process";
import { chmodSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { dirname, join, relative, resolve, sep } from "path";

const ROOT = resolve(import.meta.dir, "..");
const DIST = join(ROOT, "dist");

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collect(full, out);
    } else if (full.endsWith(".js")) {
      out.push(full);
    }
  }
  return out;
}

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function resolveTarget(spec: string, fromFile: string): string | null {
  if (spec.startsWith("@/")) {
    const targetAbs = join(DIST, spec.slice(2));
    const rel = toPosix(relative(dirname(fromFile), targetAbs));
    const dot = rel.startsWith(".") ? rel : `./${rel}`;
    if (dot.endsWith(".js") || dot.endsWith(".json") || dot.endsWith(".node")) return dot;
    if (existsSync(`${targetAbs}.js`)) return `${dot}.js`;
    if (existsSync(join(targetAbs, "index.js"))) return `${dot}/index.js`;
    return `${dot}.js`;
  }
  if (spec.startsWith(".")) {
    if (spec.endsWith(".js") || spec.endsWith(".json") || spec.endsWith(".node")) return null;
    const targetAbs = resolve(dirname(fromFile), spec);
    if (existsSync(`${targetAbs}.js`)) return `${spec}.js`;
    if (existsSync(join(targetAbs, "index.js"))) return `${spec}/index.js`;
    return `${spec}.js`;
  }
  return null;
}

function rewriteFile(file: string): boolean {
  const source = readFileSync(file, "utf-8");
  let changed = false;
  const out = source.replace(
    /((?:import|export)[^'"]*?from\s*['"]|import\s*\(\s*['"]|import\s+['"])([^'"]+)(['"])/g,
    (whole, pre: string, spec: string, post: string) => {
      const next = resolveTarget(spec, file);
      if (!next) return whole;
      changed = true;
      return `${pre}${next}${post}`;
    },
  );
  if (changed) writeFileSync(file, out);
  return changed;
}

execSync("rm -rf dist", { cwd: ROOT, stdio: "inherit" });
execSync("bunx tsc -p tsconfig.build.json", { cwd: ROOT, stdio: "inherit" });

const files = collect(DIST);
let rewritten = 0;
for (const file of files) {
  if (rewriteFile(file)) rewritten += 1;
}

const entry = join(DIST, "server", "mcp", "stdio-entry.js");
if (!existsSync(entry)) {
  throw new Error(`modular build entry missing: ${entry}`);
}
const entrySource = readFileSync(entry, "utf-8");
const entryDir = dirname(entry);
const promoted = entrySource.replace(
  /((?:import|export)[^'"]*?from\s*['"]|import\s*\(\s*['"]|import\s+['"])([^'"]+)(['"])/g,
  (whole, pre: string, spec: string, post: string) => {
    if (!spec.startsWith(".")) return whole;
    const targetAbs = resolve(entryDir, spec);
    const rel = toPosix(relative(DIST, targetAbs));
    const dot = rel.startsWith(".") ? rel : `./${rel}`;
    return `${pre}${dot}${post}`;
  },
);
writeFileSync(join(DIST, "index.js"), `#!/usr/bin/env node\n${promoted}`);
chmodSync(join(DIST, "index.js"), 0o755);
rmSync(entry);

const finalFiles = collect(DIST);
console.log(`modular build: clean (${finalFiles.length} modules, ${rewritten} rewritten, entry dist/index.js)`);
