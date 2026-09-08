"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChartIcon,
  ChevronsRightIcon,
  DatabaseIcon,
  DownloadIcon,
  GridIcon,
  LibraryIcon,
  SearchIcon,
  TerminalIcon,
} from "../ui/icons";

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
  children?: NavChild[];
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
      { href: "/install", label: "Install", icon: DownloadIcon },
      {
        href: "/mcp",
        label: "MCP",
        icon: TerminalIcon,
        children: [
          { href: "/mcp", label: "Overview" },
          { href: "/mcp/servers", label: "Servers" },
          { href: "/mcp/tools", label: "Tools" },
          { href: "/mcp/resources", label: "Resources" },
          { href: "/mcp/prompts", label: "Prompts" },
          { href: "/mcp/playground", label: "Playground" },
          { href: "/mcp/clients", label: "Clients" },
          { href: "/mcp/logs", label: "Logs" },
          { href: "/mcp/health", label: "Health" },
        ],
      },
    ],
  },
  {
    label: "Docs",
    items: [{ href: "/docs", label: "Docs", icon: LibraryIcon }],
  },
  {
    label: "Settings",
    items: [{ href: "/sources", label: "Sources", icon: DatabaseIcon }],
  },
];

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClasses = (collapsed: boolean) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground aria-[current=page]:bg-surface-tertiary aria-[current=page]:text-foreground ${
    collapsed ? "justify-center" : ""
  }`;

function DrillDownItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const submenuId = `sidebar-submenu-${item.href.replace(/\//g, "-")}`;
  const containsActive = (item.children ?? []).some((child) => isActiveLink(pathname, child.href));
  const [open, setOpen] = useState(containsActive);

  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive, pathname]);

  // A child pointing at the parent href (Overview -> /mcp) must only match
  // exactly. Otherwise the /mcp prefix matches every /mcp/* page and both
  // Overview and the real child render as selected at the same time.
  const isChildActive = (child: NavChild): boolean =>
    child.href === item.href ? pathname === child.href : isActiveLink(pathname, child.href);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={submenuId}
        className={`${linkClasses(false)} w-full`}
      >
        <item.icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronsRightIcon
          className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open ? (
        <ul id={submenuId} aria-label={`${item.label} submenu`} className="mt-0.5 flex flex-col gap-0.5">
          {(item.children ?? []).map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onNavigate}
                aria-current={isChildActive(child) ? "page" : undefined}
                className={`${linkClasses(false)} py-1.5 pl-10 text-[13px]`}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
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
            {group.items.map((item) =>
              item.children !== undefined && !collapsed ? (
                <DrillDownItem
                  key={`${group.label}-${item.href}`}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ) : (
                <li key={`${group.label}-${item.href}`}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    aria-current={isActiveLink(pathname, item.href) ? "page" : undefined}
                    className={linkClasses(collapsed)}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </nav>
  );
}
