"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { StatCardSkeleton } from "@/web/components/ui/skeletons";
import { useApiData } from "@/web/hooks/use-api-data";
import { formatPercent } from "@/web/lib/format";
import { fetchHealth } from "../services/health.service";
import { fetchClients } from "../services/clients.service";
import { fetchServers } from "../services/mcp.service";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

const SECTIONS = [
  { href: "/mcp/servers", title: "Servers", description: "Registered servers with live counts." },
  { href: "/mcp/tools", title: "Tools", description: "List and run every registered tool." },
  { href: "/mcp/playground", title: "Playground", description: "Run tools with custom arguments." },
  { href: "/mcp/api-keys", title: "API keys", description: "Long-lived Bearer keys for MCP clients." },
  { href: "/mcp/resources", title: "Resources", description: "Browse readable MCP resources." },
  { href: "/mcp/prompts", title: "Prompts", description: "Inspect reusable prompt templates." },
  { href: "/mcp/clients", title: "Clients", description: "Connected AI clients." },
  { href: "/mcp/health", title: "Health", description: "Operational server status." },
  { href: "/mcp/logs", title: "Logs", description: "Recent tool runs in this process." },
] as const;

const LOAD_ERROR = "We couldn't load MCP runtime state. Try again in a moment.";

export function McpOverview() {
  const { catalog, loading: catalogLoading, error: catalogError, retry: retryCatalog } = useMcpCatalog();
  const {
    data: health,
    loading: healthLoading,
    error: healthError,
    retry: retryHealth,
  } = useApiData(fetchHealth, LOAD_ERROR, { refreshIntervalMs: 10_000 });
  const {
    data: clients,
    loading: clientsLoading,
    error: clientsError,
    retry: retryClients,
  } = useApiData(fetchClients, LOAD_ERROR, { refreshIntervalMs: 10_000 });
  const {
    data: servers,
    loading: serversLoading,
    error: serversError,
    retry: retryServers,
  } = useApiData(fetchServers, LOAD_ERROR, { refreshIntervalMs: 10_000 });

  const loading = catalogLoading || healthLoading || clientsLoading || serversLoading;
  const sectionErrors = [catalogError, healthError, clientsError, serversError].filter(
    (entry): entry is string => entry !== null,
  );
  const hasAnyData =
    catalog.tools.length > 0 || health !== null || clients !== null || servers !== null;
  const loadingInitial = loading && !hasAnyData;
  const retryAll = () => {
    retryCatalog();
    retryHealth();
    retryClients();
    retryServers();
  };

  const degraded = health !== null && health.status !== "healthy";

  return (
    <PageContainer>
      <PageHeader
        title="MCP"
        description="First-class MCP module: one registry feeds the stdio server and these pages."
        badge={
          health !== null && degraded ? (
            <span className="shrink-0 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              Degraded
            </span>
          ) : null
        }
      />

      {loadingInitial ? (
        <div role="status" aria-label="Loading MCP overview" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCardSkeleton compact />
            <StatCardSkeleton compact />
            <StatCardSkeleton compact />
            <StatCardSkeleton compact />
          </div>
          <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => (
              <Card key={index} className="h-full">
                <Card.Header>
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-48 max-w-full rounded" />
                </Card.Header>
                <Card.Footer>
                  <Skeleton className="h-9 w-full rounded-xl" />
                </Card.Footer>
              </Card>
            ))}
          </div>
        </div>
      ) : !hasAnyData && sectionErrors.length > 0 ? (
        <LoadError message={sectionErrors[0] ?? LOAD_ERROR} onRetry={retryAll} />
      ) : (
        <>
          {sectionErrors.length > 0 ? (
            <div className="flex flex-col items-start gap-1.5" role="alert">
              <p className="text-sm text-warning">
                Some sections failed to refresh. Showing available data.
              </p>
              <button
                type="button"
                onClick={retryAll}
                className="rounded text-sm font-medium text-accent underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Retry
              </button>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Tools</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {catalog.tools.length}
                </p>
              </Card.Content>
            </Card>
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Clients</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {clients?.total ?? 0}
                </p>
              </Card.Content>
            </Card>
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Servers</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {servers?.servers.length ?? 0}
                </p>
              </Card.Content>
            </Card>
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Error rate</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {health ? formatPercent(health.telemetry.errorRate) : "-"}
                </p>
              </Card.Content>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {SECTIONS.map((section) => (
              <Card key={section.href} className="h-full">
                <Card.Header>
                  <Card.Title>{section.title}</Card.Title>
                  <Card.Description>{section.description}</Card.Description>
                </Card.Header>
                <Card.Footer>
                  <Link
                    href={section.href}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-default px-4 py-2 text-sm font-medium transition-colors hover:bg-default-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Open {section.title.toLowerCase()}
                  </Link>
                </Card.Footer>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
