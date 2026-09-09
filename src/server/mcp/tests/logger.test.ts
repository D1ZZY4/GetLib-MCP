import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { log } from "../utils/logger";

describe("logger redaction", () => {
  const original = console.error;
  let captured: string[];

  beforeEach(() => {
    captured = [];
    console.error = (...args: unknown[]) => {
      captured.push(args.map((part) => String(part)).join(" "));
    };
  });

  afterEach(() => {
    console.error = original;
  });

  test("redacts sensitive fields", () => {
    log({ level: "error", msg: "signin failed", password: "s3cr3t", token: "abc" });
    expect(captured.join("\n")).not.toContain("s3cr3t");
    expect(captured.join("\n")).not.toContain("abc");
    expect(captured.join("\n")).toContain("[redacted]");
  });

  test("scrubs bearer credentials in free text", () => {
    log({ level: "warn", msg: "fetch failed", error: "401 with Bearer deadbeef auth" });
    expect(captured.join("\n")).not.toContain("deadbeef");
    expect(captured.join("\n")).toContain("Bearer [redacted]");
  });
});
