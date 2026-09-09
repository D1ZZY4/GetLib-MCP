import { detectEnvironment, resolveDatabaseMode, type DatabaseMode } from "../../runtime";
import { MockDatabaseRepository } from "./mock-repository";
import { SupabaseDatabaseRepository } from "./supabase-repository";
import type { DatabaseRepository, DatabaseStatus } from "./types";

export type { BootstrapRecord, DatabaseHealth, DatabaseRepository, DatabaseStatus, PersistedLogEntry, StoredLogEntry } from "./types";
export { MockDatabaseRepository } from "./mock-repository";
export { SupabaseDatabaseRepository } from "./supabase-repository";

const repositories = new Map<DatabaseMode, DatabaseRepository>();

/**
 * Repository factory behind the persistence boundary. Application code
 * calls getDatabase() - never new MockDatabaseRepository() or Supabase
 * clients directly - so the active mode stays a runtime policy decision.
 *
 * Production can never resolve the mock repository, even when an explicit
 * mode is passed: fail fast instead of serving in-memory data as truth.
 */
export function getDatabase(mode: DatabaseMode = resolveDatabaseMode()): DatabaseRepository {
  if (mode === "mock" && detectEnvironment() === "production") {
    throw new Error("Production must use the real Supabase database - mock mode is not allowed.");
  }
  const existing = repositories.get(mode);
  if (existing) return existing;
  const repo: DatabaseRepository =
    mode === "mock" ? new MockDatabaseRepository() : new SupabaseDatabaseRepository(mode);
  repositories.set(mode, repo);
  return repo;
}

export function getDatabaseStatus(mode: DatabaseMode = resolveDatabaseMode()): Promise<DatabaseStatus> {
  return getDatabase(mode).getStatus();
}

/** Test hook - clears cached repository instances. */
export function resetDatabaseCache(): void {
  repositories.clear();
}
