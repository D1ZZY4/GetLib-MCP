"use client";

import { useState } from "react";
import type { Key } from "@heroui/react";
import { Button, Card, Label, ListBox, Select, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useMcpCatalog } from "../hooks/use-mcp-catalog";
import { exampleArgsFor, runToolWithArgs } from "../services/playground.service";

export function McpPlayground() {
  const { catalog, loading, error } = useMcpCatalog();
  const [tool, setTool] = useState<string | null>(null);
  const [argsText, setArgsText] = useState("{\n  \n}");
  const [output, setOutput] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const selectTool = (name: string) => {
    setTool(name);
    setArgsText(exampleArgsFor(name));
    setOutput(null);
    setRunError(null);
    setDurationMs(null);
  };

  const handleRun = async () => {
    if (tool === null || running) return;
    setRunning(true);
    setRunError(null);
    try {
      const result = await runToolWithArgs(tool, argsText);
      setOutput(result.output);
      setDurationMs(result.durationMs);
    } catch (unknownError) {
      setRunError(
        unknownError instanceof Error ? unknownError.message : `We couldn't run ${tool}. Try again.`,
      );
      setOutput(null);
      setDurationMs(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Playground</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Pick a tool, edit the JSON arguments, and run it against this server.
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading playground" className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
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
                  <Select.Trigger>
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
                {tool !== null ? (
                  <p className="text-xs text-muted">
                    {catalog.tools.find((entry) => entry.name === tool)?.description}
                  </p>
                ) : null}
                <div>
                  <Label htmlFor="playground-args">Arguments (JSON)</Label>
                  <textarea
                    id="playground-args"
                    value={argsText}
                    onChange={(event) => setArgsText(event.target.value)}
                    rows={8}
                    spellCheck={false}
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed outline-none placeholder:text-muted focus:border-accent"
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
                <Card.Description>Response envelope</Card.Description>
              </Card.Header>
              <Card.Content>
                <pre className="max-h-[480px] overflow-auto rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed tabular-nums">
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
