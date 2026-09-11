"use client";

import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { EmptyState } from "@/web/components/ui/empty-state";
import type { MockLibrary } from "@/web/types/library";
import { libraryStatusTone } from "@/web/components/ui/status-tone";
import { Pill } from "@/web/components/ui/pill";
import { ArrowRightIcon } from "@/web/components/ui/icons";

interface ProjectSummaryCardProps {
  libraries: MockLibrary[];
}

export function statusLabel(status: string): string {
  switch (status) {
    case "up-to-date":
      return "Up to date";
    case "outdated":
      return "Outdated";
    case "vulnerable":
      return "Vulnerable";
    default:
      return status;
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
          <EmptyState
            title="No libraries tracked yet"
            description="Add your first library to see versions and status here."
          />
        ) : (
          <ul className="-mx-1" aria-label="Active libraries">
            {libraries.map((lib) => (
              <li
                key={lib.id}
                className="flex items-center justify-between gap-3 rounded-lg px-1 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={lib.name}>{lib.name}</p>
                  <p className="font-mono text-xs text-muted tabular-nums">
                    {lib.installedVersion} → {lib.latestVersion}
                  </p>
                </div>
                <Pill tone={libraryStatusTone(lib.status)} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                  {statusLabel(lib.status)}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
      <Card.Footer>
        <Button variant="ghost" size="sm" onPress={() => router.push("/discover")}>
          Discover libraries
          <ArrowRightIcon aria-hidden="true" className="size-3.5" />
        </Button>
      </Card.Footer>
    </Card>
  );
}
