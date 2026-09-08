/**
 * Single home for date/time formatting in web surfaces. Keeps timeline,
 * log, and activity copy rendering identical timestamps everywhere.
 */
function parseIso(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatActivityTime(iso: string): string {
  const date = parseIso(iso);
  if (date === null) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLogTime(iso: string): string {
  const date = parseIso(iso);
  if (date === null) return iso;
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
