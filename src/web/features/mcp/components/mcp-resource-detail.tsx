"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpResourceDetail({ resourceId }: { resourceId: string }) {
  const { catalog, loading, error, retry } = useMcpCatalog();
  const resource =
    catalog.resources.find((entry) => entry.name === resourceId) ?? null;

  return (
    <PageContainer>
      <Link
        href="/mcp/resources"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        Back to resources
      </Link>

      {loading ? (
        <div role="status" aria-label="Loading resource" className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error !== null ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <button type="button" onClick={retry} className="text-sm font-medium text-accent underline">
            Retry
          </button>
        </div>
      ) : resource === null ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No resource named &ldquo;{resourceId}&rdquo; is registered.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <header>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{resource.name}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">{resource.description}</p>
          </header>
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
