"use client";

import { useApiData } from "@/web/hooks/use-api-data";
import { fetchInstallCatalog } from "../services/install-api.service";

export function useInstallCatalog() {
  const { data, loading, error, retry } = useApiData(
    fetchInstallCatalog,
    "We couldn't load install instructions. Try again in a moment.",
  );
  return { catalog: data, loading, error, retry };
}
