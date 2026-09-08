"use client";

import { Card } from "@heroui/react";
import { PageContainer } from "../../../components/layout/page-container";

export function DocsPage() {
  return (
    <PageContainer>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Docs</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Guides and references for working with this server.
        </p>
      </header>

      <Card>
        <Card.Content>
          <div
            role="status"
            aria-label="Documentation under development"
            className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 py-16 text-center"
          >
            <p className="text-xl font-semibold tracking-tight sm:text-2xl">Under development</p>
            <p className="max-w-sm text-sm text-muted">
              Documentation pages will appear here.
            </p>
          </div>
        </Card.Content>
      </Card>
    </PageContainer>
  );
}
