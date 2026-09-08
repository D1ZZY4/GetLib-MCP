"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "../../../components/ui/icons";

const HIGHLIGHTS = [
  "Resolve any library to version-accurate docs",
  "Best practices backed by cited sources",
  "One MCP server for every AI agent",
] as const;

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-linear-to-br from-accent/15 via-surface to-surface-secondary lg:block dark:from-accent/25 dark:via-surface dark:to-accent/10"
      >
        <div className="pointer-events-none absolute -top-16 -left-16 size-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 size-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-foreground">
            G
          </span>
          <div>
            <p className="max-w-md text-3xl font-semibold tracking-tight text-balance">
              Library docs your agents can trust
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {HIGHLIGHTS.map((highlight) => (
                <li key={highlight} className="flex items-center gap-2.5 text-sm text-muted">
                  <CheckIcon className="size-4 shrink-0 text-accent" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted">Self-hosted MCP control plane</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">{children}</div>
    </main>
  );
}
