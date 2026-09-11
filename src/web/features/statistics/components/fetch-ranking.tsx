import { Card } from "@heroui/react";
import { RankingBarList } from "@/web/components/ui/ranking-bar-list";
import { rankLibraryFetches } from "@/web/lib/ranking";
import type { LibraryFetch } from "@/web/lib/ranking";

export function FetchRanking({ fetches }: { fetches: LibraryFetch[] }) {
  const ranked = rankLibraryFetches(fetches);

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Most called tools</Card.Title>
        <Card.Description>Tool calls in the recent window</Card.Description>
      </Card.Header>
      <Card.Content>
        <RankingBarList entries={ranked} label="Most called tools" />
      </Card.Content>
    </Card>
  );
}
