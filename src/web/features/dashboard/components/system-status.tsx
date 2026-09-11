"use client";

import { Card } from "@heroui/react";
import { formatLogTime, formatPercent } from "@/web/lib/format";
import type { DashboardSnapshot } from "../services/dashboard-api.service";

export function SystemStatusPanel({ dashboard }: { dashboard: DashboardSnapshot }) {
  const items = [
    { label: "System", value: dashboard.system.status },
    {
      label: "MCP tools",
      value: String(dashboard.mcp.tools),
    },
    {
      label: "Database",
      value: dashboard.database.health,
    },
    {
      label: "Success rate",
      value: formatPercent(dashboard.mcp.successRate),
    },
    {
      label: "Authentication",
      value: dashboard.system.authEnabled ? "enabled" : "disabled",
    },
    {
      label: "Transports",
      value: String(dashboard.mcp.transports.length),
    },
    {
      label: "Cache entries",
      value: String(dashboard.mcp.cacheEntries),
    },
    {
      label: "Latency",
      value: dashboard.database.latencyMs === null ? "-" : `${dashboard.database.latencyMs}ms`,
    },
  ] as const;

  return (
    <section aria-label="System status" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} variant="secondary">
          <Card.Content>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight capitalize tabular-nums">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-muted">
              {item.label === "System"
                ? `${dashboard.system.environment} - ${dashboard.system.databaseMode}`
                : item.label === "MCP tools"
                  ? `${dashboard.mcp.totalCalls} calls - ${dashboard.mcp.resources} resources`
                  : item.label === "Database"
                    ? dashboard.system.isMock
                      ? "Mock mode (development)"
                      : dashboard.database.configured
                        ? "Supabase connected"
                        : "Not configured"
                    : item.label === "Authentication"
                      ? dashboard.system.fallbackActive
                        ? "Default credentials active"
                        : dashboard.system.authEnabled
                          ? "Verified sessions"
                          : "Guest access"
                      : item.label === "Transports"
                        ? dashboard.mcp.transports.join(" + ") || "No transports"
                        : item.label === "Cache entries"
                          ? "In-memory entries"
                          : item.label === "Latency"
                            ? `Checked ${formatLogTime(dashboard.database.checkedAt)}`
                            : `${formatPercent(dashboard.mcp.errorRate)} errors`}
            </p>
          </Card.Content>
        </Card>
      ))}
    </section>
  );
}

export function FallbackWarning({ dashboard }: { dashboard: DashboardSnapshot }) {
  if (!dashboard.system.fallbackActive) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm"
    >
      <p className="font-semibold text-warning">Default credentials are active</p>
      <p className="mt-0.5 text-muted">
        The server is running with fallback bootstrap credentials. Rotate them immediately in your
        environment configuration and restart.
      </p>
    </div>
  );
}
