"use client";

import { useEffect, useState } from "react";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { formatLogTime } from "@/web/lib/format";
import { fetchLogs, type McpLogEntry } from "../services/mcp.service";

export function McpLogViewer() {
  const [logs, setLogs] = useState<McpLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLogs()
      .then((data) => {
        if (!cancelled) setLogs(data.logs);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load recent logs. Check your connection and try again.");
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
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Logs</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Last 100 tool runs recorded by the registry middleware in this process.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading logs" className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : logs.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">No tool runs recorded yet. Run a tool first.</p>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="MCP request logs">
              {logs.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-2 font-mono text-xs"
                >
                  <span className="truncate">
                    {entry.name}{" "}
                    <span className="text-muted">· {formatLogTime(entry.timestamp)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className={entry.ok ? "text-success" : "text-danger"}>
                      {entry.ok ? "ok" : "fail"}
                    </span>{" "}
                    <span className="text-muted">{entry.durationMs}ms</span>
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
