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

  test("scrubs basic credentials and header-style api keys", () => {
    log({ level: "warn", msg: "upstream", error: "denied Basic c2VjcmV0OnBhc3M=" });
    log({ level: "warn", msg: "upstream", error: "invalid x-api-key=supersecret123" });
    const out = captured.join("\n");
    expect(out).not.toContain("c2VjcmV0OnBhc3M=");
    expect(out).not.toContain("supersecret123");
    expect(out).toContain("Basic [redacted]");
  });

  test("scrubs query-string secrets in logged urls", () => {
    log({ level: "warn", msg: "tryFetch.ssrf_blocked", url: "https://api.example.com/data?token=abc123&limit=10" });
    log({ level: "warn", msg: "fetch", url: "https://api.example.com/data?api_key=key456" });
    const out = captured.join("\n");
    expect(out).not.toContain("abc123");
    expect(out).not.toContain("key456");
    expect(out).toContain("token=[redacted]");
    expect(out).toContain("api_key=[redacted]");
  });

  test("redacts session and cookie fields", () => {
    log({ level: "error", msg: "auth", session: "v1.payload.sig", cookie: "getlib_session=x" });
    const out = captured.join("\n");
    expect(out).not.toContain("v1.payload.sig");
    expect(out).not.toContain("getlib_session=x");
  });
});
