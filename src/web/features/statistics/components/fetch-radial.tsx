"use client";

import { Card } from "@heroui/react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { LibraryFetch } from "../services/statistics.service";
import { chartTooltipLabelStyle, chartTooltipStyle } from "./chart-theme";

const BAR_FILLS = [
  "var(--accent)",
  "var(--success)",
  "var(--warning)",
  "var(--danger)",
  "var(--muted)",
];

export function FetchRadial({ fetches }: { fetches: LibraryFetch[] }) {
  const data = fetches.map((entry, index) => ({
    ...entry,
    fill: BAR_FILLS[index % BAR_FILLS.length],
  }));

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Fetch share</Card.Title>
        <Card.Description>Mock doc fetches per library, radial view</Card.Description>
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
            <Tooltip
              contentStyle={{ ...chartTooltipStyle }}
              labelStyle={{ ...chartTooltipLabelStyle }}
              itemStyle={{ ...chartTooltipLabelStyle }}
            />
            <RadialBar dataKey="fetches" background={{ fill: "var(--surface-tertiary)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </Card.Content>
    </Card>
  );
}
