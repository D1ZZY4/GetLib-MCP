"use client";

import { useEffect, useRef, useState } from "react";

export interface ApiDataOptions {
  /**
   * Background refresh cadence in milliseconds. The first load behaves
   * exactly as before (skeleton, then data or error); refreshes are
   * silent - no skeleton flash - and never clear already-loaded data
   * when a single poll fails. Refresh pauses while the tab is hidden
   * and fires once immediately when the tab becomes visible again.
   */
  refreshIntervalMs?: number;
}

/**
 * Shared async-data hook for dashboard views.
 *
 * Replaces the per-component useEffect + cancelled-flag fetch pattern with
 * one lifecycle: load once, ignore late responses after unmount, and expose
 * a stable { data, loading, error, retry } tuple. UI state only - the fetch
 * itself stays in the feature service so the API boundary is unchanged.
 */
export function useApiData<T>(
  load: () => Promise<T>,
  fallbackError: string,
  options?: ApiDataOptions,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const dataRef = useRef<T | null>(null);
  dataRef.current = data;
  const seqRef = useRef(0);
  const refreshIntervalMs = options?.refreshIntervalMs;

  useEffect(() => {
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    let cancelled = false;
    // Only the very first attempt shows the skeleton. Background refreshes
    // swap data in place so live views never flicker.
    const silent = dataRef.current !== null;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    loadRef
      .current()
      .then((result) => {
        // Stale-wins guard: a slow earlier poll resolving after a newer one
        // must not overwrite fresher data.
        if (!cancelled && seqRef.current === seq) {
          setData(result);
          setError(null);
        }
      })
      .catch((error: unknown) => {
        // A failed background poll keeps the last good data on screen;
        // only a failed first load surfaces the error state. Preserve the
        // real failure message when it is safe to display so diagnosis does
        // not lose the cause behind a generic fallback.
        if (!cancelled && dataRef.current === null) {
          const message = error instanceof Error && error.message.trim().length > 0 ? error.message : fallbackError;
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled && seqRef.current === seq) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // load and fallbackError are intentionally stable per caller (module-scope
    // service functions and constant strings), so re-running only on retry.
  }, [attempt]);

  useEffect(() => {
    if (refreshIntervalMs === undefined || refreshIntervalMs <= 0) return;
    const tick = () => {
      if (!document.hidden) {
        setAttempt((n) => n + 1);
      }
    };
    const timer = window.setInterval(tick, refreshIntervalMs);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshIntervalMs]);

  return { data, loading, error, retry: () => setAttempt((n) => n + 1) };
}
