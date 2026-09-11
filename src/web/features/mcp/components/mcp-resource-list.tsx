"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { EmptyState } from "@/web/components/ui/empty-state";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpResourceList() {
  const { catalog, loading, error, retry } = useMcpCatalog();

  return (
    <PageContainer>
      <PageHeader
        title="Resources"
        description="Readable resources exposed by the MCP server from the shared registry."
      />

      {loading ? (
        <Card role="status" aria-label="Loading resources">
          <Card.Content>
            <div className="space-y-3" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-1.5">
                  <Skeleton className="h-4 w-1/3 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
      ) : catalog.resources.length === 0 ? (
        <EmptyState
          title="No resources registered"
          description="Restart the server to load the registry."
        />
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="MCP resources">
              {catalog.resources.map((resource) => (
                <li key={resource.name} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium">
                    <Link href={`/mcp/resources/${resource.name}`} className="rounded hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                      {resource.name}
                    </Link>
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-accent">{resource.uri}</p>
                  <p className="mt-0.5 text-xs text-muted">{resource.description}</p>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}
    </PageContainer>
  );
}
