"use client";

import { Card, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
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
      <PageHeader
        title="Sources"
        description={`Control which documentation sources feed answers for this teamspace. Changes apply to the running server immediately.${totalEntries > 0 ? ` ${totalEntries} source entries live in this server.` : ""}`}
        badge={
          <>
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
          </>
        }
      />

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
        <LoadError message={error} onRetry={retry} />
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
