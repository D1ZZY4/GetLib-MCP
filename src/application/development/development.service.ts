import {
  detectEnvironment,
  getDatabaseModePolicy,
  getRuntimeSnapshot,
  setDatabaseModeOverride,
  type DatabaseMode,
  type DatabaseModeSelection,
} from "@/server/mcp/runtime";

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
