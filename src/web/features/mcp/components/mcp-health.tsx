"use client";

import { useEffect, useState } from "react";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import type { HealthSnapshot } from "@/application/health/health.service";
import { fetchHealth } from "../services/health.service";

function StatusPill({ status }: { status: HealthSnapshot["status"] }) {
  const healthy = status === "healthy";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        healthy ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      }`}
    >
      {healthy ? "Healthy" : "Degraded"}
    </span>
  );
}

export function McpHealth() {
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load health status. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer>
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Health</h1>
          {health !== null ? <StatusPill status={health.status} /> : null}
        </div>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Operational status of this MCP server process, not analytics.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading health" className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : error !== null || health === null ? (
        <p role="alert" className="text-sm text-danger">
          {error ?? "We couldn't load health status. Try again in a moment."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Tools", value: String(health.tools) },
              { label: "Registry entries", value: String(health.registryEntries) },
              { label: "Cache entries", value: String(health.cache.memoryEntries) },
              { label: "Uptime", value: `${health.uptimeSeconds}s` },
            ].map((item) => (
              <Card key={item.label} variant="secondary">
                <Card.Content>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    {item.label}
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                    {item.value}
                  </p>
                </Card.Content>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <Card.Header>
                <Card.Title>Telemetry</Card.Title>
                <Card.Description>
                  {health.telemetry.totalCalls} calls in the recent window
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Success</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {(health.telemetry.successRate * 100).toFixed(1)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Resolved</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {(health.telemetry.resolveRate * 100).toFixed(1)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Errors</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {(health.telemetry.errorRate * 100).toFixed(1)}%
                    </dd>
                  </div>
                </dl>
              </Card.Content>
            </Card>
            <Card>
              <Card.Header>
                <Card.Title>Circuit breakers</Card.Title>
                <Card.Description>Per-domain fetch protection</Card.Description>
              </Card.Header>
              <Card.Content>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Open</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{health.circuits.open}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Half open</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {health.circuits.halfOpen}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Closed</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {health.circuits.closed}
                    </dd>
                  </div>
                </dl>
              </Card.Content>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}
