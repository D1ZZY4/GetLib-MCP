"use client";

import { useSession } from "@/web/providers/auth-provider";
import { SidebarNav } from "./sidebar-nav";
import { ThemeControls } from "./theme-controls";
import { ChevronsLeftIcon, ChevronsRightIcon } from "../ui/icons";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function sessionInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { session, signOut } = useSession();

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface px-4 py-5 transition-[width] lg:flex ${
        collapsed ? "w-[76px] items-center" : "w-64"
      }`}
    >
      <div className={`flex items-center gap-2.5 ${collapsed ? "" : "px-2"}`}>
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-base font-bold text-accent-foreground"
        >
          G
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold">GetLib MCP</p>
            <p className="font-mono text-[11px] text-muted tabular-nums">v0.1.0</p>
          </div>
        )}
      </div>

      <div className="mt-6 min-h-0 w-full flex-1 overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>

      <div
        className={`mt-4 flex items-center gap-2 border-t border-border pt-4 ${
          collapsed ? "w-full flex-col" : ""
        }`}
      >
        {session !== null && !collapsed ? (
          <>
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent"
            >
              {sessionInitial(session.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-muted">{session.email}</span>
            <button
              type="button"
              onClick={signOut}
              className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
            >
              Sign out
            </button>
          </>
        ) : null}
        {session !== null && collapsed ? (
          <span
            aria-hidden="true"
            title={session.email}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent"
          >
            {sessionInitial(session.name)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          {collapsed ? (
            <ChevronsRightIcon className="size-4" />
          ) : (
            <ChevronsLeftIcon className="size-4" />
          )}
        </button>
        <div className={collapsed ? "" : "ml-auto shrink-0"}>
          <ThemeControls />
        </div>
      </div>
    </aside>
  );
}
