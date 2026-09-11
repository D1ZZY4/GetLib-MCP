"use client";

import { useState } from "react";
import type { Key } from "@heroui/react";
import { AlertDialog, Button, Card, Label, ListBox, Select, Skeleton } from "@heroui/react";
import { EmptyState } from "@/web/components/ui/empty-state";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { Pill } from "@/web/components/ui/pill";
import { SELECT_MENU_POPOVER_CLASS } from "@/web/components/ui/select-menu";
import { useApiData } from "@/web/hooks/use-api-data";
import { FormRowSkeleton, ListRowSkeleton } from "@/web/components/ui/skeletons";
import { formatLogTime } from "@/web/lib/format";
import { notifyCopied, notifyCopyFailed, notifyError, notifySuccess } from "@/web/lib/notify";
import type { ApiKeyView, CreatedApiKey } from "@/web/types/mcp";
import {
  createApiKey,
  deleteApiKey,
  fetchApiKeys,
  regenerateApiKey,
  updateApiKey,
} from "../services/api-keys.service";

const LOAD_ERROR = "We couldn't load API keys. Try again in a moment.";

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never expires", days: null as number | null },
  { value: "7", label: "7 days", days: 7 as number | null },
  { value: "30", label: "30 days", days: 30 as number | null },
  { value: "90", label: "90 days", days: 90 as number | null },
  { value: "365", label: "1 year", days: 365 as number | null },
] as const;

type ExpiryOption = (typeof EXPIRY_OPTIONS)[number]["value"];

function expiryToIso(option: ExpiryOption): string | undefined {
  const found = EXPIRY_OPTIONS.find((entry) => entry.value === option);
  if (!found || found.days === null) return undefined;
  return new Date(Date.now() + found.days * 86_400_000).toISOString();
}

function isExpired(expiresAt: string | null): boolean {
  return expiresAt !== null && Date.parse(expiresAt) <= Date.now();
}

function expiryLabel(expiresAt: string | null): string {
  if (expiresAt === null) return "Never expires";
  if (isExpired(expiresAt)) return `Expired ${formatLogTime(expiresAt)}`;
  return `Expires ${formatLogTime(expiresAt)}`;
}

