import { Card } from "@heroui/react";
import type { LibraryStatRow } from "@/web/lib/statistics";
import { EmptyState } from "@/web/components/ui/empty-state";
import { Pill } from "@/web/components/ui/pill";
import { libraryStatusTone } from "@/web/components/ui/status-tone";
import { statusLabel } from "@/web/features/dashboard/components/project-summary-card";

interface LibraryTableProps {
  rows: LibraryStatRow[];
}

export function LibraryTable({ rows }: LibraryTableProps) {
  if (rows.length === 0) {
    return <EmptyState title="No libraries yet" description="Libraries appear here once usage is recorded." />;
  }
  return (
    <Card>
      <Card.Header>
        <Card.Title>Libraries</Card.Title>
          <Card.Description>Installed versions and docs coverage</Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Library
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Installed
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Latest
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-2 font-medium tabular-nums">
                  Docs pages
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="py-2.5 pr-4 font-medium">
                    {row.name}
                  </th>
                  <td className="py-2.5 pr-4 font-mono text-xs tabular-nums">
                    {row.installedVersion}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs tabular-nums">
                    {row.latestVersion}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Pill tone={libraryStatusTone(row.status)}>{statusLabel(row.status)}</Pill>
                  </td>
                  <td className="py-2.5 text-xs tabular-nums">{row.docsPages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card.Content>
    </Card>
  );
}
