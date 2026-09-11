"use client";

import { Card, Skeleton } from "@heroui/react";
import { BackLink } from "@/web/components/ui/back-link";
import { EmptyState } from "@/web/components/ui/empty-state";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { DefinitionListSkeleton, DetailHeaderSkeleton } from "@/web/components/ui/skeletons";
import { useApiData } from "@/web/hooks/use-api-data";
import { formatLogTime } from "@/web/lib/format";
import { fetchClients } from "../services/clients.service";

const LOAD_ERROR = "We couldn't load this client. Try again in a moment.";

export function McpClientDetail({ clientId }: { clientId: string }) {
  const { data, loading, error, retry } = useApiData(fetchClients, LOAD_ERROR);
  const client = data?.clients.find((entry) => entry.id === clientId) ?? null;

  return (
    <PageContainer>
      <BackLink href="/mcp/clients">Back to clients</BackLink>

      {loading ? (
        <div role="status" aria-label="Loading client" className="flex flex-col gap-4">
          <DetailHeaderSkeleton />
          <Card>
            <Card.Header>
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-56 max-w-full rounded" />
            </Card.Header>
            <Card.Content>
              <DefinitionListSkeleton rows={4} />
            </Card.Content>
          </Card>
        </div>
      ) : error !== null || data === null ? (
        <LoadError message={error ?? LOAD_ERROR} onRetry={retry} />
      ) : client === null ? (
        <EmptyState
          title="Client not found"
          description="No client with this id has been seen. Identities persist in the database once observed."
        />
      ) : (
        <>
          <PageHeader
            title={<span className="truncate">{client.name ?? client.id}{client.version !== undefined ? ` ${client.version}` : ""}</span>}
            description="Stable client identity. Streamable HTTP is stateless, so HTTP rows are sighting records; SSE rows are live sessions on hosts with sticky connections."
            badge={
              <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                Seen
              </span>
            }
          />
          <Card>
            <Card.Header>
              <Card.Title>Connection</Card.Title>
              <Card.Description>Metadata tracked per sighting.</Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Client id</dt>
                  <dd className="max-w-xs truncate font-mono text-xs" title={client.id}>{client.id}</dd>
                </div>
                {client.name !== undefined ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Name</dt>
                    <dd className="font-medium">{client.name}</dd>
                  </div>
                ) : null}
                {client.version !== undefined ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Version</dt>
                    <dd className="font-medium">{client.version}</dd>
                  </div>
                ) : null}
                {client.authType !== undefined ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Authentication</dt>
                    <dd className="font-medium">{client.authType === "api_key" ? "API key" : client.authType === "session" ? "Session" : "Anonymous"}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Transport</dt>
                  <dd className="font-medium">{client.transport}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Connected at</dt>
                  <dd className="font-medium tabular-nums">{formatLogTime(client.connectedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Last seen</dt>
                  <dd className="font-medium tabular-nums">{formatLogTime(client.lastSeenAt)}</dd>
                </div>
                {client.userAgent !== undefined ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">User agent</dt>
                    <dd className="max-w-xs truncate font-mono text-xs" title={client.userAgent}>{client.userAgent}</dd>
                  </div>
                ) : null}
              </dl>
            </Card.Content>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
