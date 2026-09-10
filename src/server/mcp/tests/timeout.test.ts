import { describe, expect, test } from "bun:test";
import { timeoutResponse } from "../tools/timeout";

describe("timeout fallback factory", () => {
  test("message-only variant carries no structured payload", () => {
    const fallback = timeoutResponse("Timed out. Retry.");
    expect(fallback.content).toHaveLength(1);
    expect(fallback.content[0]?.type).toBe("text");
    expect("structuredContent" in fallback).toBe(false);
  });

  test("structured variant preserves the per-tool payload shape", () => {
    const fallback = timeoutResponse("Timed out. Retry.", { timedOut: true, matches: [] });
    expect(fallback.content[0]?.text).toContain("Timed out");
    expect(fallback.structuredContent).toEqual({ timedOut: true, matches: [] });
  });
});
