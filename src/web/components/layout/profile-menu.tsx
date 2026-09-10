"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/web/providers/auth-provider";
import { useEnvironment } from "@/web/features/development/hooks/use-environment";

function sessionInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

interface ProfileMenuItem {
  id: string;
  label: string;
  href: string;
  developmentOnly?: boolean;
}

const MENU_ITEMS: ProfileMenuItem[] = [
  { id: "profile", label: "Profile", href: "/settings?tab=profile" },
  { id: "account", label: "Account", href: "/settings?tab=account" },
  { id: "preferences", label: "Preferences", href: "/settings?tab=preferences" },
  { id: "development", label: "Development", href: "/developments", developmentOnly: true },
  { id: "security", label: "Security", href: "/settings?tab=security" },
  { id: "about", label: "About", href: "/settings?tab=about" },
];

/**
 * Profile/avatar access point for secondary account and application
 * settings. Auth-aware: Sign out only appears with an active session.
 */
export function ProfileMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { session, authEnabled, signOut } = useSession();
  const { isDevelopment } = useEnvironment();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visibleItems = MENU_ITEMS.filter((item) => !item.developmentOnly || isDevelopment);

  useEffect(() => {
    if (!open) return;
    itemRefs.current = itemRefs.current.slice(0, visibleItems.length + 1);
    // Move focus into the menu on open for keyboard users.
    itemRefs.current[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
      if (items.length === 0) return;
      event.preventDefault();
      const active = document.activeElement;
      let index = items.findIndex((el) => el === active);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = items.length - 1;
      else if (index === -1) index = event.key === "ArrowUp" ? items.length - 1 : 0;
      else index = (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[index]?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, visibleItems.length ]);

  if (session === null) {
    // Auth mode still resolving: keep layout space with a placeholder
    // instead of dropping the avatar.
    if (authEnabled === null) {
      return (
        <span
          aria-hidden="true"
          className="size-8 shrink-0 animate-pulse rounded-full bg-surface-tertiary"
        />
      );
    }
    return null;
  }
  const hasSession = authEnabled !== false || session.email !== "guest@localhost";

  const showSignOut = hasSession && authEnabled !== false;
  // Index for keyboard navigation refs: visible items first, sign out last.
  let itemIndex = -1;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${session.email}`}
        title={collapsed ? session.email : undefined}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        <span aria-hidden="true">{sessionInitial(session.name)}</span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Profile and settings"
          className="absolute bottom-10 left-0 z-dropdown w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{session.name}</p>
            <p className="truncate text-xs text-muted">{session.email}</p>
            <p className="mt-1 text-xs text-muted">
              {authEnabled === true ? "Authentication: enabled" : "Authentication: disabled"}
            </p>
          </div>
          <div aria-hidden="true" className="my-1 h-px bg-border" />
          {visibleItems.map((item) => {
            itemIndex += 1;
            const refIndex = itemIndex;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[refIndex] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  router.push(item.href);
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                {item.label}
              </button>
            );
          })}
          {showSignOut ? (
            <>
              <div aria-hidden="true" className="my-1 h-px bg-border" />
              <button
                type="button"
                role="menuitem"
                ref={(el) => {
                  itemRefs.current[visibleItems.length] = el;
                }}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                  signOut();
                  router.replace("/signin");
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                Sign out
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
