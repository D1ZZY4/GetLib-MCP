import { Card } from "@heroui/react";
import type { LibraryStatRow } from "../services/statistics.service";

interface LibraryTableProps {
  rows: LibraryStatRow[];
}

export function LibraryTable({ rows }: LibraryTableProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Libraries</Card.Title>
        <Card.Description>Installed versions and mock docs coverage</Card.Description>
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
                  <td className="py-2.5 pr-4 text-xs text-muted capitalize">{row.status}</td>
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
