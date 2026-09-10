"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { statusTone } from "@/web/components/ui/status-tone";
import { Pill } from "@/web/components/ui/pill";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchServers } from "../services/mcp.service";

const LOAD_ERROR = "We couldn't load servers. Try again in a moment.";

export function McpServerList() {
  const { data, loading, error, retry } = useApiData(fetchServers, LOAD_ERROR);
  const servers = data?.servers ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Servers"
        description="Registered MCP servers with live primitive counts from the shared registry."
      />

      {loading ? (
        <div role="status" aria-label="Loading servers" className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((index) => (
            <Card key={index}>
              <Card.Header>
                <div className="flex items-center justify-between gap-2" aria-hidden="true">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-48 rounded" aria-hidden="true" />
              </Card.Header>
              <Card.Content>
                <div className="flex gap-4" aria-hidden="true">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
      ) : servers.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No MCP servers registered. The local server registers on startup.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {servers.map((server) => (
            <Card key={server.id}>
              <Card.Header>
                <div className="flex items-center justify-between gap-2">
                  <Card.Title className="font-mono text-sm">
                    <Link href={`/mcp/servers/${server.id}`} className="rounded hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                      {server.name}
                    </Link>
                  </Card.Title>
                  <Pill tone={statusTone(server.status)}>{server.status}</Pill>
                </div>
                <Card.Description>
                  v{server.version} · {server.transports.join(" + ")}
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div className="flex gap-4 text-sm tabular-nums">
                  <span>
                    <span className="font-semibold">{server.counts.tools}</span>{" "}
                    <span className="text-muted">tools</span>
                  </span>
                  <span>
                    <span className="font-semibold">{server.counts.resources}</span>{" "}
                    <span className="text-muted">resources</span>
                  </span>
                  <span>
                    <span className="font-semibold">{server.counts.prompts}</span>{" "}
                    <span className="text-muted">prompts</span>
                  </span>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
