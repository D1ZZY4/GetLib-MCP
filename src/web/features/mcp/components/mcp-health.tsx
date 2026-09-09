"use client";

import { Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "../../../components/layout/page-container";
import { statusTone } from "@/web/components/ui/status-tone";
import { useApiData } from "@/web/hooks/use-api-data";
import { formatLogTime } from "@/web/lib/format";
import type { HealthStatus } from "@/web/types/mcp";
import { fetchHealth } from "../services/health.service";

const LOAD_ERROR = "We couldn't load health status. Try again in a moment.";

function StatusPill({ status }: { status: HealthStatus }) {
  const tone = statusTone(status);
  const label = status === "healthy" ? "Healthy" : status === "degraded" ? "Degraded" : "Unavailable";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function McpHealth() {
  const { data: health, loading, error, retry } = useApiData(fetchHealth, LOAD_ERROR);

  return (
    <PageContainer>
      <PageHeader
        title="Health"
        description="Operational status of this MCP server process, not analytics."
        badge={health !== null ? <StatusPill status={health.status} /> : null}
      />

      {loading ? (
        <div role="status" aria-label="Loading health" className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : error !== null || health === null ? (
        <LoadError message={error ?? LOAD_ERROR} onRetry={retry} />
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
          <Card>
            <Card.Header>
              <Card.Title>Dependencies</Card.Title>
              <Card.Description>Last check per dependency, with latency and errors.</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Dependency
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Status
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Latency
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Error
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Checked
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      Object.entries(health.dependencies) as Array<
                        [string, { status: HealthStatus; latencyMs: number | null; error: string | null; lastCheckedAt: string }]
                      >
                    ).map(([name, dep]) => (
                      <tr key={name} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4 font-medium capitalize">{name}</td>
                        <td className="py-2 pr-4">
                          <StatusPill status={dep.status} />
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {dep.latencyMs === null ? "-" : `${dep.latencyMs}ms`}
                        </td>
                        <td className="max-w-xs truncate py-2 pr-4 text-muted">
                          {dep.error ?? "-"}
                        </td>
                        <td className="py-2 text-xs text-muted tabular-nums">
                          {formatLogTime(dep.lastCheckedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Content>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
