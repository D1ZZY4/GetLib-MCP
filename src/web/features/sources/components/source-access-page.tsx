"use client";

import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { LibraryListEditor } from "./library-list-editor";
import { SourceGroupCard } from "./source-group";
import { useSourceAccess } from "../hooks/use-source-access";

export function SourceAccessPage() {
  const {
    groups,
    blocked,
    wildcards,
    loading,
    error,
    retry,
    saveStatus,
    totalEntries,
    toggleSource,
    addEntry,
    removeEntry,
  } = useSourceAccess();

  return (
    <PageContainer>
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sources</h1>
          {saveStatus === "saving" ? (
            <span role="status" className="text-xs text-muted">
              Saving...
            </span>
          ) : null}
          {saveStatus === "saved" ? (
            <span role="status" className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              Saved
            </span>
          ) : null}
          {saveStatus === "error" ? (
            <span role="alert" className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
              Couldn&apos;t save changes
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Control which documentation sources feed answers for this teamspace.
          Changes apply to the running server immediately.
          {totalEntries > 0 ? ` ${totalEntries} source entries live in this server.` : ""}
        </p>
      </header>

      {loading ? (
        <div role="status" aria-label="Loading sources" className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error !== null ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <button type="button" onClick={retry} className="text-sm font-medium text-accent underline">
            Retry
          </button>
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">No sources registered on this server.</p>
          </Card.Content>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {groups.map((group) => (
              <SourceGroupCard key={group.id} group={group} onToggle={toggleSource} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <LibraryListEditor
              title="Blocked libraries"
              description="Exclude specific libraries or organizations from results."
              entries={blocked}
              searchPlaceholder="e.g. example-legacy-auth"
              showExport
              onAdd={(name) => addEntry("blocked", name)}
              onRemove={(name) => removeEntry("blocked", name)}
            />
            <LibraryListEditor
              title="Wildcard libraries"
              description="These libraries will always be accessible, even if they don't meet quality thresholds or are blocked."
              entries={wildcards}
              searchPlaceholder="e.g. react"
              onAdd={(name) => addEntry("wildcards", name)}
              onRemove={(name) => removeEntry("wildcards", name)}
            />
          </div>
        </>
      )}
    </PageContainer>
  );
}
