"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchServers } from "../services/mcp.service";

const LOAD_ERROR = "We couldn't load this server. Try again in a moment.";

function statusTone(status: string): string {
  if (status === "online" || status === "healthy") return "bg-success/10 text-success";
  if (status === "degraded") return "bg-warning/10 text-warning";
  return "bg-danger/10 text-danger";
}

export function McpServerDetail({ serverId }: { serverId: string }) {
  const { data, loading, error, retry } = useApiData(fetchServers, LOAD_ERROR);
  const server = data?.servers.find((entry) => entry.id === serverId) ?? null;

  return (
    <PageContainer>
      <Link
        href="/mcp/servers"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        Back to servers
      </Link>

      {loading ? (
        <div role="status" aria-label="Loading server" className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error !== null || data === null ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error ?? LOAD_ERROR}
          </p>
          <button type="button" onClick={retry} className="text-sm font-medium text-accent underline">
            Retry
          </button>
        </div>
      ) : server === null ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No server with id &ldquo;{serverId}&rdquo; is registered.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
                {server.name}
              </h1>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(server.status)}`}>
                {server.status}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-sm text-muted">
              v{server.version} · {server.transports.join(" + ")}
            </p>
          </header>
          <Card>
            <Card.Header>
              <Card.Title>Capabilities</Card.Title>
              <Card.Description>Live primitive counts from the shared registry.</Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Tools</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{server.counts.tools}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Resources</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{server.counts.resources}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Prompts</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{server.counts.prompts}</dd>
                </div>
              </dl>
            </Card.Content>
            <Card.Footer>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/mcp/tools"
                  className="rounded-xl bg-default px-4 py-2 text-sm font-medium transition-colors hover:bg-default-hover"
                >
                  Browse tools
                </Link>
                <Link
                  href="/mcp/health"
                  className="rounded-xl bg-default px-4 py-2 text-sm font-medium transition-colors hover:bg-default-hover"
                >
                  Check health
                </Link>
              </div>
            </Card.Footer>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
