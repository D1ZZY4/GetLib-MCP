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
import type { UsageDay } from "../services/statistics.service";
import { chartAccent, chartAxisTick, chartGridStroke, chartTooltipLabelStyle, chartTooltipStyle } from "./chart-theme";

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
        <Tooltip
          cursor={{ fill: "var(--accent-soft)" }}
          contentStyle={{ ...chartTooltipStyle }}
          labelStyle={{ ...chartTooltipLabelStyle }}
          itemStyle={{ ...chartTooltipLabelStyle }}
        />
        <Bar dataKey="requests" fill={chartAccent} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UsageCard({ days }: UsageChartProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Usage</Card.Title>
        <Card.Description>Last 10 days</Card.Description>
      </Card.Header>
      <Card.Content>
        <UsageChart days={days} />
      </Card.Content>
    </Card>
  );
}
