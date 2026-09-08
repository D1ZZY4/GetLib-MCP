"use client";

import { Card } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { FilterSelect } from "./filter-select";
import { LibraryListEditor } from "./library-list-editor";
import { SourceGroupCard } from "./source-group";
import { mockFilterSelects } from "../services/sources.service";
import { useSourceAccess } from "../hooks/use-source-access";

export function SourceAccessPage() {
  const { groups, filters, blocked, wildcards, toggleSource, setFilter, addEntry, removeEntry } =
    useSourceAccess();

  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Source access</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Control which types of documentation sources are accessible to this teamspace. Mock
          settings only.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <SourceGroupCard key={group.id} group={group} onToggle={toggleSource} />
        ))}
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Library filters</Card.Title>
          <Card.Description>
            Control which libraries are accessible to this teamspace.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mockFilterSelects.map((filter) => (
              <FilterSelect
                key={filter.id}
                filter={filter}
                value={filters[filter.id] ?? filter.defaultOptionId}
                onChange={(optionId) => setFilter(filter.id, optionId)}
              />
            ))}
          </div>
        </Card.Content>
      </Card>

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
    </PageContainer>
  );
}
