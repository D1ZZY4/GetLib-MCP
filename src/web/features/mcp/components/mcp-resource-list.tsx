"use client";

import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpResourceList() {
  const { catalog, loading, error, retry } = useMcpCatalog();

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
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <button type="button" onClick={retry} className="text-sm font-medium text-accent underline">
            Retry
          </button>
        </div>
      ) : catalog.resources.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No resources registered. Restart the server to load the registry.
            </p>
          </Card.Content>
        </Card>
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
