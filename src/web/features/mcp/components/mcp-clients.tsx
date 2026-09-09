"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
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
        <div role="status" aria-label="Loading clients" className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : error !== null || snapshot === null ? (
        <LoadError message={error ?? LOAD_ERROR} onRetry={retry} />
      ) : snapshot.total === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No agents seen recently. Connect an AI agent over Streamable HTTP and it
              will appear here.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="Recently seen clients">
              {snapshot.clients.map((client) => (
                <li key={client.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">
                      <Link href={`/mcp/clients/${client.id}`} className="hover:text-accent hover:underline">
                        {client.id}
                      </Link>
                    </p>
                    <p className="text-xs text-muted">
                      {client.transport} · last seen {formatLogTime(client.lastSeenAt)}
                    </p>
                    {client.userAgent !== undefined ? (
                      <p className="truncate text-xs text-muted">via {client.userAgent}</p>
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
