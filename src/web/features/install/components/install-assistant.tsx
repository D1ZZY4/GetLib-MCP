"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Skeleton, Tabs } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { availabilityTone } from "@/web/components/ui/status-tone";
import { useInstallCatalog } from "../hooks/use-install-catalog";
import type { AssistantTransport } from "../services/install-api.service";
import { PageContainer } from "@/web/components/layout/page-container";

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

  const { catalog, loading, error, retry } = useInstallCatalog();
  const assistants = catalog?.assistants ?? [];
  const transports = catalog?.transports ?? [];

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Install to your AI agents" description="Loading install instructions." />
        <div role="status" aria-label="Loading install instructions" className="flex flex-col gap-4">
          <div aria-hidden="true">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="mt-1 h-3 w-72 max-w-full rounded" />
          </div>
          <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-64 max-w-full rounded-xl" aria-hidden="true" />
          <Skeleton className="h-72 rounded-xl" aria-hidden="true" />
        </div>
      </PageContainer>
    );
  }

  if (error !== null || catalog === null) {
    return (
      <PageContainer>
        <PageHeader title="Install to your AI agents" />
        <LoadError message={error ?? "Unavailable."} onRetry={retry} />
      </PageContainer>
    );
  }

  if (assistants.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Install to your AI agents" description="No AI agents configured yet." />
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              The install catalog is empty. Restart the server to reload assistant definitions.
            </p>
          </Card.Content>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Install to your AI agents"
        description="Pick your AI agent, copy the MCP snippet, and follow the setup steps."
      />

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
          {transports.map((mode) => (
            <Card key={mode.id}>
              <Card.Header>
                <div className="flex items-center justify-between gap-2">
                  <Card.Title className="font-mono text-sm">{mode.label}</Card.Title>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${availabilityTone(mode.status)}`}
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

      <Tabs defaultSelectedKey={assistants[0]?.id ?? "claude-code"} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label="AI agents">
            {assistants.map((assistant) => (
              <Tabs.Tab key={assistant.id} id={assistant.id}>
                {assistant.name}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {assistants.map((assistant) => (
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
