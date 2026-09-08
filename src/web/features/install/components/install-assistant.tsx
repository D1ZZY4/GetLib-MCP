"use client";

import { useState } from "react";
import { Button, Card, Tabs } from "@heroui/react";
import { mockAssistants } from "../services/install.service";
import { PageContainer } from "../../../components/layout/page-container";

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

  const handleCopy = async (id: string, snippet: string) => {
    const ok = await copyText(snippet);
    if (ok) {
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    }
  };

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Install to assistant
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Pick your assistant, copy the mock MCP snippet, and follow the setup
          steps. Connection states below are mock data.
        </p>
      </header>

      <Tabs defaultSelectedKey={mockAssistants[0].id} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Assistants">
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
                  <span
                    data-status={assistant.status}
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium data-[status=connected]:bg-success/15 data-[status=connected]:text-success data-[status=available]:bg-surface-tertiary data-[status=available]:text-muted"
                  >
                    {assistant.status === "connected" ? "Connected" : "Available"}
                  </span>
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
              </Card.Content>
            </Card>
          </Tabs.Panel>
        ))}
      </Tabs>
    </PageContainer>
  );
}
