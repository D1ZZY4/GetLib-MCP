"use client";

import { Card, Skeleton } from "@heroui/react";
import { BackLink } from "@/web/components/ui/back-link";
import { EmptyState } from "@/web/components/ui/empty-state";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { DefinitionListSkeleton, DetailHeaderSkeleton } from "@/web/components/ui/skeletons";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpResourceDetail({ resourceId }: { resourceId: string }) {
  const { catalog, loading, error, retry } = useMcpCatalog();
  const resource =
    catalog.resources.find((entry) => entry.name === resourceId) ?? null;

  return (
    <PageContainer>
      <BackLink href="/mcp/resources">Back to resources</BackLink>

      {loading ? (
        <div role="status" aria-label="Loading resource" className="flex flex-col gap-4">
          <DetailHeaderSkeleton />
          <Card>
            <Card.Header>
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-56 max-w-full rounded" />
            </Card.Header>
            <Card.Content>
              <DefinitionListSkeleton rows={3} />
            </Card.Content>
          </Card>
        </div>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
      ) : resource === null ? (
        <EmptyState
          title="Resource not found"
          description={`No resource named "${resourceId}" is registered.`}
        />
      ) : (
        <>
          <PageHeader title={resource.name} description={resource.description} />
          <Card>
            <Card.Header>
              <Card.Title>Identifier</Card.Title>
              <Card.Description>Canonical resource URI with deterministic semantics.</Card.Description>
            </Card.Header>
            <Card.Content>
              <p className="rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed break-all">
                {resource.uri}
              </p>
            </Card.Content>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
