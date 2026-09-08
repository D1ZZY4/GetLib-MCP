import { useMemo, useState } from "react";
import {
  mockBlockedLibraries,
  mockFilterSelects,
  mockSourceGroups,
  mockWildcardLibraries,
} from "../services/sources.service";

/**
 * Local mock state for the Source Access page. Persists nothing;
 * wire to /api sources when the backend lands.
 */
export function useSourceAccess() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      mockSourceGroups.flatMap((group) => group.items.map((item) => [item.id, item.enabled])),
    ),
  );
  const [filters, setFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(mockFilterSelects.map((filter) => [filter.id, filter.defaultOptionId])),
  );
  const [blocked, setBlocked] = useState<string[]>(mockBlockedLibraries);
  const [wildcards, setWildcards] = useState<string[]>(mockWildcardLibraries);

  const groups = useMemo(
    () =>
      mockSourceGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          enabled: toggles[item.id] ?? item.enabled,
        })),
      })),
    [toggles],
  );

  const toggleSource = (id: string, enabled: boolean) => {
    setToggles((current) => ({ ...current, [id]: enabled }));
  };

  const setFilter = (id: string, optionId: string) => {
    setFilters((current) => ({ ...current, [id]: optionId }));
  };

  const addEntry = (list: "blocked" | "wildcards", name: string) => {
    const normalized = name.trim();
    if (normalized === "") return;
    if (list === "blocked") {
      setBlocked((current) => (current.includes(normalized) ? current : [...current, normalized]));
    } else {
      setWildcards((current) =>
        current.includes(normalized) ? current : [...current, normalized],
      );
    }
  };

  const removeEntry = (list: "blocked" | "wildcards", name: string) => {
    if (list === "blocked") {
      setBlocked((current) => current.filter((entry) => entry !== name));
    } else {
      setWildcards((current) => current.filter((entry) => entry !== name));
    }
  };

  return { groups, filters, blocked, wildcards, toggleSource, setFilter, addEntry, removeEntry };
}

export type SourceAccess = ReturnType<typeof useSourceAccess>;
