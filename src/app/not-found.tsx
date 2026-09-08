import Link from "next/link";
import { Card } from "@heroui/react";
import { PageContainer } from "@/web/components/layout/page-container";

export default function NotFound() {
  return (
    <PageContainer variant="center">
      <p className="font-mono text-sm text-muted tabular-nums">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        This page does not exist. Head back to the dashboard.
      </p>
      <Card className="mt-6 w-full max-w-sm">
        <Card.Footer>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Back to dashboard
          </Link>
        </Card.Footer>
      </Card>
    </PageContainer>
  );
}
