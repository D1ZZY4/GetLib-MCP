"use client";

import { Card } from "@heroui/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { LibraryStatRow } from "@/web/lib/statistics";
import { ChartTooltipCard } from "@/web/components/charts/chart-tooltip";
import { chartFills } from "@/web/components/charts/chart-theme";

export function DocsShareChart({ rows }: { rows: LibraryStatRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="h-full">
        <Card.Header>
          <Card.Title>Docs pages share</Card.Title>
          <Card.Description>Indexed pages per library</Card.Description>
        </Card.Header>
        <Card.Content>
          <p role="status" className="py-8 text-center text-sm text-muted">
            No indexed pages recorded yet.
          </p>
        </Card.Content>
      </Card>
    );
  }
  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Docs pages share</Card.Title>
          <Card.Description>Indexed pages per library</Card.Description>
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart accessibilityLayer>
            <Tooltip content={<ChartTooltipCard />} />
            <Pie
              data={rows}
              dataKey="docsPages"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              strokeWidth={0}
            >
              {rows.map((row, index) => (
                <Cell key={row.id} fill={chartFills[index % chartFills.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="Docs pages legend">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-2 text-xs text-muted">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: chartFills[index % chartFills.length] }}
              />
              <span className="truncate">
                {row.name} · <span className="tabular-nums">{row.docsPages}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card.Content>
    </Card>
  );
}
