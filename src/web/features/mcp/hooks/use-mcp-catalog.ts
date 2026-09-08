import { useApiData } from "@/web/hooks/use-api-data";
import { fetchCatalog, type McpCatalog } from "../services/mcp.service";

const EMPTY_CATALOG: McpCatalog = { tools: [], resources: [], prompts: [] };

export function useMcpCatalog() {
  const { data, loading, error, retry } = useApiData(
    fetchCatalog,
    "We couldn't load the MCP catalog. Try again in a moment.",
  );
  return { catalog: data ?? EMPTY_CATALOG, loading, error, retry };
}
