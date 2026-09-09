"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Key } from "@heroui/react";
import { Card, Label, ListBox, Select, Skeleton } from "@heroui/react";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { PageContainer } from "../../../components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { formatLogTime } from "@/web/lib/format";
import { fetchLogs } from "../services/mcp.service";
import { SearchIcon } from "../../../components/ui/icons";

const LOAD_ERROR = "We couldn't load recent logs. Check your connection and try again.";

type StatusFilter = "all" | "ok" | "fail";

const LIMITS = [25, 50, 100] as const;

export function McpLogViewer() {
  const [limit, setLimit] = useState<number>(100);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const { data, loading, error, retry } = useApiData(() => fetchLogs(limit), LOAD_ERROR, {
    // Request log is a live tail: new tool runs stream in without interaction.
    refreshIntervalMs: 5_000,
  });
  const logs = data?.logs ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (status === "ok" && !entry.ok) return false;
      if (status === "fail" && entry.ok) return false;
      if (needle === "") return true;
      const haystack = `${entry.name} ${entry.requestId ?? ""} ${entry.id}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [logs, query, status]);

  return (
    <PageContainer>
      <PageHeader
        title="Logs"
        description={`Last ${limit} tool runs recorded by the registry middleware in this process.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accent">
          <SearchIcon className="size-4 shrink-0 text-muted" />
          <label htmlFor="logs-search" className="sr-only">
            Filter logs by tool or request id
          </label>
          <input
            id="logs-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by tool or request id"
            autoComplete="off"
            className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="logs-status" className="text-xs text-muted">
              Status
            </Label>
            <Select
              className="w-28"
              aria-label="Status filter"
              value={status as Key}
              onChange={(key) => {
                if (key === "ok" || key === "fail" || key === "all") setStatus(key);
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue="All">
                    All
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="ok" textValue="ok">
                    ok
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="fail" textValue="fail">
                    fail
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="logs-limit" className="text-xs text-muted">
              Show
            </Label>
            <Select
              className="w-24"
              aria-label="Log limit"
              value={String(limit) as Key}
              onChange={(key) => {
                const next = Number(key);
                if (next === 25 || next === 50 || next === 100) {
                  setLimit(next);
                  retry();
                }
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {LIMITS.map((value) => (
                    <ListBox.Item key={value} id={String(value)} textValue={String(value)}>
                      {value}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading logs" className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : error !== null ? (
        <LoadError message={error} onRetry={retry} />
      ) : logs.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">No tool runs recorded yet. Run a tool first.</p>
          </Card.Content>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-muted">
              No log entries match these filters. Clear the search or pick another status.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content>
            <p role="status" className="mb-2 text-xs text-muted tabular-nums">
              Showing {filtered.length} of {logs.length}
            </p>
            <ul className="divide-y divide-border" aria-label="MCP request logs">
              {filtered.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-2 font-mono text-xs"
                >
                  <span className="truncate">
                    <Link href={`/mcp/logs/${entry.id}`} className="hover:text-accent hover:underline">
                      {entry.name}
                    </Link>{" "}
                    <span className="text-muted">· {formatLogTime(entry.timestamp)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className={entry.ok ? "text-success" : "text-danger"}>
                      {entry.ok ? "ok" : "fail"}
                    </span>{" "}
                    <span className="text-muted">{entry.durationMs}ms</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}
    </PageContainer>
  );
}
