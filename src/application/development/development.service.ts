import {
  detectEnvironment,
  getDatabaseModePolicy,
  getRuntimeSnapshot,
  setDatabaseModeOverride,
  type DatabaseMode,
  type DatabaseModeSelection,
} from "@/server/mcp/runtime";
import { ensureBootstrapAccount, resetBootstrapCache, type AuthDeps } from "@/application/auth/auth.service";

/**
 * Capability seams of the development mutations. Bootstrap persistence
 * arrives as the auth seam (forwarded, never re-wired); repository-cache
 * invalidation is infrastructure injected here so reseed flows stay
 * testable without touching the global factory. Runtime policy stays
 * directly owned.
 */
export interface DevelopmentDeps {
  auth: AuthDeps;
  resetDatabaseCache: () => void;
}

export class DevelopmentForbiddenError extends Error {
  constructor(message = "Development settings cannot be changed in production.") {
    super(message);
    this.name = "DevelopmentForbiddenError";
  }
}

export interface DevelopmentSettingsSnapshot {
  environment: "development" | "production";
  editable: boolean;
  databaseMode: DatabaseMode;
  envDefault: DatabaseMode;
  override: DatabaseModeSelection | null;
  availableModes: DatabaseModeSelection[];
  supabaseConfigured: boolean;
}

/**
 * Development settings capability shared by Web and API. GET works in any
 * environment (production renders an unavailable notice); mutations are
 * development-only and fail closed in production.
 */
export function getDevelopmentSettings(): DevelopmentSettingsSnapshot {
  const environment = detectEnvironment();
  const policy = getDatabaseModePolicy(environment);
  return {
    environment,
    editable: environment === "development",
    databaseMode: policy.effective,
    envDefault: policy.envDefault,
    override: policy.override,
    availableModes: ["mock", "supabase"],
    supabaseConfigured: getRuntimeSnapshot().supabaseConfigured,
  };
}

/**
 * Realtime database-mode switch. Applies immediately to this server process
 * (no restart). Passing null clears the override back to the env default.
 * Production rejects every mutation, including the reset.
 */
export function updateDatabaseMode(mode: DatabaseModeSelection | null): DevelopmentSettingsSnapshot {
  if (detectEnvironment() === "production") {
    throw new DevelopmentForbiddenError();
  }
  setDatabaseModeOverride(mode);
  return getDevelopmentSettings();
}

function requireDevelopment(): void {
  if (detectEnvironment() === "production") {
    throw new DevelopmentForbiddenError("Seed and reset are development-only.");
  }
}

/**
 * Seed development state: idempotently ensures the bootstrap record
 * exists. Safe to call repeatedly. Production always rejects.
 */
export async function seedDevelopmentData(deps: DevelopmentDeps): Promise<DevelopmentSettingsSnapshot> {
  requireDevelopment();
  await ensureBootstrapAccount(deps.auth);
  return getDevelopmentSettings();
}

/**
 * Reset development state: clears in-memory mock data and reseeds the
 * bootstrap record. Real database modes are never wiped - only the
 * bootstrap record is re-ensured. Production always rejects.
 */
export async function resetDevelopmentData(deps: DevelopmentDeps): Promise<DevelopmentSettingsSnapshot> {
  requireDevelopment();
  deps.resetDatabaseCache();
  resetBootstrapCache();
  await ensureBootstrapAccount(deps.auth);
  return getDevelopmentSettings();
}
