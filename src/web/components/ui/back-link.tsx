import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Canonical "back to list" navigation link for detail pages.
 * Single owner for the back-navigation visual so every detail view
 * (servers, tools, resources, prompts, clients, logs, docs) reads alike.
 */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors outline-none hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      {children}
    </Link>
  );
}
