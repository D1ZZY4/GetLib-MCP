"use client";

import Link from "next/link";
import { Card, Skeleton } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchDocDetail } from "../services/discover.service";
import { ArrowRightIcon } from "../../../components/ui/icons";

const LOAD_ERROR = "We couldn't load this document. Try again in a moment.";

const VERDICT_TONE: Record<string, string> = {
  strong: "bg-success/10 text-success",
  weak: "bg-warning/10 text-warning",
  miss: "bg-danger/10 text-danger",
  untargeted: "bg-surface-tertiary text-muted",
};

const VERDICT_LABEL: Record<string, string> = {
  strong: "Strong match",
  weak: "Weak match",
  miss: "No strong match",
  untargeted: "Full document",
};

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function DocDetail({ sourceUrl, topic }: { sourceUrl: string; topic: string }) {
  const backHref = topic.trim() === "" ? "/discover" : `/discover?q=${encodeURIComponent(topic)}`;
  const valid = isHttpUrl(sourceUrl);
  const { data, loading, error, retry } = useApiData(
    () => (valid ? fetchDocDetail(sourceUrl, topic) : Promise.reject(new Error("bad url"))),
    LOAD_ERROR,
  );

  return (
    <PageContainer>
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
      >
        <ArrowRightIcon className="size-3.5 rotate-180" />
        Back to results
      </Link>

      {!valid ? (
        <Card>
          <Card.Content>
            <p role="alert" className="text-sm text-danger">
              That source link isn&apos;t a valid web address.
            </p>
          </Card.Content>
        </Card>
      ) : loading ? (
        <div role="status" aria-label="Loading document" className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : error !== null || data === null ? (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-danger">
            {error ?? LOAD_ERROR}
          </p>
          <button
            type="button"
            onClick={retry}
            className="text-sm font-medium text-accent underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {data.displayName}
              </h1>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${VERDICT_TONE[data.verdict] ?? VERDICT_TONE.untargeted}`}
              >
                {VERDICT_LABEL[data.verdict] ?? data.verdict}
              </span>
              {data.truncated ? (
                <span className="shrink-0 rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-muted">
                  Truncated
                </span>
              ) : null}
            </div>
            <p className="mt-1 max-w-xl text-sm text-muted">
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-accent hover:underline"
              >
                {data.sourceUrl}
              </a>
            </p>
          </header>
          {data.verdict === "miss" ? (
            <Card>
              <Card.Content>
                <p className="text-sm text-muted">
                  This source doesn&apos;t strongly match your query. Verify against the
                  original page before relying on it.
                </p>
              </Card.Content>
            </Card>
          ) : null}
          <Card>
            <Card.Content>
              <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap tabular-nums">
                {data.content === "" ? "No readable content was extracted." : data.content}
              </pre>
            </Card.Content>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
