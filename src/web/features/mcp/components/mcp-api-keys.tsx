"use client";

import { useState } from "react";
import { Button, Card, Label, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { FormRowSkeleton, ListRowSkeleton } from "@/web/components/ui/skeletons";
import { formatLogTime } from "@/web/lib/format";
import type { CreatedApiKey } from "@/web/types/mcp";
import { createApiKey, fetchApiKeys, revokeApiKey } from "../services/api-keys.service";

const LOAD_ERROR = "We couldn't load API keys. Try again in a moment.";

export function McpApiKeys() {
  const { data: snapshot, loading, error, retry } = useApiData(fetchApiKeys, LOAD_ERROR);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const handleCreate = async () => {
    if (name.trim().length === 0 || creating) return;
    setCreating(true);
    setCreateError(null);
    setCopied(false);
    setCopyFailed(false);
    try {
      const created = await createApiKey(name.trim());
      setFreshKey(created);
      setName("");
      retry();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : LOAD_ERROR);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey.key);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  const handleRevoke = async (id: number) => {
    setRevokingId(id);
    try {
      await revokeApiKey(id);
      if (freshKey?.id === id) setFreshKey(null);
      retry();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : LOAD_ERROR);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="API keys"
        description="Long-lived credentials for MCP clients and scripts. Use one as an Authorization: Bearer header with full management access instead of a 12-hour session token. Keys are stored hashed and shown once. Revoking takes effect immediately and cannot be undone."
      />

      {freshKey ? (
        <Card role="status" aria-label="New API key">
          <Card.Header>
            <Card.Title>Copy this key now</Card.Title>
            <Card.Description>
              It will never be shown again. Anyone holding it can call this server with full management access.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border bg-surface-secondary px-3 py-2 font-mono text-sm select-all">
                {freshKey.key}
              </code>
              <Button variant="secondary" size="sm" onPress={handleCopy}>
                {copied ? "Copied" : "Copy key"}
              </Button>
              <Button variant="secondary" size="sm" onPress={() => setFreshKey(null)}>
                Dismiss
              </Button>
            </div>
            <p role="status" aria-live="polite" className="mt-2 text-xs text-muted">
              {copyFailed
                ? "Copy failed - select the key text manually and press Ctrl+C."
                : "Tip: click the key text to select it manually."}
            </p>
          </Card.Content>
        </Card>
      ) : null}

      <Card>
        <Card.Header>
          <Card.Title>Create a key</Card.Title>
          <Card.Description>Name it after the client or script that will hold it.</Card.Description>
        </Card.Header>
        <Card.Content>
          <Label htmlFor="api-key-name">Key name</Label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input
              id="api-key-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreate();
              }}
              placeholder="e.g. opencode-laptop"
              autoComplete="off"
              maxLength={100}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            />
            <Button
              size="sm"
              onPress={() => void handleCreate()}
              isDisabled={creating}
              className="shrink-0"
            >
              {creating ? "Creating" : "Create key"}
            </Button>
          </div>
          {createError ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {createError}
            </p>
          ) : null}
        </Card.Content>
      </Card>

      {loading ? (
        <div role="status" aria-label="Loading API keys" className="flex flex-col gap-4">
          <Card>
            <Card.Header>
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-56 max-w-full rounded" />
            </Card.Header>
            <Card.Content>
              <FormRowSkeleton orientation="horizontal" />
            </Card.Content>
          </Card>
          <Card>
            <Card.Content>
              <div className="divide-y divide-border">
                <ListRowSkeleton action="button" />
                <ListRowSkeleton action="button" />
              </div>
            </Card.Content>
          </Card>
        </div>
      ) : error !== null || snapshot === null ? (
        <LoadError message={error ?? LOAD_ERROR} onRetry={retry} />
      ) : snapshot.keys.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No API keys yet. Create one above and pass it as{" "}
              <code className="font-mono">Authorization: Bearer glk_...</code> from any MCP client.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="API keys">
              {snapshot.keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {key.name}{" "}
                      <span className="font-mono text-xs text-muted">{key.prefix}...</span>
                    </p>
                    <p className="text-xs text-muted">
                      Created {formatLogTime(key.createdAt)}
                      {key.lastUsedAt ? ` · last used ${formatLogTime(key.lastUsedAt)}` : " · never used"}
                    </p>
                  </div>
                  {key.revoked ? (
                    <span className="shrink-0 rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-muted">
                      Revoked
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => void handleRevoke(key.id)}
                      isDisabled={revokingId === key.id}
                      aria-label={`Revoke ${key.name}`}
                    >
                      {revokingId === key.id ? "Revoking" : "Revoke"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}
    </PageContainer>
  );
}
