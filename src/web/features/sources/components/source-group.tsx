"use client";

import { Card, Description, Switch } from "@heroui/react";
import type { SourceGroup } from "../services/sources.service";

interface SourceGroupCardProps {
  group: SourceGroup;
  onToggle: (id: string, enabled: boolean) => void;
}

export function SourceGroupCard({ group, onToggle }: SourceGroupCardProps) {
  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>{group.title}</Card.Title>
        <Card.Description>{group.description}</Card.Description>
      </Card.Header>
      <Card.Content>
        <ul className="divide-y divide-border" aria-label={`${group.title} sources`}>
          {group.items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <Switch isSelected={item.enabled} onChange={(enabled) => onToggle(item.id, enabled)}>
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  {item.name}
                  <span className="ml-2 text-xs text-muted tabular-nums">{item.entries}</span>
                </Switch.Content>
                <Description>{item.description}</Description>
              </Switch>
            </li>
          ))}
        </ul>
      </Card.Content>
    </Card>
  );
}
