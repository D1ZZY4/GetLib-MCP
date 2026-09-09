"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "../../../components/layout/page-container";
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
        <div role="status" aria-label="Loading resources" className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
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
                  <p className="text-sm font-medium">
                    <Link href={`/mcp/resources/${resource.name}`} className="hover:text-accent hover:underline">
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
