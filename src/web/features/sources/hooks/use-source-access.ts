import { useEffect, useMemo, useRef, useState } from "react";
import { useApiData } from "@/web/hooks/use-api-data";
import { fetchSources, saveSources, type SourcesSnapshot } from "../services/sources.service";

const LOAD_ERROR = "We couldn't load sources. Try again in a moment.";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function snapshotToBody(snapshot: SourcesSnapshot, toggles: Record<string, boolean>) {
  return {
    disabled: snapshot.groups
      .flatMap((group) => group.items)
      .filter((source) => !(toggles[source.id] ?? source.enabled))
      .map((source) => source.id),
  };
}

/**
 * Sources settings state. Groups, entry counts, and the stored blocked /
 * wildcard lists load live from the server snapshot; every toggle or list
 * edit is saved back with PUT /api/management/sources so the settings
 * take real effect in the MCP server process.
 */
export function useSourceAccess() {
  const { data, loading, error, retry } = useApiData(fetchSources, LOAD_ERROR);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [blocked, setBlocked] = useState<string[]>([]);
  const [wildcards, setWildcards] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const seeded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed editable state from the server snapshot once it arrives.
  useEffect(() => {
    if (data && !seeded.current) {
      seeded.current = true;
      setBlocked(data.blocked);
      setWildcards(data.wildcards);
    }
  }, [data]);

  // Persist every settings change (debounced). The full state is sent so
  // concurrent edits cannot silently drop each other.
  useEffect(() => {
    if (!seeded.current || !data) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus("saving");
      saveSources({
        ...snapshotToBody(data, toggles),
        blocked,
        wildcards,
      })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, toggles, blocked, wildcards]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const groups = useMemo(
    () =>
      (data?.groups ?? []).map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          enabled: toggles[item.id] ?? item.enabled,
        })),
      })),
    [data, toggles],
  );

  const toggleSource = (id: string, enabled: boolean) => {
    setToggles((current) => ({ ...current, [id]: enabled }));
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

  return {
    groups,
    blocked,
    wildcards,
    loading,
    error,
    retry,
    saveStatus,
    totalEntries: data?.totalEntries ?? 0,
    toggleSource,
    addEntry,
    removeEntry,
  };
}
