"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";
import { ListRowSkeleton } from "@/web/components/ui/skeletons";
import { runTool } from "../services/mcp.service";

export function McpToolList() {
  const { catalog, loading, error, retry } = useMcpCatalog();
  const [selected, setSelected] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const handleRun = async (name: string) => {
    setSelected(name);
    setRunningTool(name);
    setRunError(null);
    try {
      const run = await runTool(name, {});
      setOutput(JSON.stringify(run.result, null, 2));
    } catch {
      setRunError(`We couldn't run ${name}. Try again.`);
      setOutput(null);
    } finally {
      setRunningTool((current) => (current === name ? null : current));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Tools"
        description="Every tool runs through the shared registry. It is the same registry the stdio server exposes."
      />

      {loading ? (
        <Card role="status" aria-label="Loading tools">
          <Card.Content>
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, index) => (
                <ListRowSkeleton key={index} action="button" />
              ))}
            </div>
          </Card.Content>
        </Card>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
      ) : catalog.tools.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No tools registered. Restart the server to load the registry.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Card>
            <Card.Content>
              <ul className="divide-y divide-border" aria-label="MCP tools">
                {catalog.tools.map((tool) => {
                  const running = runningTool === tool.name;
                  return (
                    <li key={tool.name} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm">
                          <Link href={`/mcp/tools/${tool.name}`} className="rounded hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                            {tool.name}
                          </Link>
                        </p>
                        <p className="truncate text-xs text-muted">{tool.description}</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => void handleRun(tool.name)}
                        isDisabled={runningTool !== null}
                        aria-label={`Run ${tool.name}`}
                      >
                        {running ? "Running" : "Run"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Card.Content>
          </Card>
          {runError !== null ? (
            <p role="alert" className="text-sm text-danger">
              {runError}
            </p>
          ) : null}
          {output !== null ? (
            <Card>
              <Card.Header>
                <Card.Title className="font-mono text-sm">{selected}</Card.Title>
                <Card.Description>Result envelope</Card.Description>
              </Card.Header>
              <Card.Content>
                <pre className="overflow-x-auto rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed tabular-nums">
                  <code>{output}</code>
                </pre>
              </Card.Content>
            </Card>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
