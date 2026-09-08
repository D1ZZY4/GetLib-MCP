import { Skeleton } from "@heroui/react";

/**
 * Neutral loading shell for auth gates. Rendered identically on server
 * and first client paint (before mount) so hydration never mismatches.
 */
export function GateLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto flex min-h-[60vh] w-full max-w-6xl flex-col items-center justify-center gap-3 px-4"
    >
      <Skeleton className="h-8 w-56 rounded-xl" />
      <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
      <Skeleton className="h-4 w-60 max-w-full rounded-lg" />
    </div>
  );
}
