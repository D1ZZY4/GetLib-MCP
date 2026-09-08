"use client";

import { useEffect, useState } from "react";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import type { ClientsSnapshot } from "@/application/clients/clients.service";
import { fetchClients } from "../services/clients.service";
import { formatLogTime } from "@/web/lib/format";

export function McpClients() {
  const [snapshot, setSnapshot] = useState<ClientsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchClients()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load connected clients. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Clients</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          AI clients connected to this server over Streamable HTTP.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading clients" className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : error !== null || snapshot === null ? (
        <p role="alert" className="text-sm text-danger">
          {error ?? "We couldn't load connected clients. Try again in a moment."}
        </p>
      ) : snapshot.total === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No clients connected right now. Connect an assistant over Streamable HTTP and it
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
