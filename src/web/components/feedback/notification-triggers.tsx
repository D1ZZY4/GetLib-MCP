"use client";

import { Button, Card, toast } from "@heroui/react";

export type NotifyLevel = "error" | "debug" | "critical" | "info" | "warning";

const TRIGGERS: Array<{ level: NotifyLevel; label: string }> = [
  { level: "error", label: "Error" },
  { level: "debug", label: "Debug" },
  { level: "critical", label: "Critical" },
  { level: "info", label: "Info" },
  { level: "warning", label: "Warning" },
];

/**
 * Fire a toast for one notification level. Critical stays on screen until
 * dismissed; the rest auto-dismiss.
 */
export function triggerNotification(level: NotifyLevel): void {
  switch (level) {
    case "error":
      toast.danger("Something went wrong", {
        description: "The request failed. Try again in a moment.",
      });
      break;
    case "critical":
      toast.danger("Critical failure", {
        description: "Immediate attention required. This stays until dismissed.",
        timeout: 0,
      });
      break;
    case "warning":
      toast.warning("Check your settings", {
        description: "Something needs attention before continuing.",
      });
      break;
    case "info":
      toast.info("New update available", {
        description: "A newer version is ready to install.",
      });
      break;
    case "debug":
      toast("Debug trace", {
        description: "Verbose diagnostic detail for developers.",
      });
      break;
  }
}

export function NotificationTriggers() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Notifications</Card.Title>
        <Card.Description>Trigger one toast per level.</Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="flex flex-wrap gap-2">
          {TRIGGERS.map((entry) => (
            <Button
              key={entry.level}
              size="sm"
              variant="secondary"
              onPress={() => triggerNotification(entry.level)}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
