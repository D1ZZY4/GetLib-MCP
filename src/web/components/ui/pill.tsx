import type { ReactNode } from "react";

interface PillProps {
  tone: string;
  children: ReactNode;
  className?: string;
  title?: string;
}

/**
 * Shared status pill primitive.
 *
 * Centralizes the pill shape (rounded-full, padding, type scale) so every
 * feature uses one source of truth. Color mapping stays with the caller
 * via statusTone, verdictTone, libraryStatusTone, or availabilityTone.
 * Labels stay with the caller; only shape is centralized.
 * The className prop is layout-only (flex, gap). Never pass colors
 * through it; extend a tone helper instead.
 */
export function Pill({ tone, children, className = "", title }: PillProps) {
  const extra = className.length > 0 ? ` ${className}` : "";
  return (
    <span title={title} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone}${extra}`}>
      {children}
    </span>
  );
}
