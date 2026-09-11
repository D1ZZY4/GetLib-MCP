"use client";

interface PersistenceWriteWarningProps {
  writeHealth?: {
    failedWrites: number;
    lastSink: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
  };
}

/**
 * Loud surface for swallowed persistence failures. Best-effort writers
 * never fail requests, so without this banner a broken sink looks
 * exactly like an idle one: empty tables, healthy probes, no trace.
 * Renders nothing when no failure has been recorded this process.
 */
export function PersistenceWriteWarning({ writeHealth }: PersistenceWriteWarningProps) {
  if (!writeHealth || writeHealth.failedWrites === 0) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      {writeHealth.failedWrites} database {writeHealth.failedWrites === 1 ? "write" : "writes"} failed
      {writeHealth.lastSink ? ` (latest: ${writeHealth.lastSink})` : ""}. Data shown
      may be incomplete.
      {writeHealth.lastError ? ` Latest error: ${writeHealth.lastError}` : ""}
    </p>
  );
}
