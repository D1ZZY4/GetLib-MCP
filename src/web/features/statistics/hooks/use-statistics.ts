import { useMockData } from "@/web/lib/mock";
import {
  getLibraryStatRows,
  getUsageStats,
  mockLast10Days,
  mockLibraryFetches,
} from "../services/statistics.service";

/**
 * Loads the statistics mock payload asynchronously so the page renders
 * skeleton states exactly like it will with real API calls later.
 */
export function useStatistics() {
  return useMockData({
    usage: getUsageStats(),
    days: mockLast10Days,
    rows: getLibraryStatRows(),
    fetches: mockLibraryFetches,
  });
}
