"use client";

import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { formatLogTime } from "@/web/lib/format";
import { fetchClients } from "../services/clients.service";

const LOAD_ERROR = "We couldn't load connected clients. Try again in a moment.";

export function McpClients() {
  const { data: snapshot, loading, error, retry } = useApiData(fetchClients, LOAD_ERROR);

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Clients</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          AI agents connected to this server over Streamable HTTP. Only sessions in this
          process are visible. Agents using stdio run their own server process.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading clients" className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : error !== null || snapshot === null ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error ?? LOAD_ERROR}
          </p>
          <button type="button" onClick={retry} className="text-sm font-medium text-accent underline">
            Retry
          </button>
        </div>
      ) : snapshot.total === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No agents connected right now. Connect an AI agent over Streamable HTTP and it
              will appear here.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="Connected clients">
              {snapshot.clients.map((client) => (
                <li key={client.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm">{client.id}</p>
                    <p className="text-xs text-muted">
                      {client.transport} · last seen {formatLogTime(client.lastSeenAt)}
                    </p>
                    {client.userAgent !== undefined ? (
                      <p className="truncate text-xs text-muted">via {client.userAgent}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    Connected
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
