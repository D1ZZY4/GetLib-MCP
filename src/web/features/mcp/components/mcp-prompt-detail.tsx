"use client";

import { Card, Skeleton } from "@heroui/react";
import { BackLink } from "@/web/components/ui/back-link";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpPromptDetail({ promptName }: { promptName: string }) {
  const { catalog, loading, error, retry } = useMcpCatalog();
  const prompt = catalog.prompts.find((entry) => entry.name === promptName) ?? null;

  return (
    <PageContainer>
      <BackLink href="/mcp/prompts">Back to prompts</BackLink>

      {loading ? (
        <div role="status" aria-label="Loading prompt" className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
      ) : prompt === null ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No prompt named &ldquo;{promptName}&rdquo; is registered.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <PageHeader
            title={<span className="font-mono">{prompt.name}</span>}
            description={prompt.description}
          />
          <Card>
            <Card.Header>
              <Card.Title>Arguments</Card.Title>
              <Card.Description>Explicit argument contract for this prompt.</Card.Description>
            </Card.Header>
            <Card.Content>
              {prompt.args === undefined || prompt.args.length === 0 ? (
                <p className="text-sm text-muted">This prompt takes no arguments.</p>
              ) : (
                <ul className="divide-y divide-border" aria-label={`Arguments for ${prompt.name}`}>
                  {prompt.args.map((arg) => (
                    <li key={arg.name} className="py-2 first:pt-0 last:pb-0">
                      <p className="font-mono text-sm">
                        {arg.name}
                        {arg.required ? (
                          <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                            required
                          </span>
                        ) : (
                          <span className="ml-2 rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-muted">
                            optional
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{arg.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
