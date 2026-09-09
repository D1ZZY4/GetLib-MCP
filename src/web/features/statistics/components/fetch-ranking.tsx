import { Card } from "@heroui/react";
import { RankingBarList } from "@/web/components/ui/ranking-bar-list";
import { rankLibraryFetches } from "@/web/lib/ranking";
import type { LibraryFetch } from "@/web/lib/ranking";

export function FetchRanking({ fetches }: { fetches: LibraryFetch[] }) {
  const ranked = rankLibraryFetches(fetches);

  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>Most fetched</Card.Title>
        <Card.Description>Doc fetch ranking per library</Card.Description>
      </Card.Header>
      <Card.Content>
        <RankingBarList entries={ranked} label="Most fetched libraries" />
      </Card.Content>
    </Card>
  );
}
