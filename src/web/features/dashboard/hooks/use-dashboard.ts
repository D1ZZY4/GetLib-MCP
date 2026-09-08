import { useMockData } from "@/web/lib/mock";
import {
  mockActivities,
  mockAttentions,
  mockLibraries,
  mockStats,
} from "../services/dashboard.service";

/**
 * Loads the dashboard mock payload asynchronously so the page renders
 * skeleton states exactly like it will with real API calls later.
 */
export function useDashboard() {
  return useMockData({
    libraries: mockLibraries,
    activities: mockActivities,
    attentions: mockAttentions,
    stats: mockStats,
  });
}
