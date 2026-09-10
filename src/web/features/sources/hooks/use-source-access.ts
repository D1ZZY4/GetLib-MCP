import { useEffect, useMemo, useRef, useState } from "react";
import { useApiData } from "@/web/hooks/use-api-data";
import { buildSourcesBody, fetchSources, saveSources } from "../services/sources.service";

const LOAD_ERROR = "We couldn't load sources. Try again in a moment.";

type SaveStatus = "idle" | "saving" | "saved" | "error";

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
  const [notice, setNotice] = useState<string | null>(null);
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
      void saveNow();
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

  /** Flush any pending debounced save immediately. Backs the save-error retry. */
  const saveNow = async (): Promise<void> => {
    if (!seeded.current || !data) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveStatus("saving");
    try {
      await saveSources(buildSourcesBody(data, toggles, blocked, wildcards));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const retrySave = (): void => {
    void saveNow();
  };

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

  const addEntry = (list: "blocked" | "wildcards", name: string): boolean => {
    const normalized = name.trim();
    if (normalized === "") return false;
    const exists = (list === "blocked" ? blocked : wildcards).includes(normalized);
    if (exists) {
      setNotice(`"${normalized}" is already in the list.`);
      return false;
    }
    setNotice(null);
    if (list === "blocked") {
      setBlocked((current) => [...current, normalized]);
    } else {
      setWildcards((current) => [...current, normalized]);
    }
    return true;
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
    retrySave,
    notice,
    totalEntries: data?.totalEntries ?? 0,
    toggleSource,
    addEntry,
    removeEntry,
  };
}
