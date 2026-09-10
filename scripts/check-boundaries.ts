/**
 * Architecture boundary check (blueprint sections 73, 83-84).
 *
 * Static import-direction enforcement so dependency violations fail
 * `bun run lint` instead of surviving review:
 *
 * 1. server/, application/, domain/ never import web/ or app/ output.
 * 2. domain/ is pure: no server/, application/, React, Next, or Supabase.
 * 3. web/ never imports server/, application/, domain/, or Supabase.
 * 4. application/ never imports transport adapters (tools/) or UI.
 * 5. app/ routes delegate to application/; they never import domain/,
 *    Supabase, or provider/source internals (composition roots may wire
 *    infrastructure/deps and shared guards/transport).
 *
 * Test files (*.test.ts) are excluded: tests compose live adapters and
 * stub seams on purpose.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

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

function importsOf(source: string): Array<{ line: number; path: string }> {
  const found: Array<{ line: number; path: string }> = [];
  const lines = source.split("\n");
  const pattern = /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/g;
  lines.forEach((text, index) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const path = match[1];
      if (path) found.push({ line: index + 1, path });
    }
  });
  return found;
}

function under(file: string, ...segments: string[]): boolean {
  const rel = relative(SRC, file).replace(/\\/g, "/");
  return segments.some((segment) => rel === segment || rel.startsWith(`${segment}/`));
}

const violations: Violation[] = [];

for (const file of collect(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  let source: string;
  try {
    source = readFileSync(file, "utf-8");
  } catch {
    continue;
  }
  for (const { line, path } of importsOf(source)) {
    const report = (rule: number): void => {
      violations.push({ file: rel, rule, line, text: path });
    };
    const isAlias = (prefix: string): boolean => path === prefix || path.startsWith(`${prefix}/`);
    const isRelativeTo = (name: string): boolean =>
      path.startsWith(".") && path.split("/").includes(name);

    if (under(file, "src/server", "src/application", "src/domain")) {
      if (isAlias("@/web") || isAlias("@/app") || isRelativeTo("web") || isRelativeTo("app")) {
        report(1);
        continue;
      }
    }
    if (under(file, "src/domain")) {
      if (
        isAlias("@/server") ||
        isAlias("@/application") ||
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
    if (under(file, "src/web")) {
      if (
        isAlias("@/server") ||
        isAlias("@/application") ||
        isAlias("@/domain") ||
        path.includes("supabase")
      ) {
        report(3);
        continue;
      }
    }
    if (under(file, "src/application")) {
      if (isAlias("@/server/mcp/tools")) {
        report(4);
        continue;
      }
    }
    if (under(file, "src/app")) {
      if (
        isAlias("@/domain") ||
        path.includes("supabase") ||
        isAlias("@/server/mcp/services") ||
        isAlias("@/server/mcp/sources")
      ) {
        report(5);
      }
    }
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
