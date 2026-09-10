import { readdirSync } from "fs";
import { join } from "path";

interface PushOptions {
  databaseUrl: string | null;
  target: string | null;
  allowProduction: boolean;
  dryRun: boolean;
  migrationsDir: string | null;
  help: boolean;
}

function parseArgs(argv: string[]): PushOptions {
  const options: PushOptions = {
    databaseUrl: null,
    target: null,
    allowProduction: false,
    dryRun: false,
    migrationsDir: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--allow-production") {
      options.allowProduction = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--database-url" || arg === "--target" || arg === "--migrations-dir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}.`);
      }
      i += 1;
      if (arg === "--database-url") options.databaseUrl = value;
      else if (arg === "--target") options.target = value;
      else options.migrationsDir = value;
    } else {
      throw new Error(`Unknown argument: ${arg}. See --help.`);
    }
  }
  return options;
}

function usage(): string {
  return [
    "Push Supabase migrations in filename order.",
    "",
    "Usage:",
    "  bun scripts/db-push.ts --database-url <url> --target <label> [--allow-production] [--dry-run]",
    "",
    "Options:",
    "  --database-url <url>   Postgres connection string (or set DATABASE_URL).",
    "  --target <label>       Required audit label, e.g. development, staging.",
    "  --allow-production     Required when the target starts with \"prod\".",
    "  --dry-run              List the plan without touching any database.",
    "  --migrations-dir <dir> Override the migrations directory.",
    "  --help, -h             Show this text.",
  ].join("\n");
}

function defaultMigrationsDir(): string {
  return join(import.meta.dir, "..", "supabase", "migrations");
}

function listMigrations(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    throw new Error(`Migrations directory not readable: ${dir}.`);
  }
  const files = entries.filter((entry) => entry.endsWith(".sql")).sort();
  if (files.length === 0) {
    throw new Error(`No migration files found in ${dir}.`);
  }
  for (const file of files) {
    if (!/^\d+_.+\.sql$/.test(file)) {
      throw new Error(`Migration breaks the version-prefix convention: ${file}.`);
    }
  }
  return files.map((file) => join(dir, file));
}

/** Human-readable database identity without password or secrets. */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const auth = parsed.username ? `${parsed.username}@` : "";
    return `${parsed.protocol}//${auth}${parsed.host}${parsed.pathname}`;
  } catch {
    return "<unparseable-database-url>";
  }
}

function isProductionTarget(target: string): boolean {
  return target.toLowerCase().startsWith("prod");
}

function fail(message: string): never {
  console.error(`db-push: ${message}`);
  process.exit(1);
}

function main(): void {
  let options: PushOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.target) {
    fail("missing --target (e.g. development, staging, production).");
  }
  const target = options.target;
  let files: string[];
  try {
    files = listMigrations(options.migrationsDir ?? defaultMigrationsDir());
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (options.dryRun) {
    console.log(`db-push: plan for target=${target} (${files.length} files, no changes made)`);
    for (const file of files) console.log(`db-push:   ${file}`);
    return;
  }
  const url = options.databaseUrl ?? process.env.DATABASE_URL ?? null;
  if (!url) {
    fail("missing database URL: pass --database-url or set DATABASE_URL.");
  }
  const databaseUrl = url as string;
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    fail("database URL must be a postgres connection string.");
  }
  if (isProductionTarget(target) && !options.allowProduction) {
    fail('refusing production target without --allow-production.');
  }
  if (!Bun.which("psql")) {
    fail("psql not found on PATH. Install PostgreSQL client tools first.");
  }
  console.log(`db-push: target=${target} database=${redactUrl(databaseUrl)} files=${files.length}`);
  const started = Date.now();
  for (const file of files) {
    const result = Bun.spawnSync({
      cmd: [Bun.which("psql") as string, databaseUrl, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", file],
      stdout: "pipe",
      stderr: "pipe",
    });
    if (result.exitCode !== 0) {
      const detail = result.stderr.toString().trim().split("\n").slice(-5).join("\n");
      console.error(`db-push: FAIL ${file}\n${detail}`);
      console.error(`db-push: stopped at ${file}. Fix it, then re-run to resume.`);
      process.exit(2);
    }
    console.log(`db-push: ok ${file}`);
  }
  console.log(`db-push: done ${files.length} files in ${Date.now() - started}ms.`);
}

main();
