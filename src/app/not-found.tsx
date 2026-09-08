import Link from "next/link";
import { PageContainer } from "@/web/components/layout/page-container";

const SHORTCUTS = [
  { href: "/", label: "Dashboard" },
  { href: "/discover", label: "Discover" },
  { href: "/docs", label: "Docs" },
  { href: "/mcp", label: "MCP" },
] as const;

export default function NotFound() {
  return (
    <PageContainer variant="center">
      <div className="relative flex w-full flex-col items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
        />
        <p className="font-mono text-sm text-accent tabular-nums">Error 404</p>
        <h1
          aria-label="404 - page not found"
          className="mt-2 bg-linear-to-b from-foreground to-foreground/40 bg-clip-text text-8xl font-bold tracking-tight text-transparent tabular-nums sm:text-9xl"
        >
          404
        </h1>
        <p className="mt-4 text-xl font-semibold tracking-tight">This page went missing</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          We can&apos;t find the page you&apos;re looking for. It may have moved, or the link
          is wrong.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Back to dashboard
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary"
          >
            Discover libraries
          </Link>
        </div>
        <nav aria-label="Helpful pages" className="mt-8 flex items-center gap-1 text-sm">
          {SHORTCUTS.map((shortcut, index) => (
            <span key={shortcut.href} className="flex items-center gap-1">
              {index > 0 ? (
                <span aria-hidden="true" className="text-border">
                  /
                </span>
              ) : null}
              <Link
                href={shortcut.href}
                className="rounded px-1.5 py-1 text-muted transition-colors hover:text-foreground"
              >
                {shortcut.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </PageContainer>
  );
}
