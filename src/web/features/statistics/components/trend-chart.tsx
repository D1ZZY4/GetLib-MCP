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
import type { UsageDay } from "../services/statistics.service";
import { chartAccent, chartAxisTick, chartGridStroke, chartTooltipLabelStyle, chartTooltipStyle } from "./chart-theme";

export function TrendChart({ days }: { days: UsageDay[] }) {
  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Request trend</Card.Title>
        <Card.Description>Mock requests per day, last 10 days</Card.Description>
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
            <Tooltip
              cursor={{ stroke: chartGridStroke }}
              contentStyle={{ ...chartTooltipStyle }}
              labelStyle={{ ...chartTooltipLabelStyle }}
              itemStyle={{ ...chartTooltipLabelStyle }}
            />
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
    </Card>
  );
}
