"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

export function McpToolDetail({ toolName }: { toolName: string }) {
  const { catalog, loading, error, retry } = useMcpCatalog();
  const tool = catalog.tools.find((entry) => entry.name === toolName) ?? null;

  return (
    <PageContainer>
      <Link
        href="/mcp/tools"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        Back to tools
      </Link>

      {loading ? (
        <div role="status" aria-label="Loading tool" className="flex flex-col gap-2">
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
      ) : tool === null ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No tool named &ldquo;{toolName}&rdquo; is registered.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <header>
            <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              {tool.name}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted">{tool.description}</p>
          </header>
          <Card>
            <Card.Header>
              <Card.Title>Input contract</Card.Title>
              <Card.Description>
                Argument keys this tool accepts. Required fields are enforced by the server.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              {tool.inputKeys.length === 0 ? (
                <p className="text-sm text-muted">This tool takes no arguments.</p>
              ) : (
                <ul className="divide-y divide-border" aria-label={`Arguments for ${tool.name}`}>
                  {tool.inputKeys.map((input) => (
                    <li key={input.key} className="py-2 first:pt-0 last:pb-0">
                      <p className="font-mono text-sm">{input.key}</p>
                      {input.description ? (
                        <p className="mt-0.5 text-xs text-muted">{input.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {tool.annotations ? (
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tool annotations">
                  {tool.annotations.readOnlyHint ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      read-only
                    </span>
                  ) : null}
                  {tool.annotations.destructiveHint ? (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                      destructive
                    </span>
                  ) : null}
                  {tool.annotations.idempotentHint ? (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      idempotent
                    </span>
                  ) : null}
                  {tool.annotations.openWorldHint ? (
                    <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-muted">
                      open-world
                    </span>
                  ) : null}
                </div>
              ) : null}
            </Card.Content>
            <Card.Footer>
              <Link
                href="/mcp/playground"
                className="inline-flex items-center justify-center rounded-xl bg-default px-4 py-2 text-sm font-medium transition-colors hover:bg-default-hover"
              >
                Open in playground
              </Link>
            </Card.Footer>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