export function McpApiKeys() {
  const { data: snapshot, loading, error, retry } = useApiData(fetchApiKeys, LOAD_ERROR);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<ExpiryOption>("never");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<CreatedApiKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyView | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyView | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<ApiKeyView | null>(null);
  const [editName, setEditName] = useState("");
  const [editExpiry, setEditExpiry] = useState<ExpiryOption | "keep">("keep");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createApiKey(
        name.trim().length > 0 ? name.trim() : undefined,
        expiryToIso(expiry),
      );
      setFreshKey(created);
      setName("");
      setExpiry("never");
      retry();
    } catch (err) {
      const message = err instanceof Error ? err.message : LOAD_ERROR;
      setCreateError(message);
      notifyError("Could not create API key", message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey.key);
      notifyCopied("API key");
    } catch {
      notifyCopyFailed();
    }
  };

  const handleCopyRow = async (prefix: string) => {
    // Only the stored prefix can be copied here: full secrets exist
    // solely in the one-time creation card because the database
    // keeps hashes alone. The toast says so, so a prefix in the
    // clipboard is never mistaken for a working key.
    try {
      await navigator.clipboard.writeText(prefix);
      notifyCopied(
        "Key prefix",
        "Prefixes identify keys; only full secrets authenticate. Revoke to reissue a lost secret.",
      );
    } catch {
      notifyCopyFailed();
    }
  };

  const handleDeleteRequest = (key: ApiKeyView) => {
    setDeleteTarget(key);
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
      notifySuccess("API key deleted", `"${deleteTarget.name}" stopped working immediately.`);
      retry();
    } catch (err) {
      const message =
        err instanceof Error ? `Could not delete "${deleteTarget.name}". ${err.message}` : LOAD_ERROR;
      setDeleteError(message);
      notifyError("Could not delete API key", message);
    } finally {
      setDeleting(false);
    }
  };

  const handleRevokeRequest = (key: ApiKeyView) => {
    setRevokeTarget(key);
    setRevokeError(null);
  };

  const handleRevokeCancel = () => {
    if (revoking) return;
    setRevokeTarget(null);
    setRevokeError(null);
  };

  const handleRevokeConfirm = async () => {
    if (revokeTarget === null || revoking) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      const rotated = await regenerateApiKey(revokeTarget.id);
      setFreshKey(rotated);
      setRevokeTarget(null);
      notifySuccess(
        "Key revoked and reissued",
        "The old secret stopped working. Copy the new one now.",
      );
      retry();
    } catch (err) {
      const message =
        err instanceof Error ? `Could not revoke "${revokeTarget.name}". ${err.message}` : LOAD_ERROR;
      setRevokeError(message);
      notifyError("Could not revoke API key", message);
    } finally {
      setRevoking(false);
    }
  };

  const handleEditRequest = (key: ApiKeyView) => {
    setEditTarget(key);
    setEditName(key.name);
    setEditExpiry("keep");
    setEditError(null);
  };

  const handleEditCancel = () => {
    if (editing) return;
    setEditTarget(null);
    setEditError(null);
  };

  const handleEditConfirm = async () => {
    if (editTarget === null || editing) return;
    const trimmed = editName.trim();
    const nameChanged = trimmed.length > 0 && trimmed !== editTarget.name;
    const expiryChanged = editExpiry !== "keep";
    if (!nameChanged && !expiryChanged) {
      setEditTarget(null);
      return;
    }
    setEditing(true);
    setEditError(null);
    try {
      await updateApiKey(editTarget.id, {
        ...(nameChanged ? { name: trimmed } : {}),
        ...(expiryChanged
          ? { expiresAt: editExpiry === "never" ? null : (expiryToIso(editExpiry) ?? null) }
          : {}),
      });
      setEditTarget(null);
      notifySuccess("API key updated", `"${trimmed.length > 0 ? trimmed : editTarget.name}" saved.`);
      retry();
    } catch (err) {
      const message =
        err instanceof Error ? `Could not update "${editTarget.name}". ${err.message}` : LOAD_ERROR;
      setEditError(message);
      notifyError("Could not update API key", message);
    } finally {
      setEditing(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="API keys"
        description="Long-lived credentials for MCP clients and scripts. Use one as an Authorization: Bearer header with full management access instead of a 12-hour session token. Keys are stored hashed and full secrets are shown once. Revoke reissues a key; deleting removes it immediately and cannot be undone."
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
                Copy key
              </Button>
              <Button variant="secondary" size="sm" onPress={() => setFreshKey(null)}>
                Dismiss
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Tip: click the key text to select it manually.
              {freshKey.expiresAt ? ` Expires ${formatLogTime(freshKey.expiresAt)}.` : ""}
            </p>
          </Card.Content>
        </Card>
      ) : null}

      <Card>
        <Card.Header>
          <Card.Title>Create a key</Card.Title>
          <Card.Description>
            Name it after the client or script that will hold it, or leave it blank for a generated name.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-col gap-2">
            <div>
              <Label htmlFor="api-key-name">Key name (optional)</Label>
              <input
                id="api-key-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleCreate();
                }}
                placeholder="e.g. opencode-laptop, blank for key-a1b2c3"
                autoComplete="off"
                maxLength={100}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <span id="api-key-expiry-label" className="text-xs text-muted">
                  Expires
                </span>
                <Select
                  className="mt-1.5 w-40"
                  aria-labelledby="api-key-expiry-label"
                  value={expiry as Key}
                  onChange={(key) => {
                    if (typeof key === "string" && (key === "never" || key === "7" || key === "30" || key === "90" || key === "365")) {
                      setExpiry(key);
                    }
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover className={SELECT_MENU_POPOVER_CLASS}>
                    <ListBox>
                      {EXPIRY_OPTIONS.map((option) => (
                        <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                          {option.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <Button
                size="sm"
                onPress={() => void handleCreate()}
                isDisabled={creating}
                className="shrink-0"
              >
                {creating ? "Creating" : "Create key"}
              </Button>
            </div>
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
              {snapshot.keys.map((key) => {
                const expired = isExpired(key.expiresAt);
                return (
                  <li key={key.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={`${key.name} ${key.prefix}...`}>
                        {key.name}{" "}
                        <span className="font-mono text-xs text-muted">{key.prefix}...</span>
                        {expired ? (
                          <Pill tone="bg-danger/10 text-danger">Expired</Pill>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">
                        Created {formatLogTime(key.createdAt)}
                        {key.lastUsedAt ? ` · last used ${formatLogTime(key.lastUsedAt)}` : " · never used"}
                        {` · ${expiryLabel(key.expiresAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => void handleCopyRow(key.prefix)}
                        aria-label={`Copy prefix for ${key.name}`}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => handleEditRequest(key)}
                        aria-label={`Edit ${key.name}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => handleRevokeRequest(key)}
                        aria-label={`Revoke and reissue ${key.name}`}
                      >
                        Revoke
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => handleDeleteRequest(key)}
                        aria-label={`Delete ${key.name}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
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
      <AlertDialog.Backdrop
        isOpen={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) handleRevokeCancel();
        }}
        className="bg-overlay/50 dark:bg-overlay/60"
        variant="blur"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="relative overflow-hidden border border-border/80 bg-surface shadow-2xl ring-1 ring-warning/10 sm:max-w-[400px] dark:border-border/90 dark:bg-surface dark:ring-warning/15">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-warning/10 to-transparent dark:from-warning/15"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-warning/40 to-transparent dark:via-warning/50"
            />
            <AlertDialog.Header className="relative">
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>Revoke and reissue this key?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="relative">
              <p className="text-muted">
                The current secret for{" "}
                <strong className="text-foreground">
                  {revokeTarget !== null ? revokeTarget.name : ""}
                </strong>{" "}
                stops working immediately. A new secret is shown once for you to copy.
              </p>
              {revokeError ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {revokeError}
                </p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={revoking} onPress={handleRevokeCancel}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                isDisabled={revoking}
                onPress={() => void handleRevokeConfirm()}
              >
                {revoking ? "Revoking..." : "Revoke and reissue"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
      <AlertDialog.Backdrop
        isOpen={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) handleEditCancel();
        }}
        className="bg-overlay/50 dark:bg-overlay/60"
        variant="blur"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="relative overflow-hidden border border-border/80 bg-surface shadow-2xl sm:max-w-[400px] dark:border-border/90 dark:bg-surface">
            <AlertDialog.Header className="relative">
              <AlertDialog.Heading>
                Edit {editTarget !== null ? `“${editTarget.name}”` : "API key"}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="relative">
              <div className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="api-key-edit-name">Key name</Label>
                  <input
                    id="api-key-edit-name"
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    autoComplete="off"
                    maxLength={100}
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
                  />
                </div>
                <div>
                  <span id="api-key-edit-expiry-label" className="text-xs text-muted">
                    Expires (keep current unless changed)
                  </span>
                  <Select
                    className="mt-1.5 w-44"
                    aria-labelledby="api-key-edit-expiry-label"
                    value={editExpiry as Key}
                    onChange={(key) => {
                      if (typeof key === "string" && (key === "keep" || key === "never" || key === "7" || key === "30" || key === "90" || key === "365")) {
                        setEditExpiry(key);
                      }
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className={SELECT_MENU_POPOVER_CLASS}>
                      <ListBox>
                        <ListBox.Item id="keep" textValue="Keep current">
                          Keep current
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        {EXPIRY_OPTIONS.map((option) => (
                          <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                            {option.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>
              {editError ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {editError}
                </p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={editing} onPress={handleEditCancel}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                isDisabled={editing}
                onPress={() => void handleEditConfirm()}
              >
                {editing ? "Saving..." : "Save changes"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </PageContainer>
  );
}
