/**
 * Architecture boundary check (blueprint sections 73, 83-84).
 *
 * Static import-direction enforcement so dependency violations fail
 * `bun run lint` instead of surviving review:
 *
 * 1. server/, application/, domain/ never import web/ or app/ output.
 * 2. domain/ is pure: no server/, application/, React, Next, Supabase,
 *    or process.env.
 * 3. web/ never imports server/, application/, domain/, or Supabase.
 * 4. application/ never imports transport adapters (tools/) or UI.
 * 5. app/ routes delegate to application/; composition roots may wire
 *    infrastructure/deps, transports, and shared guards - never
 *    services/, sources/, domain/, or Supabase clients.
 * 6. tools/ must not re-export provider internals (no secondary
 *    import path that bypasses the application use case).
 *
 * Test files (*.test.ts) are excluded: tests compose live adapters and
 * stub seams on purpose.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, relative, sep } from "path";

interface Violation {
  file: string;
  rule: number;
  line: number;
  text: string;
}

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "src");

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collect(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

interface ImportRef {
  line: number;
  path: string;
  reExport: boolean;
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

/** Static imports, re-exports, dynamic import(), and require(). */
function importsOf(source: string): ImportRef[] {
  const found: ImportRef[] = [];
  const staticPattern = /(?:import|export)\s+[\s\S]*?from\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = staticPattern.exec(source)) !== null) {
    const path = match[1];
    if (path) {
      found.push({
        line: lineOf(source, match.index),
        path,
        reExport: match[0].trimStart().startsWith("export"),
      });
    }
  }
  const dynamicPattern = /(?:import\s*\(\s*|require\s*\()\s*['"]([^'"]+)['"]/g;
  while ((match = dynamicPattern.exec(source)) !== null) {
    const path = match[1];
    if (path) found.push({ line: lineOf(source, match.index), path, reExport: false });
  }
  return found;
}

/** Segments are relative to src/ (e.g. "server", "application"). */
function under(file: string, ...segments: string[]): boolean {
  const rel = relative(SRC, file).split(sep).join("/");
  return segments.some((segment) => rel === segment || rel.startsWith(`${segment}/`));
}

/** Normalize an import to a src-relative path when resolvable. */
function normalizeImport(file: string, path: string): string | null {
  if (path.startsWith("@/")) return path.slice(2);
  if (!path.startsWith(".")) return null;
  const parts: string[] = [];
  for (const part of join(dirname(file), path).split(sep)) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  const rel = relative(SRC, join(sep, ...parts)).split(sep).join("/");
  if (rel.startsWith("..")) return null;
  return rel;
}

const violations: Violation[] = [];

for (const file of collect(SRC)) {
  const rel = relative(ROOT, file).split(sep).join("/");
  let source: string;
  try {
    source = readFileSync(file, "utf-8");
  } catch {
    continue;
  }
  for (const { line, path, reExport } of importsOf(source)) {
    const report = (rule: number): void => {
      violations.push({ file: rel, rule, line, text: path });
    };
    const isAlias = (prefix: string): boolean => path === prefix || path.startsWith(`${prefix}/`);
    const resolved = normalizeImport(file, path);
    const hits = (...segments: string[]): boolean => {
      if (segments.some((segment) => isAlias(`@/${segment}`))) return true;
      if (resolved === null) return false;
      return segments.some((segment) => resolved === segment || resolved.startsWith(`${segment}/`));
    };

    if (under(file, "server", "application", "domain")) {
      if (hits("web", "app")) {
        report(1);
        continue;
      }
    }
    if (under(file, "domain")) {
      if (
        hits("server", "application") ||
        path === "react" ||
        path.startsWith("react/") ||
        path === "next" ||
        path.startsWith("next/") ||
        path.includes("supabase")
      ) {
        report(2);
        continue;
      }
    }
    if (under(file, "web")) {
      if (hits("server", "application", "domain") || path.includes("supabase")) {
        report(3);
        continue;
      }
    }
    if (under(file, "application")) {
      if (hits("server/mcp/tools", "web", "app")) {
        report(4);
        continue;
      }
    }
    if (under(file, "app")) {
      const allowedServer =
        hits("server/mcp/infrastructure/deps") ||
        hits("server/mcp/transport") ||
        path === "@/server/mcp/utils/guard" ||
        path === "@/server/mcp/utils/schemas" ||
        path === "@/server/mcp/utils/rate-limit";
      if (hits("domain") || path.includes("supabase") || (hits("server") && !allowedServer)) {
        report(5);
        continue;
      }
    }
    if (under(file, "server/mcp/tools") && reExport) {
      report(6);
    }
  }

  // Content rules: no layer escapes that imports cannot express.
  // Comments are stripped first so documentation about a prohibition
  // (e.g. "never reads process.env") cannot trip its own rule.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
  if (under(file, "domain") && /process\.env/.test(code)) {
    violations.push({ file: rel, rule: 2, line: 1, text: "process.env in domain" });
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} [rule ${violation.rule}] forbids import '${violation.text}'`);
  }
  console.error(`\nboundary check: ${violations.length} violation(s)`);
  process.exit(1);
}
console.log(`boundary check: clean (${collect(SRC).length} files)`);
