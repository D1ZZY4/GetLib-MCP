"use client";

import { Card } from "@heroui/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsageDay } from "../services/statistics-api.service";
import { chartAccent, chartAxisTick, chartGridStroke } from "./chart-theme";
import { ChartTooltipCard } from "./chart-tooltip";
import { totalRequests } from "./chart-summary";

interface UsageChartProps {
  days: UsageDay[];
}

function UsageChart({ days }: UsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart accessibilityLayer data={days} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={chartGridStroke} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tick={{ ...chartAxisTick }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          tick={{ ...chartAxisTick }}
        />
        <Tooltip cursor={{ fill: "var(--accent-soft)" }} content={<ChartTooltipCard />} />
        <Bar dataKey="requests" fill={chartAccent} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UsageCard({ days }: UsageChartProps) {
  if (days.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title>Usage</Card.Title>
          <Card.Description>No usage window recorded yet</Card.Description>
        </Card.Header>
        <Card.Content>
          <p role="status" className="py-8 text-center text-sm text-muted">
            No requests recorded yet. Run a search or call a tool to populate usage.
          </p>
        </Card.Content>
      </Card>
    );
  }
  return (
    <Card>
      <Card.Header>
        <Card.Title>Usage</Card.Title>
        <Card.Description>Last 10 days</Card.Description>
      </Card.Header>
      <Card.Content>
        <UsageChart days={days} />
      </Card.Content>
      <Card.Footer>
        <p className="text-sm font-medium tabular-nums">
          {totalRequests(days)} requests in the last 10 days
        </p>
      </Card.Footer>
    </Card>
  );
}
