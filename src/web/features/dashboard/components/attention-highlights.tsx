"use client";

import { useRouter } from "next/navigation";
import { Alert, Button, Card } from "@heroui/react";
import type { MockAttention } from "../../../types/library";
import { ArrowRightIcon } from "../../../components/ui/icons";

interface AttentionHighlightsPanelProps {
  items: MockAttention[];
}

const STATUS_BY_SEVERITY: Record<MockAttention["severity"], "danger" | "warning" | "success"> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

const STATUS_FILL: Record<MockAttention["severity"], string> = {
  high: "border-danger/20 bg-danger/10",
  medium: "border-warning/25 bg-warning/10",
  low: "border-success/20 bg-success/10",
};

export function AttentionHighlightsPanel({ items }: AttentionHighlightsPanelProps) {
  const router = useRouter();

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Attention highlights</Card.Title>
        <Card.Description>
          {items.length === 0
            ? "No warnings. Everything looks healthy."
            : `${items.length} ${items.length === 1 ? "warning" : "warnings"} from mock audit`}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {items.length === 0 ? (
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>All clear</Alert.Title>
              <Alert.Description>No version or risk warnings found.</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <div className="grid items-start gap-3" role="list" aria-label="Attention items">
            {items.map((item) => (
              <Alert key={item.id} status={STATUS_BY_SEVERITY[item.severity]} role="listitem" className={STATUS_FILL[item.severity]}>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{item.libraryName}</Alert.Title>
                  <Alert.Description>
                    {item.message}
                    <span className="mt-1 block font-mono text-xs tabular-nums">
                      {item.installedVersion} → {item.latestVersion}
                    </span>
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ))}
          </div>
        )}
      </Card.Content>
      <Card.Footer>
        <Button variant="ghost" size="sm" onPress={() => router.push("/statistics")}>
          Open audit report
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </Card.Footer>
    </Card>
  );
}
