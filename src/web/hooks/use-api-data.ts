"use client";

import { useEffect, useState } from "react";

/**
 * Shared async-data hook for dashboard views.
 *
 * Replaces the per-component useEffect + cancelled-flag fetch pattern with
 * one lifecycle: load once, ignore late responses after unmount, and expose
 * a stable { data, loading, error, retry } tuple. UI state only - the fetch
 * itself stays in the feature service so the API boundary is unchanged.
 */
export function useApiData<T>(load: () => Promise<T>, fallbackError: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError(fallbackError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // load and fallbackError are intentionally stable per caller (module-scope
    // service functions and constant strings), so re-running only on retry.
  }, [attempt]);

  return { data, loading, error, retry: () => setAttempt((n) => n + 1) };
}
