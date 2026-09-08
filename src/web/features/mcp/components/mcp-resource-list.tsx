"use client";

import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpResourceList() {
  const { catalog, loading, error } = useMcpCatalog();

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Resources</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Readable resources exposed by the MCP server from the shared registry.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading resources" className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="MCP resources">
              {catalog.resources.map((resource) => (
                <li key={resource.name} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium">{resource.name}</p>
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
