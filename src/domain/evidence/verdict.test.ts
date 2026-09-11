import { describe, expect, test } from "bun:test";
import { summarizeEvidence, verdictForTopic } from "./verdict";

describe("evidence verdict domain contract", () => {
  test("empty topic is untargeted", () => {
    expect(verdictForTopic({ ok: true, matchRatio: 1, occurrences: 5, matchedTokens: ["a"], missingTokens: [] }, "")).toBe("untargeted");
  });

  test("ok maps to strong", () => {
    expect(verdictForTopic({ ok: true, matchRatio: 0.1, occurrences: 1, matchedTokens: ["a"], missingTokens: [] }, "migration")).toBe("strong");
  });

  test("partial match maps to weak", () => {
    expect(verdictForTopic({ ok: false, matchRatio: 0.4, occurrences: 2, matchedTokens: ["a"], missingTokens: ["b"] }, "migration")).toBe("weak");
  });

  test("zero match maps to miss", () => {
    expect(verdictForTopic({ ok: false, matchRatio: 0, occurrences: 0, matchedTokens: [], missingTokens: ["a"] }, "migration")).toBe("miss");
  });

  test("summarizeEvidence keeps shared shape", () => {
    const summary = summarizeEvidence({ ok: false, matchRatio: 0.5, occurrences: 3, matchedTokens: ["a"], missingTokens: ["b"] }, "docs", false);
    expect(summary.verdict).toBe("weak");
    expect(summary.escalated).toBe(false);
    expect(summary.occurrences).toBe(3);
  });
});
