import { ensureBootstrapAccount } from "@/application/auth/auth.service";
import { ensureRegistryLoaded } from "./registry/registry-loader";
import { validateProductionPolicy } from "./runtime";
import { log } from "./utils/logger";

let initialized = false;

/**
 * Application initialization lifecycle (startup order):
 * registry - observability - bootstrap. Idempotent and safe to call
 * from stdio entry, tests, or first-request adapters. Production with
 * missing database configuration fails fast here.
 */
export async function initializeApplication(): Promise<void> {
  if (initialized) return;
  initialized = true;
  ensureRegistryLoaded();
  try {
    validateProductionPolicy();
  } catch (error) {
    log({ level: "error", msg: "init.production-policy-failed", error: String(error) });
    throw error;
  }
  try {
    await ensureBootstrapAccount();
  } catch (error) {
    log({ level: "warn", msg: "init.bootstrap-failed", error: String(error) });
  }
  log({ level: "info", msg: "init.ready" });
}

export function resetInitialization(): void {
  initialized = false;
}
