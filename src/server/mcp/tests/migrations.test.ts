import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Migration contract tests: the SQL files under supabase/migrations are
 * the only production schema mechanism, so their discipline (versioned,
 * ordered, additive-only, RLS-locked, secret-free) is pinned here
 * without needing a live database.
 */
const MIGRATIONS_DIR = join(import.meta.dir, "..", "..", "..", "..", "supabase", "migrations");

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

function readMigration(file: string): string {
  return readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
}

describe("supabase migrations", () => {
  test("migrations apply in filename order with version prefixes", () => {
    const files = migrationFiles();
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files).toEqual([...files].sort());
    for (const file of files) {
      expect(file).toMatch(/^\d+_.+\.sql$/);
    }
  });

  test("auth bootstrap table is RLS-locked with an idempotent seed", () => {
    const sql = readMigration("2026090901_init_auth.sql");
    expect(sql).toContain("create table if not exists public.app_bootstrap");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("on conflict (id) do nothing");
    expect(sql).toContain("awesomemcp@getlib-local.com");
  });

  test("mcp logs sink is RLS-locked with lookup indexes", () => {
    const sql = readMigration("2026090902_init_mcp_observability.sql");
    expect(sql).toContain("create table if not exists public.mcp_logs");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("mcp_logs_created_at_idx");
    expect(sql).toContain("mcp_logs_name_idx");
  });

  test("request_id index migration is additive-only", () => {
    const sql = readMigration("2026090903_mcp_logs_request_id_idx.sql");
    expect(sql).toContain("mcp_logs_request_id_idx");
    expect(sql).not.toMatch(/create table/i);
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).not.toMatch(/alter table/i);
  });

  test("no migration stores real secrets or drops tables", () => {
    for (const file of migrationFiles()) {
      const sql = readMigration(file);
      expect(sql).not.toContain("getlib123");
      expect(sql).not.toContain("demo123");
      expect(sql).not.toMatch(/drop table/i);
      expect(sql).not.toMatch(/password\s+(text|varchar|char)/i);
    }
  });
});
