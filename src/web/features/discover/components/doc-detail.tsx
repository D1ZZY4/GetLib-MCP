"use client";

import { Card, Skeleton } from "@heroui/react";
import { BackLink } from "@/web/components/ui/back-link";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
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
      <BackLink href={backHref}>
        <ArrowRightIcon className="size-3.5 rotate-180" />
        Back to results
      </BackLink>

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
        <LoadError message={error ?? LOAD_ERROR} onRetry={retry} />
      ) : (
        <>
          <PageHeader
            title={data.displayName}
            description={
              <a
                href={data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-accent hover:underline"
              >
                {data.sourceUrl}
              </a>
            }
            badge={
              <>
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
              </>
            }
          />
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
