"use client";

import { useState } from "react";
import { AlertDialog, Button, Card, Label, Skeleton } from "@heroui/react";
import { EmptyState } from "@/web/components/ui/empty-state";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { FormRowSkeleton, ListRowSkeleton } from "@/web/components/ui/skeletons";
import { formatLogTime } from "@/web/lib/format";
import type { CreatedApiKey } from "@/web/types/mcp";
import { createApiKey, deleteApiKey, fetchApiKeys } from "../services/api-keys.service";

const LOAD_ERROR = "We couldn't load API keys. Try again in a moment.";

export function McpApiKeys() {
  const { data: snapshot, loading, error, retry } = useApiData(fetchApiKeys, LOAD_ERROR);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

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

  const handleCopyRow = async (id: number, prefix: string) => {
    // Only the stored prefix can be copied here: full keys exist
    // solely in the one-time creation card because the database
    // keeps hashes alone.
    try {
      await navigator.clipboard.writeText(prefix);
      setCopiedId(id);
    } catch {
      setCopiedId(null);
    }
  };

  const handleDeleteRequest = (id: number, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteError(null);
  };

  const handleDeleteCancel = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget === null || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteApiKey(deleteTarget.id);
      if (freshKey?.id === deleteTarget.id) setFreshKey(null);
      setDeleteTarget(null);
      retry();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? `Could not delete "${deleteTarget.name}". ${err.message}` : LOAD_ERROR,
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="API keys"
        description="Long-lived credentials for MCP clients and scripts. Use one as an Authorization: Bearer header with full management access instead of a 12-hour session token. Keys are stored hashed and shown once. Deleting removes the key immediately and cannot be undone."
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
        <EmptyState
          title="No API keys yet"
          description="Create one above and pass it as Authorization Bearer from any MCP client."
        />
      ) : (
        <Card>
          <Card.Content>
            <ul className="divide-y divide-border" aria-label="API keys">
              {snapshot.keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={`${key.name} ${key.prefix}...`}>
                      {key.name}{" "}
                      <span className="font-mono text-xs text-muted">{key.prefix}...</span>
                    </p>
                    <p className="text-xs text-muted">
                      Created {formatLogTime(key.createdAt)}
                      {key.lastUsedAt ? ` · last used ${formatLogTime(key.lastUsedAt)}` : " · never used"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => void handleCopyRow(key.id, key.prefix)}
                      aria-label={`Copy prefix for ${key.name}`}
                    >
                      {copiedId === key.id ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => handleDeleteRequest(key.id, key.name)}
                      aria-label={`Delete ${key.name}`}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}
      {deleteError && deleteTarget === null ? (
        <p role="alert" className="text-sm text-danger">
          {deleteError}{" "}
          <button type="button" onClick={retry} className="rounded underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            Retry
          </button>
        </p>
      ) : null}
      <AlertDialog.Backdrop
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel();
        }}
        className="bg-overlay/50 dark:bg-overlay/60"
        variant="blur"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="relative overflow-hidden border border-border/80 bg-surface shadow-2xl ring-1 ring-danger/10 sm:max-w-[400px] dark:border-border/90 dark:bg-surface dark:ring-danger/15">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-danger/10 to-transparent dark:from-danger/15"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-danger/40 to-transparent dark:via-danger/50"
            />
            <AlertDialog.Header className="relative">
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete this API key?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="relative">
              <p className="text-muted">
                This will permanently delete{" "}
                <strong className="text-foreground">
                  {deleteTarget !== null ? deleteTarget.name : ""}
                </strong>{" "}
                and the key will stop working immediately. This action cannot be undone.
              </p>
              {deleteError ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {deleteError}
                </p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={deleting} onPress={handleDeleteCancel}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isDisabled={deleting}
                onPress={() => void handleDeleteConfirm()}
              >
                {deleting ? "Deleting..." : "Delete key"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </PageContainer>
  );
}
