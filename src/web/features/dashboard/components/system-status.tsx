"use client";

import { Card } from "@heroui/react";
import type { DashboardSnapshot } from "../services/dashboard-api.service";

function statusTone(status: string): string {
  if (status === "healthy") return "bg-success/10 text-success";
  if (status === "degraded") return "bg-warning/10 text-warning";
  return "bg-danger/10 text-danger";
}

export function SystemStatusPanel({ dashboard }: { dashboard: DashboardSnapshot }) {
  const items = [
    { label: "System", value: dashboard.system.status, tone: statusTone(dashboard.system.status) },
    {
      label: "MCP tools",
      value: String(dashboard.mcp.tools),
      tone: "bg-accent/10 text-accent",
    },
    {
      label: "Database",
      value: dashboard.database.health,
      tone: statusTone(dashboard.database.health === "mock" ? "healthy" : dashboard.database.health),
    },
    {
      label: "Success rate",
      value: `${Math.round(dashboard.mcp.successRate * 1000) / 10}%`,
      tone: "bg-success/10 text-success",
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
                    : `${dashboard.mcp.errorRate * 100}% errors`}
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
