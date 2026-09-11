"use client";

import { useMemo, useState } from "react";
import type { SortDescriptor } from "@heroui/react";
import { Card, Table } from "@heroui/react";
import { EmptyState } from "@/web/components/ui/empty-state";
import { Pill } from "@/web/components/ui/pill";
import { formatLogTime, formatPercent } from "@/web/lib/format";
import type { LibraryUsage } from "@/web/lib/statistics";

function rateTone(rate: number): string {
  if (rate >= 0.9) return "bg-success/10 text-success";
  if (rate >= 0.5) return "bg-warning/10 text-warning";
  return "bg-danger/10 text-danger";
}

interface LibraryTableProps {
  libraries: LibraryUsage[];
}

export function LibraryTable({ libraries }: LibraryTableProps) {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "uses",
    direction: "descending",
  });

  const sorted = useMemo(() => {
    const rows = [...libraries];
    const direction = sortDescriptor.direction === "descending" ? -1 : 1;
    if (sortDescriptor.column === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name) * direction);
    } else {
      rows.sort((a, b) => (a.uses - b.uses) * direction);
    }
    return rows;
  }, [libraries, sortDescriptor]);

  if (libraries.length === 0) {
    return (
      <EmptyState
        title="No library usage yet"
        description="Resolve a library or fetch its docs and it will appear here."
      />
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>Most used libraries</Card.Title>
        <Card.Description>Ranked by real tool calls about each library</Card.Description>
      </Card.Header>
      <Card.Content>
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Most used libraries"
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
            >
              <Table.Header>
                <Table.Column allowsSorting isRowHeader id="name">
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Library
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id="uses">
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Uses
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column id="success">Success</Table.Column>
                <Table.Column id="lastUsed">Last used</Table.Column>
              </Table.Header>
              <Table.Body>
                {sorted.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>
                      <span className="font-mono text-xs">{row.name}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="tabular-nums">{row.uses}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <Pill tone={rateTone(row.successRate)}>{formatPercent(row.successRate)}</Pill>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs text-muted tabular-nums">
                        {formatLogTime(row.lastUsedAt)}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  );
}
