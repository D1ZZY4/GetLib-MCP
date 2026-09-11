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

interface ImportRef {
  line: number;
  path: string;
}

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "src");

const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const;
const TEST_SUFFIX = ".test.ts";

function isSourceFile(entry: string): boolean {
  if (entry.endsWith(TEST_SUFFIX)) return false;
  return SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext));
}

function collect(dir: string): string[] {
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
      out.push(...collect(full));
    } else if (isSourceFile(entry)) {
      out.push(full);
    }
  }
  return out;
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function importsOf(source: string): ImportRef[] {
  const found: ImportRef[] = [];
  const staticPattern = /(?:import|export)\s+[\s\S]*?from\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = staticPattern.exec(source)) !== null) {
    const path = match[1];
    if (path) found.push({ line: lineOf(source, match.index), path });
  }
  const dynamicPattern = /(?:import\s*\(\s*|require\s*\()\s*['"]([^'"]+)['"]/g;
  while ((match = dynamicPattern.exec(source)) !== null) {
    const path = match[1];
    if (path) found.push({ line: lineOf(source, match.index), path });
  }
  return found;
}

function under(file: string, ...segments: string[]): boolean {
  const rel = relative(SRC, file).replace(/\\/g, "/");
  return segments.some(
    (segment) => rel === segment || rel.startsWith(`${segment}/`),
  );
}

function isAlias(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isRelativeTo(path: string, name: string): boolean {
  return path.startsWith(".") && path.split("/").includes(name);
}

function checkFile(file: string, violations: Violation[]): void {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  let source: string;
  try {
    source = readFileSync(file, "utf-8");
  } catch {
    return;
  }
  for (const { line, path } of importsOf(source)) {
    const report = (rule: number): void => {
      violations.push({ file: rel, rule, line, text: path });
    };

    if (under(file, "server", "application", "domain")) {
      if (
        isAlias(path, "@/web") ||
        isAlias(path, "@/app") ||
        isRelativeTo(path, "web") ||
        isRelativeTo(path, "app")
      ) {
        report(1);
        continue;
      }
    }
    if (under(file, "domain")) {
      if (
        isAlias(path, "@/server") ||
        isAlias(path, "@/application") ||
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
      if (
        isAlias(path, "@/server") ||
        isAlias(path, "@/application") ||
        isAlias(path, "@/domain") ||
        path.includes("supabase")
      ) {
        report(3);
        continue;
      }
    }
    if (under(file, "application")) {
      if (isAlias(path, "@/server/mcp/tools")) {
        report(4);
        continue;
      }
    }
    if (under(file, "app")) {
      if (
        isAlias(path, "@/domain") ||
        path.includes("supabase") ||
        isAlias(path, "@/server/mcp/services") ||
        isAlias(path, "@/server/mcp/sources")
      ) {
        report(5);
      }
    }
  }
}

function main(): void {
  const files = collect(SRC);
  const violations: Violation[] = [];
  for (const file of files) {
    checkFile(file, violations);
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `${violation.file}:${violation.line} [rule ${violation.rule}] forbids import '${violation.text}'`,
      );
    }
    console.error(`\nboundary check: ${violations.length} violation(s)`);
    process.exit(1);
  }
  console.log(`boundary check: clean (${files.length} files)`);
}

main();
