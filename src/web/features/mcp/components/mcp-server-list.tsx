"use client";

import { useEffect, useState } from "react";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { fetchServers, type McpServerEntry } from "../services/mcp.service";

export function McpServerList() {
  const [servers, setServers] = useState<McpServerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchServers()
      .then((data) => {
        if (!cancelled) setServers(data.servers);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load servers. Try again in a moment.");
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
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Servers</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Registered MCP servers with live primitive counts from the shared registry.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading servers" className="flex flex-col gap-2">
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {servers.map((server) => (
            <Card key={server.id}>
              <Card.Header>
                <div className="flex items-center justify-between gap-2">
                  <Card.Title className="font-mono text-sm">{server.name}</Card.Title>
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                    {server.status}
                  </span>
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
