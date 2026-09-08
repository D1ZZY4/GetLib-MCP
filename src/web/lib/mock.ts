import { useEffect, useState } from "react";

/**
 * Resolves static mock data asynchronously so pages can render skeleton
 * loading states exactly like they will with real API calls later.
 * MOCK ONLY: replace with a real fetch when the /api backend lands.
 */
export function useMockData<T>(data: T, delayMs = 350): { data: T; loading: boolean } {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return { data, loading };
}
