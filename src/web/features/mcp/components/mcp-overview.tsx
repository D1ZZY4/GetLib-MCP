"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";

const SECTIONS = [
  { href: "/mcp/servers", title: "Servers", description: "Registered servers with live counts." },
  { href: "/mcp/tools", title: "Tools", description: "List and run every registered tool." },
  { href: "/mcp/playground", title: "Playground", description: "Run tools with custom arguments." },
  { href: "/mcp/resources", title: "Resources", description: "Browse readable MCP resources." },
  { href: "/mcp/prompts", title: "Prompts", description: "Inspect reusable prompt templates." },
  { href: "/mcp/clients", title: "Clients", description: "Connected AI clients." },
  { href: "/mcp/health", title: "Health", description: "Operational server status." },
  { href: "/mcp/logs", title: "Logs", description: "Recent tool runs in this process." },
] as const;

export function McpOverview() {
  const { catalog, loading, error } = useMcpCatalog();

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">MCP</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          First-class MCP module: one registry feeds the stdio server and these pages.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading MCP overview" className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Tools</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {catalog.tools.length}
                </p>
              </Card.Content>
            </Card>
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Resources</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {catalog.resources.length}
                </p>
              </Card.Content>
            </Card>
            <Card variant="secondary">
              <Card.Content>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Prompts</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {catalog.prompts.length}
                </p>
              </Card.Content>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {SECTIONS.map((section) => (
              <Card key={section.href} className="h-full">
                <Card.Header>
                  <Card.Title>{section.title}</Card.Title>
                  <Card.Description>{section.description}</Card.Description>
                </Card.Header>
                <Card.Footer>
                  <Link
                    href={section.href}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-default px-4 py-2 text-sm font-medium transition-colors hover:bg-default-hover"
                  >
                    Open {section.title.toLowerCase()}
                  </Link>
                </Card.Footer>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
