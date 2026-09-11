"use client";

import { Card, Skeleton } from "@heroui/react";
import { BackLink } from "@/web/components/ui/back-link";
import { LoadError } from "@/web/components/ui/load-error";
import { PageHeader } from "@/web/components/ui/page-header";
import { verdictTone } from "./verdict-tone";
import { Pill } from "@/web/components/ui/pill";
import { PageContainer } from "@/web/components/layout/page-container";
import { DetailHeaderSkeleton } from "@/web/components/ui/skeletons";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchDocDetail } from "../services/discover.service";
import { ArrowRightIcon } from "@/web/components/ui/icons";

const LOAD_ERROR = "We couldn't load this document. Try again in a moment.";

const VERDICT_LABEL: Record<string, string> = {
  strong: "Strong evidence",
  weak: "Weak evidence",
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
        <div role="status" aria-label="Loading document" className="flex flex-col gap-4">
          <DetailHeaderSkeleton />
          <Card>
            <Card.Content>
              <div className="space-y-2.5" aria-hidden="true">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-11/12 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/5 rounded" />
              </div>
            </Card.Content>
          </Card>
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
                className="rounded font-mono text-xs text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {data.sourceUrl}
              </a>
            }
            badge={
              <>
                <Pill tone={verdictTone(data.verdict)}>{VERDICT_LABEL[data.verdict] ?? "Unknown evidence"}</Pill>
                {data.truncated ? (
                  <Pill tone="bg-surface-tertiary text-muted">Truncated</Pill>
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
          {data.content === "" ? (
            <p className="text-sm text-muted">
              No readable content was extracted. Open the original page to read it there.
            </p>
          ) : (
            <Card>
              <Card.Content>
                <pre className="overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap tabular-nums">
                  {data.content}
                </pre>
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
}
