"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpPromptList() {
  const { catalog, loading, error, retry } = useMcpCatalog();

  return (
    <PageContainer>
      <PageHeader
        title="Prompts"
        description="Reusable prompt templates exposed by the MCP server from the shared registry."
      />

      {loading ? (
        <div role="status" aria-label="Loading prompts" className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
      ) : catalog.prompts.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No prompts registered. Restart the server to load the registry.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="MCP prompts">
              {catalog.prompts.map((prompt) => (
                <li key={prompt.name} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-mono text-sm">
                    <Link href={`/mcp/prompts/${prompt.name}`} className="hover:text-accent hover:underline">
                      {prompt.name}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{prompt.description}</p>
                  {prompt.args !== undefined && prompt.args.length > 0 ? (
                    <ul
                      className="mt-1.5 flex flex-wrap gap-1.5"
                      aria-label={`Arguments for ${prompt.name}`}
                    >
                      {prompt.args.map((arg) => (
                        <li
                          key={arg.name}
                          title={arg.description}
                          className="rounded-full bg-surface-tertiary px-2 py-0.5 font-mono text-xs text-muted"
                        >
                          {arg.name}
                          {arg.required ? " *" : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}
    </PageContainer>
  );
}
