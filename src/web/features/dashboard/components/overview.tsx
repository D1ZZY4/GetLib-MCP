"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rankLibraryFetches } from "@/web/features/statistics/services/statistics-api.service";
import { useStatisticsData } from "@/web/features/statistics/hooks/use-statistics-data";
import { ArrowRightIcon } from "../../../components/ui/icons";
import { chartAccent, chartAxisTick, chartGridStroke } from "@/web/features/statistics/components/chart-theme";
import { ChartTooltipCard } from "@/web/features/statistics/components/chart-tooltip";

export function Overview() {
  const { stats, loading } = useStatisticsData();

  if (loading || stats === null) {
    return (
      <Card aria-label="Overview">
        <Card.Header>
          <Card.Title>Overview</Card.Title>
          <Card.Description>Request activity and top fetches.</Card.Description>
        </Card.Header>
        <Card.Content>
          <Skeleton className="h-[220px] rounded-xl" />
        </Card.Content>
      </Card>
    );
  }

  const summaryItems = [
    { label: "Requests used", value: String(stats.usage.requestsUsed), hint: "Last 10 days" },
    { label: "Docs pages", value: String(stats.usage.docsPages), hint: "Indexed pages" },
    { label: "Success rate", value: `${stats.usage.successRate}%`, hint: "Fetch success" },
  ] as const;
  const topFetches = rankLibraryFetches(stats.fetches, 3);
  const topCount = topFetches[0]?.fetches ?? 1;

  return (
    <Card aria-label="Overview">
      <Card.Header>
        <Card.Title>Overview</Card.Title>
        <Card.Description>Request activity and top fetches.</Card.Description>
      </Card.Header>
      <Card.Content>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            accessibilityLayer
            data={stats.days}
            margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
          >
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
              content={<ChartTooltipCard />}
            />
            <Line
              type="monotone"
              dataKey="requests"
              stroke={chartAccent}
              strokeWidth={2.5}
              dot={{ fill: chartAccent, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-surface-secondary px-4 py-3"
            >
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {item.value}
              </p>
              <p className="mt-0.5 text-xs text-muted">{item.hint}</p>
            </div>
          ))}
        </div>
        <ol className="mt-4 flex flex-col gap-3" aria-label="Top fetched libraries">
          {topFetches.map((entry, index) => (
            <li key={entry.id}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  <span className="mr-2 font-mono text-xs text-muted tabular-nums">
                    {index + 1}
                  </span>
                  {entry.name}
                </p>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {entry.fetches} fetches
                </span>
              </div>
              <div
                role="presentation"
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-tertiary"
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(4, (entry.fetches / topCount) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      </Card.Content>
      <Card.Footer>
        <Link
          href="/statistics"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
        >
          View full statistics
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </Card.Footer>
    </Card>
  );
}
