"use client";

import { Card } from "@heroui/react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { LibraryFetch } from "../services/statistics-api.service";
import { ChartTooltipCard } from "./chart-tooltip";
import { chartFills } from "./chart-theme";

export function FetchRadial({ fetches }: { fetches: LibraryFetch[] }) {
  const data = fetches.map((entry, index) => ({
    ...entry,
    fill: chartFills[index % chartFills.length],
  }));

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Fetch share</Card.Title>
          <Card.Description>Doc fetches per library, radial view</Card.Description>
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={240}>
          <RadialBarChart
            accessibilityLayer
            data={data}
            innerRadius="30%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, "dataMax"]} tick={false} />
            <Tooltip content={<ChartTooltipCard />} />
            <RadialBar dataKey="fetches" background={{ fill: "var(--surface-tertiary)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="Fetch share legend">
          {data.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 text-xs text-muted">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="truncate">
                {entry.name} · <span className="tabular-nums">{entry.fetches}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card.Content>
    </Card>
  );
}
