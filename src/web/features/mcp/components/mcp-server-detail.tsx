"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { BackLink } from "@/web/components/ui/back-link";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { DefinitionListSkeleton, DetailHeaderSkeleton } from "@/web/components/ui/skeletons";
import { statusTone } from "@/web/components/ui/status-tone";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchServers } from "../services/mcp.service";

const LOAD_ERROR = "We couldn't load this server. Try again in a moment.";

export function McpServerDetail({ serverId }: { serverId: string }) {
  const { data, loading, error, retry } = useApiData(fetchServers, LOAD_ERROR);
  const server = data?.servers.find((entry) => entry.id === serverId) ?? null;

  return (
    <PageContainer>
      <BackLink href="/mcp/servers">Back to servers</BackLink>

      {loading ? (
        <div role="status" aria-label="Loading server" className="flex flex-col gap-4">
          <DetailHeaderSkeleton />
          <Card>
            <Card.Header>
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-56 max-w-full rounded" />
            </Card.Header>
            <Card.Content>
              <DefinitionListSkeleton rows={3} />
            </Card.Content>
          </Card>
        </div>
      ) : error !== null || data === null ? (
        <LoadError message={error ?? LOAD_ERROR} onRetry={retry} />
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
          <PageHeader
            title={<span className="font-mono">{server.name}</span>}
            description={`v${server.version} · ${server.transports.join(" + ")}`}
            badge={
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(server.status)}`}>
                {server.status}
              </span>
            }
          />
          <Card>
            <Card.Header>
              <Card.Title>Capabilities</Card.Title>
              <Card.Description>Live primitive counts from the shared registry.</Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
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
