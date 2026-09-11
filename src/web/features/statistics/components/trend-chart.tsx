"use client";

import { Card } from "@heroui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsageDay } from "@/web/lib/statistics";
import { chartAccent, chartAxisTick, chartGridStroke } from "@/web/components/charts/chart-theme";
import { trendSummary } from "./chart-summary";
import { ChartTooltipCard } from "@/web/components/charts/chart-tooltip";

export function TrendChart({ days }: { days: UsageDay[] }) {
  if (days.length === 0) {
    return (
      <Card className="h-full">
        <Card.Header>
          <Card.Title>Request trend</Card.Title>
          <Card.Description>Requests per day, last 10 days</Card.Description>
        </Card.Header>
        <Card.Content>
          <p role="status" className="py-8 text-center text-sm text-muted">
            No daily requests recorded yet.
          </p>
        </Card.Content>
      </Card>
    );
  }
  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Request trend</Card.Title>
          <Card.Description>Requests per day, last 10 days</Card.Description>
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart accessibilityLayer data={days} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
        <Tooltip cursor={{ stroke: chartGridStroke }} content={<ChartTooltipCard />} />
        <Line
          type="monotone"
          dataKey="requests"
          stroke={chartAccent}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
      </ResponsiveContainer>
      </Card.Content>
      <Card.Footer>
        <p className="text-sm font-medium">{trendSummary(days)}</p>
      </Card.Footer>
    </Card>
  );
}
