import { Card } from "@heroui/react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Canonical empty state primitive. Every data-driven view renders this
 * instead of reimplementing Card plus muted text, so empty UX stays
 * consistent and structural.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <Card.Content>
        <div className="flex flex-col items-start gap-1.5 py-2">
          <p className="text-sm font-medium">{title}</p>
          {description !== undefined && description.length > 0 ? (
            <p className="text-sm text-muted">{description}</p>
          ) : null}
          {action ?? null}
        </div>
      </Card.Content>
    </Card>
  );
}
