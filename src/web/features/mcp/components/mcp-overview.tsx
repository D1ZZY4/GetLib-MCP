"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchHealth } from "../services/health.service";
import { fetchClients } from "../services/clients.service";
import { fetchServers } from "../services/mcp.service";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

const SECTIONS = [
  { href: "/mcp/servers", title: "Servers", description: "Registered servers with live counts." },
  { href: "/mcp/tools", title: "Tools", description: "List and run every registered tool." },
  { href: "/mcp/playground", title: "Playground", description: "Run tools with custom arguments." },
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
  } = useApiData(fetchHealth, LOAD_ERROR);
  const {
    data: clients,
    loading: clientsLoading,
    error: clientsError,
    retry: retryClients,
  } = useApiData(fetchClients, LOAD_ERROR);
  const {
    data: servers,
    loading: serversLoading,
    error: serversError,
    retry: retryServers,
  } = useApiData(fetchServers, LOAD_ERROR);

  const loading = catalogLoading || healthLoading || clientsLoading || serversLoading;
  const error = catalogError ?? healthError ?? clientsError ?? serversError;
  const retryAll = () => {
    retryCatalog();
    retryHealth();
    retryClients();
    retryServers();
  };

  const degraded = health !== null && health.status !== "healthy";

  return (
    <PageContainer>
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">MCP</h1>
          {health !== null && degraded ? (
            <span className="shrink-0 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              Degraded
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-xl text-sm text-muted">
          First-class MCP module: one registry feeds the stdio server and these pages.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading MCP overview" className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : error !== null ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <button type="button" onClick={retryAll} className="text-sm font-medium text-accent underline">
            Retry
          </button>
        </div>
      ) : (
        <>
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
                  {health ? `${(health.telemetry.errorRate * 100).toFixed(1)}%` : "-"}
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
                    className="inline-flex w-full items-center justify-center rounded-xl bg-default px-4 py-2 text-sm font-medium transition-colors hover:bg-default-hover"
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
