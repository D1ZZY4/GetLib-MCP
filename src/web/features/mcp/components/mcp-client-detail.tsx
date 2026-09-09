"use client";

import { Card, Skeleton } from "@heroui/react";
import { BackLink } from "@/web/components/ui/back-link";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "../../../components/layout/page-container";
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
        <div role="status" aria-label="Loading client" className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error !== null || data === null ? (
        <LoadError message={error ?? LOAD_ERROR} onRetry={retry} />
      ) : client === null ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No recently seen client with this id. Entries expire as new clients arrive.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <PageHeader
            title={<span className="truncate font-mono">{client.id}</span>}
            description="Recently observed client. Streamable HTTP is stateless, so this is a sighting record, not a live session."
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
                    <dd className="max-w-xs truncate font-mono text-xs">{client.userAgent}</dd>
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
