"use client";

import { Card, Skeleton } from "@heroui/react";
import { EmptyState } from "@/web/components/ui/empty-state";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "@/web/components/layout/page-container";
import { DefinitionListSkeleton } from "@/web/components/ui/skeletons";
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
    retrySave,
    notice,
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

      {notice ? (
        <p role="status" className="text-sm text-muted">
          {notice}
        </p>
      ) : null}

      {saveStatus === "error" ? (
        <p role="alert" className="text-sm text-danger">
          Couldn&apos;t save changes.{" "}
          <button
            type="button"
            onClick={retrySave}
            className="rounded underline outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Retry now
          </button>
        </p>
      ) : null}

      {loading ? (
        <div role="status" aria-label="Loading sources" className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Card key={index} className="h-full">
                <Card.Header>
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-48 max-w-full rounded" />
                </Card.Header>
                <Card.Content>
                  <div className="space-y-3" aria-hidden="true">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-9 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-2/3 rounded" />
                        <Skeleton className="h-3 w-full rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-9 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-1/2 rounded" />
                        <Skeleton className="h-3 w-4/5 rounded" />
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
          <Card>
            <Card.Header>
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-56 max-w-full rounded" />
            </Card.Header>
            <Card.Content>
              <DefinitionListSkeleton rows={2} />
            </Card.Content>
          </Card>
        </div>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No sources registered"
          description="No sources registered on this server."
        />
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
