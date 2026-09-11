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

  test("verbatim-duplicate long paragraphs collapse to first occurrence", () => {
    const para = `This paragraph repeats across mirrored nav and footer blocks with enough substance to pass the length floor. ${"x".repeat(60)}`;
    const content = `# Guide\n\n${para}\n\n## Middle\n\nSome unique middle content here.\n\n${para}`;
    const result = extractRelevantContent(content, "guide", 8000);
    const occurrences = result.text.split(para).length - 1;
    expect(occurrences).toBe(1);
    expect(result.text).toContain("Some unique middle content here.");
  });

  test("short fragments never collapse", () => {
    const content = `# Guide\n\nYes.\n\n## More\n\nNo.\n\nYes.`;
    const result = extractRelevantContent(content, "guide", 8000);
    expect(result.text).toContain("Yes.");
  });
});
