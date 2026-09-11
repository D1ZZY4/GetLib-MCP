import { describe, expect, test } from "bun:test";
import { afterWork } from "./after-work";

describe("afterWork", () => {
  test("runs inline outside a request scope", () => {
    let ran = false;
    afterWork(() => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  test("a throwing fallback never escapes", () => {
    expect(() =>
      afterWork(() => {
        throw new Error("boom");
      }),
    ).not.toThrow();
  });
});
