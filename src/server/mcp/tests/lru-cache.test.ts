import { describe, expect, test } from "bun:test";
import { LRUCache } from "../services/lru-cache";

describe("lru cache bounds", () => {
  test("evicts least recently used past the count bound", () => {
    const cache = new LRUCache<string>(2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
  });

  test("evicts least recently used past the byte bound", () => {
    const cache = new LRUCache<string>(100, 4);
    cache.set("a", "12");
    cache.set("b", "34");
    expect(cache.size()).toBe(2);
    cache.set("c", "56");
    expect(cache.size()).toBeLessThanOrEqual(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("c")).toBe("56");
  });

  test("overwrite and expiry do not leak byte accounting", () => {
    const cache = new LRUCache<string>(100, 4);
    cache.set("a", "12");
    cache.set("a", "1");
    cache.set("b", "23");
    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBe("23");
    cache.clear();
    expect(cache.size()).toBe(0);
    cache.set("c", "1234");
    expect(cache.get("c")).toBe("1234");
  });
});
