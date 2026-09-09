"use client";

import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import type { MockLibrary } from "@/web/types/library";
import { ArrowRightIcon } from "@/web/components/ui/icons";

interface ProjectSummaryCardProps {
  libraries: MockLibrary[];
}

function statusLabel(status: MockLibrary["status"]): string {
  switch (status) {
    case "up-to-date":
      return "Up to date";
    case "outdated":
      return "Outdated";
    case "vulnerable":
      return "Vulnerable";
  }
}

export function ProjectSummaryCard({ libraries }: ProjectSummaryCardProps) {
  const router = useRouter();

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Project summary</Card.Title>
          <Card.Description>Installed libraries with versions</Card.Description>
      </Card.Header>
      <Card.Content>
        {libraries.length === 0 ? (
          <p className="text-sm text-muted">No libraries tracked yet. Add your first library to see versions and status here.</p>
        ) : (
          <ul className="-mx-1" aria-label="Active libraries">
            {libraries.map((lib) => (
              <li
                key={lib.id}
                className="flex items-center justify-between gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-surface-secondary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{lib.name}</p>
                  <p className="font-mono text-xs text-muted tabular-nums">
                    {lib.installedVersion} → {lib.latestVersion}
                  </p>
                </div>
                <span
                  data-status={lib.status}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium data-[status=up-to-date]:bg-success/10 data-[status=up-to-date]:text-success data-[status=outdated]:bg-warning/10 data-[status=outdated]:text-warning data-[status=vulnerable]:bg-danger/10 data-[status=vulnerable]:text-danger"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-current"
                  />
                  {statusLabel(lib.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
      <Card.Footer>
        <Button variant="ghost" size="sm" onPress={() => router.push("/discover")}>
          Discover libraries
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </Card.Footer>
    </Card>
  );
}
