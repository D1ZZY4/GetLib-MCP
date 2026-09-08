"use client";

import { useState } from "react";
import { Button, Drawer } from "@heroui/react";
import { ProfileMenu } from "./profile-menu";
import { SidebarNav } from "./sidebar-nav";
import { ThemeControls } from "./theme-controls";
import { MenuIcon } from "../ui/icons";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex w-full items-center gap-2 px-4 pt-4 sm:px-6 lg:hidden">
        <Button
          variant="secondary"
          size="sm"
          onPress={() => setIsOpen(true)}
          aria-label="Open navigation menu"
        >
          <MenuIcon className="size-4" />
          Menu
        </Button>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground"
          >
            G
          </span>
          <span className="text-sm font-semibold">GetLib MCP</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ProfileMenu />
          <ThemeControls />
        </div>
      </div>

      <Drawer.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Content placement="left">
          <Drawer.Dialog aria-label="Site navigation">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>Navigation</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <SidebarNav onNavigate={() => setIsOpen(false)} />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}
