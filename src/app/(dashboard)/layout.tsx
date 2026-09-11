"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/web/providers/auth-provider";
import { GateLoader } from "@/web/components/feedback/gate-loader";
import { LoadError } from "@/web/components/ui/load-error";
import { MobileNav } from "@/web/components/layout/mobile-nav";
import { Sidebar } from "@/web/components/layout/sidebar";

const SIDEBAR_KEY = "getlib-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, authEnabled, configError, retryConfig } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // Post-mount only, so the server render never mismatches hydration.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(readCollapsed());
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // Storage is optional.
      }
      return next;
    });
  };

  useEffect(() => {
    // Wait for the auth-mode probe: redirecting while authEnabled is still
    // loading would force a login wall when authentication is disabled.
    if (mounted && authEnabled !== null && session === null) {
      router.replace("/signin");
    }
  }, [mounted, authEnabled, session, router]);

  if (!mounted) {
    // Matches the server render (no session server-side) so the first
    // paint already shows loading skeletons instead of a blank page.
    return <GateLoader label="Loading dashboard" />;
  }

  if (session === null) {
    if (configError !== null) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <LoadError message={configError} onRetry={retryConfig} />
        </div>
      );
    }
    return <GateLoader label="Loading dashboard" />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        {/* tabIndex makes the skip-link target focusable in every browser. */}
        <div id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </div>
      </div>
    </div>
  );
}
