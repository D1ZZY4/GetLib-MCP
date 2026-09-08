import { useEffect, useState } from "react";
import { fetchCatalog, type McpCatalog } from "../services/mcp.service";

const EMPTY_CATALOG: McpCatalog = { tools: [], resources: [], prompts: [] };

export function useMcpCatalog() {
  const [catalog, setCatalog] = useState<McpCatalog>(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load the MCP catalog. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, loading, error };
}
