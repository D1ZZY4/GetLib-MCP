"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartIcon,
  DatabaseIcon,
  DownloadIcon,
  FlaskIcon,
  GridIcon,
  HeartPulseIcon,
  SearchIcon,
  TerminalIcon,
  UsersIcon,
} from "../ui/icons";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const SIDEBAR_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: GridIcon },
      { href: "/discover", label: "Discover", icon: SearchIcon },
      { href: "/statistics", label: "Statistics", icon: ChartIcon },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/sources", label: "Sources", icon: DatabaseIcon },
      { href: "/install", label: "Install", icon: DownloadIcon },
      { href: "/mcp", label: "MCP", icon: TerminalIcon },
      { href: "/mcp/playground", label: "Playground", icon: FlaskIcon },
      { href: "/mcp/clients", label: "Clients", icon: UsersIcon },
      { href: "/mcp/health", label: "Health", icon: HeartPulseIcon },
    ],
  },
];

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-5">
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-widest text-muted uppercase">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={`${group.label}-${item.href}`}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  aria-current={isActiveLink(pathname, item.href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground aria-[current=page]:bg-surface-tertiary aria-[current=page]:text-foreground ${
                    collapsed ? "justify-center" : ""
                  }`}
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
