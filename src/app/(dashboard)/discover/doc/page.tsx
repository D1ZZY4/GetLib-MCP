import type { Metadata } from "next";
import { DocDetail } from "@/web/features/discover/components/doc-detail";

export const metadata: Metadata = {
  title: "Document - GetLib MCP",
  description: "Full documentation for one discovered source.",
};

export default async function DocRoute({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; q?: string }>;
}) {
  const { url = "", q = "" } = await searchParams;
  return <DocDetail sourceUrl={url} topic={q} />;
}
