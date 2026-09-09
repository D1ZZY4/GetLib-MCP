import { describe, expect, test } from "bun:test";
import { extractRelevantContent } from "../utils/extract";
import { CHARS_PER_TOKEN } from "../constants";

describe("extract token budgets", () => {
  test("large budgets return big content untruncated", () => {
    // 100k+ token support: the extractor must honor large caller budgets
    // instead of imposing its own ceiling. 150000 tokens at the estimator
    // ratio must pass ~570KB through untouched.
    const content = `# Doc\n${"lorem ipsum dolor sit amet ".repeat(20000)}`;
    const result = extractRelevantContent(content, "lorem", 150000);
    expect(result.truncated).toBe(false);
    expect(result.text.length).toBe(content.length);
  });

  test("small budgets still truncate with an explicit flag", () => {
    const content = `# Doc\n${"lorem ipsum dolor sit amet ".repeat(20000)}`;
    const result = extractRelevantContent(content, "lorem", 8000);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(Math.floor(8000 * CHARS_PER_TOKEN));
  });
});
