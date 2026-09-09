"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { verdictTone } from "@/web/components/ui/verdict-tone";
import type { DiscoverResult } from "../services/discover.service";

const VERDICT_LABEL: Record<DiscoverResult["evidence"]["verdict"], string> = {
  strong: "Strong evidence",
  weak: "Weak evidence",
  miss: "No strong match",
};

export function SearchResults({ result }: { result: DiscoverResult }) {
  if (result.sources.length === 0) {
    return (
      <Card>
        <Card.Content>
          <p className="text-sm font-medium">No results for &ldquo;{result.query}&rdquo;</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Be more specific, add the library name and topic.</li>
            <li>Try resolving a library first, then ask about it.</li>
            <li>Check the spelling and try again.</li>
          </ul>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p role="status" className="text-sm text-muted tabular-nums">
          {result.sources.length} {result.sources.length === 1 ? "source" : "sources"} for
          &ldquo;{result.query}&rdquo;
        </p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${verdictTone(result.evidence.verdict)}`}
        >
          {VERDICT_LABEL[result.evidence.verdict]}
        </span>
      </div>
      <ul className="grid gap-4 md:grid-cols-2" aria-label="Search results">
        {result.sources.map((source) => {
          const detailHref = `/discover/doc?url=${encodeURIComponent(source.url)}&q=${encodeURIComponent(result.query)}`;
          return (
            <li key={`${source.name}-${source.url}`}>
              <Card className="flex h-full flex-col transition-colors hover:border-accent">
                <Link href={detailHref} className="flex h-full flex-col rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Open details for ${source.name}`}>
                  <Card.Header>
                    <Card.Title className="truncate">{source.name}</Card.Title>
                    <Card.Description className="truncate font-mono text-xs text-accent">
                      {source.url}
                    </Card.Description>
                  </Card.Header>
                  <Card.Content>
                    <p className="line-clamp-4 text-sm leading-relaxed text-muted">
                      {source.content}
                    </p>
                  </Card.Content>
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
