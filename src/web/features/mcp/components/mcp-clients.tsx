"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { EmptyState } from "@/web/components/ui/empty-state";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { ListRowSkeleton } from "@/web/components/ui/skeletons";
import { useApiData } from "@/web/hooks/use-api-data";
import { formatLogTime } from "@/web/lib/format";
import { fetchClients } from "../services/clients.service";

const LOAD_ERROR = "We couldn't load connected clients. Try again in a moment.";

export function McpClients() {
  const { data: snapshot, loading, error, retry } = useApiData(fetchClients, LOAD_ERROR, {
    refreshIntervalMs: 10_000,
  });

  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        description="AI agents recently seen on this server over Streamable HTTP. The transport is stateless, so this lists recently observed clients rather than live sessions. Agents using stdio run their own server process."
      />

      {loading ? (
        <Card role="status" aria-label="Loading clients">
          <Card.Content>
            <div className="divide-y divide-border">
              <ListRowSkeleton action="pill" />
              <ListRowSkeleton action="pill" />
              <ListRowSkeleton action="pill" />
            </div>
          </Card.Content>
        </Card>
      ) : error !== null || snapshot === null ? (
        <LoadError message={error ?? LOAD_ERROR} onRetry={retry} />
      ) : snapshot.total === 0 ? (
        <EmptyState
          title="No agents seen recently"
          description="Connect an AI agent over Streamable HTTP and it will appear here."
        />
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="Recently seen clients">
              {snapshot.clients.map((client) => (
                <li key={client.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm" title={client.id}>
                      <Link href={`/mcp/clients/${client.id}`} className="rounded hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                        {client.id}
                      </Link>
                    </p>
                    <p className="text-xs text-muted">
                      {client.transport} · last seen {formatLogTime(client.lastSeenAt)}
                    </p>
                    {client.userAgent !== undefined ? (
                      <p className="truncate text-xs text-muted" title={client.userAgent}>via {client.userAgent}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    Seen
                  </span>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}
    </PageContainer>
  );
}
