import { describe, expect, test } from "bun:test";
import { rankDocUrls, scoreDocUrl } from "./url-rank";

describe("rankDocUrls", () => {
  test("orders best-first identically to scoreDocUrl", () => {
    const urls = [
      "https://example.com/blog/some-post",
      "https://developer.mozilla.org/en-US/docs/Web/API/fetch",
      "https://www.youtube.com/watch?v=abc",
    ];
    const ranked = rankDocUrls(urls, "fetch API");
    const byScore = [...urls].sort((a, b) => scoreDocUrl(b, "fetch API") - scoreDocUrl(a, "fetch API"));
    expect(ranked).toEqual(byScore);
    expect(ranked[0]).toBe("https://developer.mozilla.org/en-US/docs/Web/API/fetch");
  });

  test("empty input stays empty", () => {
    expect(rankDocUrls([], "hooks")).toEqual([]);
  });
});
