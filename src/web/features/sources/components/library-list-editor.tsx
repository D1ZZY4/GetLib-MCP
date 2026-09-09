"use client";

import { useState } from "react";
import { Button, Card } from "@heroui/react";

interface LibraryListEditorProps {
  title: string;
  description: string;
  entries: string[];
  searchPlaceholder: string;
  showExport?: boolean;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}

function downloadCsv(filename: string, entries: string[]) {
  const blob = new Blob([["name", ...entries].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function LibraryListEditor({
  title,
  description,
  entries,
  searchPlaceholder,
  showExport = false,
  onAdd,
  onRemove,
}: LibraryListEditorProps) {
  const [query, setQuery] = useState("");

  const handleAdd = () => {
    onAdd(query);
    setQuery("");
  };

  return (
    <Card className="h-full">
      <Card.Header>
        <div className="flex items-center justify-between gap-2">
          <Card.Title>{title}</Card.Title>
          {showExport ? (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => downloadCsv("blocked-libraries.csv", entries)}
            >
              Export CSV
            </Button>
          ) : null}
        </div>
        <Card.Description>{description}</Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAdd();
            }}
            placeholder={searchPlaceholder}
            aria-label={`Search ${title.toLowerCase()}`}
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
          />
          <Button variant="secondary" size="sm" onPress={handleAdd} aria-label={`Add to ${title}`}>
            Add entry
          </Button>
        </div>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No entries in {title.toLowerCase()} yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5" aria-label={`${title} entries`}>
            {entries.map((entry) => (
              <li
                key={entry}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-secondary px-3 py-1.5"
              >
                <span className="truncate font-mono text-sm">{entry}</span>
                <button
                  type="button"
                  onClick={() => onRemove(entry)}
                  aria-label={`Remove ${entry}`}
                  className="shrink-0 text-xs font-medium text-muted transition-colors hover:text-danger"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}
