"use client";

import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpPromptList() {
  const { catalog, loading, error, retry } = useMcpCatalog();

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Prompts</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Reusable prompt templates exposed by the MCP server from the shared registry.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading prompts" className="flex flex-col gap-2">
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
                  <p className="font-mono text-sm">{prompt.name}</p>
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
                          className="rounded-full bg-surface-tertiary px-2 py-0.5 font-mono text-[11px] text-muted"
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
