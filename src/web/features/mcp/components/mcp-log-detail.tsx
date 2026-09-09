"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { formatLogTime } from "@/web/lib/format";
import { fetchLogs } from "../services/mcp.service";

const LOAD_ERROR = "We couldn't load this log entry. Try again in a moment.";

export function McpLogDetail({ requestId }: { requestId: string }) {
  const { data, loading, error, retry } = useApiData(fetchLogs, LOAD_ERROR);
  const entry = data?.logs.find((item) => String(item.id) === requestId) ?? null;

  return (
    <PageContainer>
      <Link
        href="/mcp/logs"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        Back to logs
      </Link>

      {loading ? (
        <div role="status" aria-label="Loading log entry" className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error !== null || data === null ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error ?? LOAD_ERROR}
          </p>
          <button type="button" onClick={retry} className="text-sm font-medium text-accent underline">
            Retry
          </button>
        </div>
      ) : entry === null ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No log entry with this id. The ring keeps the last 100 entries per process.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
                {entry.name}
              </h1>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  entry.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                }`}
              >
                {entry.ok ? "ok" : "fail"}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-sm text-muted">
              {formatLogTime(entry.timestamp)} · {entry.durationMs}ms
              {entry.requestId ? ` · request ${entry.requestId}` : ""}
            </p>
          </header>
          <Card>
            <Card.Header>
              <Card.Title>Execution</Card.Title>
              <Card.Description>Recorded stages for this request.</Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Kind</dt>
                  <dd className="font-medium">{entry.kind}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Duration</dt>
                  <dd className="font-medium tabular-nums">{entry.durationMs}ms</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Status</dt>
                  <dd className="font-medium">{entry.ok ? "ok" : "fail"}</dd>
                </div>
                {entry.requestId ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Request id</dt>
                    <dd className="max-w-xs truncate font-mono text-xs">{entry.requestId}</dd>
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
