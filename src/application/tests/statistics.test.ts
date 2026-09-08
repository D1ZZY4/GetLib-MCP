import { describe, expect, test } from "bun:test";
import { getStatisticsSnapshot } from "../statistics/statistics.service";

describe("statistics application service", () => {
  test("returns usage, days, rows, and fetches with mock flag", () => {
    const snapshot = getStatisticsSnapshot();
    expect(typeof snapshot.usage.requestsUsed).toBe("number");
    expect(Array.isArray(snapshot.days)).toBe(true);
    expect(Array.isArray(snapshot.fetches)).toBe(true);
    expect(typeof snapshot.isMock).toBe("boolean");
  });
});
