"use client";

import { Card, Skeleton } from "@heroui/react";
import { BackLink } from "@/web/components/ui/back-link";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { DefinitionListSkeleton, DetailHeaderSkeleton } from "@/web/components/ui/skeletons";
import { useApiData } from "@/web/hooks/use-api-data";
import { formatLogTime } from "@/web/lib/format";
import { fetchLogs } from "../services/mcp.service";

const LOAD_ERROR = "We couldn't load this log entry. Try again in a moment.";

export function McpLogDetail({ requestId }: { requestId: string }) {
  const { data, loading, error, retry } = useApiData(fetchLogs, LOAD_ERROR);
  const entry = data?.logs.find((item) => String(item.id) === requestId) ?? null;

  return (
    <PageContainer>
      <BackLink href="/mcp/logs">Back to logs</BackLink>

      {loading ? (
        <div role="status" aria-label="Loading log entry" className="flex flex-col gap-4">
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
          <PageHeader
            title={<span className="font-mono">{entry.name}</span>}
            description={`${formatLogTime(entry.timestamp)} · ${entry.durationMs}ms${entry.requestId ? ` · request ${entry.requestId}` : ""}`}
            badge={
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  entry.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                }`}
              >
                {entry.ok ? "ok" : "fail"}
              </span>
            }
          />
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
