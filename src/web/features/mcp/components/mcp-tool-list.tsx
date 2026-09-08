"use client";

import { useState } from "react";
import { Button, Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";
import { runTool } from "../services/mcp.service";

export function McpToolList() {
  const { catalog, loading, error } = useMcpCatalog();
  const [selected, setSelected] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const handleRun = async (name: string) => {
    setSelected(name);
    setRunning(true);
    setRunError(null);
    try {
      const data: unknown = await runTool(name);
      setOutput(JSON.stringify(data, null, 2));
    } catch {
      setRunError(`We couldn't run ${name}. Try again.`);
      setOutput(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tools</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Every tool runs through the shared registry. It is the same registry the stdio server exposes.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading tools" className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <>
          <Card>
            <Card.Content>
              <ul className="divide-y divide-border" aria-label="MCP tools">
                {catalog.tools.map((tool) => (
                  <li key={tool.name} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm">{tool.name}</p>
                      <p className="truncate text-xs text-muted">{tool.description}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => void handleRun(tool.name)}
                      isDisabled={running}
                      aria-label={`Run ${tool.name}`}
                    >
                      {running && selected === tool.name ? "Running" : "Run"}
                    </Button>
                  </li>
                ))}
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
                <Card.Description>Mock result envelope</Card.Description>
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
