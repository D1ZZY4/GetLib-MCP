"use client";

import { useEffect, useState } from "react";
import {
  fetchRuntimeInfo,
  type RuntimeInfo,
} from "@/web/features/settings/services/runtime-api.service";

type Environment = "development" | "production";

// Module-level cached request so sidebar, profile menu, and pages share one
// fetch instead of each firing their own runtime probe.
let inflight: Promise<RuntimeInfo> | null = null;

function loadRuntime(): Promise<RuntimeInfo> {
  if (!inflight) {
    inflight = fetchRuntimeInfo().catch((error: unknown) => {
      inflight = null;
      throw error;
    });
  }
  return inflight;
}

/**
 * Current runtime environment for environment-aware UI.
 * Fail-closed: while loading or on error, nothing is development-only, so
 * development surfaces stay hidden until the backend confirms development.
 */
export function useEnvironment() {
  const [environment, setEnvironment] = useState<Environment | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRuntime().then(
      (runtime) => {
        if (!cancelled) setEnvironment(runtime.environment);
      },
      () => {
        if (!cancelled) setEnvironment(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    environment,
    isDevelopment: environment === "development",
    isProduction: environment === "production",
    loading: environment === null,
  };
}
