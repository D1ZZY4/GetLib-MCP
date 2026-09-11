import { describe, expect, test } from "bun:test";
import { deepFetchForTopic, fetchMultiplePages, splitTopics } from "./deep-fetch";
import type { FetchResult } from "../types";

const initial: FetchResult = { content: "plain content", url: "https://example.com", sourceType: "direct" };

describe("deep-fetch cancellation", () => {
  test("aborted signal returns the initial result without fanning out", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await deepFetchForTopic(initial, "hooks", "https://example.com", undefined, 8, false, controller.signal);
    expect(result).toBe(initial);
  });

  test("aborted signal returns no pages", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(fetchMultiplePages(["https://example.com/a"], 4, controller.signal)).resolves.toEqual([]);
  });

  test("empty topic returns the initial result", async () => {
    await expect(deepFetchForTopic(initial, "   ", "https://example.com")).resolves.toBe(initial);
  });
});

describe("splitTopics", () => {
  test("single topic stays whole", () => {
    expect(splitTopics("hooks")).toEqual(["hooks"]);
  });

  test("compound topics split on conjunctions", () => {
    expect(splitTopics("hooks and state")).toEqual(["hooks", "state"]);
  });
});
