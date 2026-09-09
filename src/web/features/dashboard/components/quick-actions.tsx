"use client";

import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { ActivityIcon, BoltIcon, SearchIcon } from "@/web/components/ui/icons";

const QUICK_ACTIONS = [
  {
    id: "search",
    title: "Search libraries",
    description: "Resolve a package and browse its docs.",
    buttonLabel: "Search libraries",
    href: "/discover",
    icon: SearchIcon,
  },
  {
    id: "analyze",
    title: "Analyze project",
    description: "Scan imports and detect outdated packages.",
    buttonLabel: "Analyze project",
    href: "/statistics",
    icon: ActivityIcon,
  },
  {
    id: "automate",
    title: "Connect AI agent",
    description: "Install GetLib into your AI agent.",
    buttonLabel: "Install now",
    href: "/install",
    icon: BoltIcon,
  },
] as const;

export function QuickActionsPanel() {
  const router = useRouter();

  return (
    <section aria-label="Quick actions" className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Quick actions</h2>
        <p className="mt-0.5 text-sm text-muted">Search, analyze, and connect.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Card key={action.id} className="flex h-full flex-col">
            <action.icon className="size-6 text-accent" />
            <Card.Header>
              <Card.Title>{action.title}</Card.Title>
              <Card.Description>{action.description}</Card.Description>
            </Card.Header>
            <Card.Footer className="mt-auto">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onPress={() => router.push(action.href)}
              >
                {action.buttonLabel}
              </Button>
            </Card.Footer>
          </Card>
        ))}
      </div>
    </section>
  );
}
