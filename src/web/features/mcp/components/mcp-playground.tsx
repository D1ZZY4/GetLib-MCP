"use client";

import { useState } from "react";
import type { Key } from "@heroui/react";
import { Button, Card, Label, ListBox, Select, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";
import { exampleArgsFor, runToolWithArgs } from "../services/playground.service";

export function McpPlayground() {
  const { catalog, loading, error, retry } = useMcpCatalog();
  const [tool, setTool] = useState<string | null>(null);
  const [argsText, setArgsText] = useState("{\n  \n}");
  const [output, setOutput] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const selected = tool !== null ? (catalog.tools.find((entry) => entry.name === tool) ?? null) : null;

  const selectTool = (name: string) => {
    setTool(name);
    setArgsText(exampleArgsFor(name));
    setOutput(null);
    setRunError(null);
    setDurationMs(null);
    setRequestId(null);
  };

  const handleRun = async () => {
    if (tool === null || running) return;
    setRunning(true);
    setRunError(null);
    try {
      const result = await runToolWithArgs(tool, argsText);
      setOutput(result.output);
      setDurationMs(result.durationMs);
      setRequestId(result.requestId);
    } catch (unknownError) {
      setRunError(
        unknownError instanceof Error ? unknownError.message : `We couldn't run ${tool}. Try again.`,
      );
      setOutput(null);
      setDurationMs(null);
      setRequestId(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Playground"
        description="Pick a tool, edit the JSON arguments, and run it against this server."
      />

      {loading ? (
        <div role="status" aria-label="Loading playground" className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
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
              <div className="flex flex-col gap-4">
                <Select
                  className="w-full max-w-md"
                  placeholder="Select a tool"
                  aria-label="Tool"
                  value={(tool ?? "") as Key}
                  onChange={(key) => {
                    if (key !== null) selectTool(String(key));
                  }}
                >
                  <Label>Tool</Label>
                  <Select.Trigger className="border-border bg-surface-secondary">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {catalog.tools.map((entry) => (
                        <ListBox.Item key={entry.name} id={entry.name} textValue={entry.name}>
                          <span className="font-mono text-sm">{entry.name}</span>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {selected !== null ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-muted">{selected.description}</p>
                    {selected.inputKeys.length > 0 ? (
                      <ul className="flex flex-wrap gap-1.5" aria-label={`Expected arguments for ${selected.name}`}>
                        {selected.inputKeys.map((input) => (
                          <li
                            key={input.key}
                            title={input.description ?? undefined}
                            className="rounded-full bg-surface-tertiary px-2 py-0.5 font-mono text-xs text-muted"
                          >
                            {input.key}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted">This tool takes no arguments.</p>
                    )}
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="playground-args">Arguments (JSON)</Label>
                  <textarea
                    id="playground-args"
                    value={argsText}
                    onChange={(event) => setArgsText(event.target.value)}
                    rows={8}
                    spellCheck={false}
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed outline-none placeholder:text-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => void handleRun()}
                    isDisabled={tool === null || running}
                  >
                    {running ? "Running" : "Run tool"}
                  </Button>
                  {durationMs !== null ? (
                    <span role="status" className="text-xs text-muted tabular-nums">
                      Finished in {durationMs}ms
                    </span>
                  ) : null}
                </div>
              </div>
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
                <Card.Title className="font-mono text-sm">{tool}</Card.Title>
                <Card.Description>
                  Response envelope
                  {requestId ? ` · request ${requestId}` : ""}
                  {durationMs !== null ? ` · ${durationMs}ms server time` : ""}
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <pre className="max-h-120 overflow-auto rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed tabular-nums">
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
