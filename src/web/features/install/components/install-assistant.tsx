"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Tabs } from "@heroui/react";
import { mockAssistants, mockTransportModes } from "../services/install.service";
import type { AssistantTransport } from "../../../types/library";
import { PageContainer } from "../../../components/layout/page-container";

function transportLabel(transport: AssistantTransport): string {
  if (transport === "stdio") return "STDIO";
  if (transport === "sse") return "SSE";
  return "Streamable HTTP";
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "absolute";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      return true;
    } catch {
      return false;
    }
  }
}

export function InstallAssistant() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async (id: string, snippet: string) => {
    const ok = await copyText(snippet);
    if (ok) {
      setCopyError(null);
      setCopiedId(id);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } else {
      setCopyError("Copy failed. Select the snippet manually and press Ctrl+C.");
    }
  };

  if (mockAssistants.length === 0) {
    return (
      <PageContainer>
        <header>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Install to your AI agents
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            No AI agents configured yet.
          </p>
        </header>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Install to your AI agents
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Pick your AI agent, copy the MCP snippet, and follow the setup
          steps. Statuses below are examples until live detection lands.
        </p>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {copiedId !== null ? "Configuration snippet copied to clipboard." : ""}
        {copyError ?? ""}
      </p>
      {copyError !== null ? (
        <p role="alert" className="text-sm text-danger">
          {copyError}
        </p>
      ) : null}

      <section aria-label="Transport modes">
        <h2 className="text-base font-semibold tracking-tight">Transport modes</h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          How your AI agent connects to this server. Each agent below lists the transports it supports.
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {mockTransportModes.map((mode) => (
            <Card key={mode.id}>
              <Card.Header>
                <div className="flex items-center justify-between gap-2">
                  <Card.Title className="font-mono text-sm">{mode.label}</Card.Title>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      mode.status === "available"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {mode.status === "available" ? "Available" : "Planned"}
                  </span>
                </div>
                <Card.Description>{mode.explanation}</Card.Description>
              </Card.Header>
            </Card>
          ))}
        </div>
      </section>

      <Tabs defaultSelectedKey={mockAssistants[0].id} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label="AI agents">
            {mockAssistants.map((assistant) => (
              <Tabs.Tab key={assistant.id} id={assistant.id}>
                {assistant.name}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {mockAssistants.map((assistant) => (
          <Tabs.Panel key={assistant.id} id={assistant.id} className="pt-4">
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between gap-2">
                  <Card.Title>{assistant.name}</Card.Title>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      title="Transports this AI agent supports"
                      className="rounded-full bg-accent/10 px-2.5 py-1 font-mono text-xs font-medium text-accent"
                    >
                      {assistant.transports.map(transportLabel).join(" / ")}
                    </span>
                    <span
                      data-status={assistant.status}
                      className="rounded-full px-2.5 py-1 text-xs font-medium data-[status=connected]:bg-success/15 data-[status=connected]:text-success data-[status=available]:bg-surface-tertiary data-[status=available]:text-muted"
                    >
                      {assistant.status === "connected" ? "Connected" : "Available"}
                    </span>
                  </div>
                </div>
                <Card.Description>{assistant.description}</Card.Description>
              </Card.Header>
              <Card.Content>
                <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm" aria-label={`Setup steps for ${assistant.name}`}>
                  {assistant.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted">{assistant.configFile}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => void handleCopy(assistant.id, assistant.snippet)}
                      aria-label={`Copy ${assistant.name} config snippet`}
                    >
                      {copiedId === assistant.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed tabular-nums">
                    <code>{assistant.snippet}</code>
                  </pre>
                </div>
                {assistant.remoteSnippet !== undefined ? (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted">
                        {assistant.remoteConfigFile ?? "Remote"} ·{" "}
                        {assistant.remoteTransport !== undefined
                          ? transportLabel(assistant.remoteTransport)
                          : null}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() =>
                          void handleCopy(`${assistant.id}-remote`, assistant.remoteSnippet ?? "")
                        }
                        aria-label={`Copy ${assistant.name} remote config snippet`}
                      >
                        {copiedId === `${assistant.id}-remote` ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <pre className="overflow-x-auto rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed tabular-nums">
                      <code>{assistant.remoteSnippet}</code>
                    </pre>
                  </div>
                ) : null}
              </Card.Content>
            </Card>
          </Tabs.Panel>
        ))}
      </Tabs>
    </PageContainer>
  );
}
