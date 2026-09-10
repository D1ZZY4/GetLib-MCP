import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { log, setLogStreamMode } from "../utils/logger";

describe("logger redaction", () => {
  const originalError = console.error;
  const originalLog = console.log;
  let capturedError: string[];
  let capturedLog: string[];

  beforeEach(() => {
    capturedError = [];
    capturedLog = [];
    console.error = (...args: unknown[]) => {
      capturedError.push(args.map((part) => String(part)).join(" "));
    };
    console.log = (...args: unknown[]) => {
      capturedLog.push(args.map((part) => String(part)).join(" "));
    };
    setLogStreamMode("stderr");
  });

  afterEach(() => {
    console.error = originalError;
    console.log = originalLog;
    setLogStreamMode("stderr");
  });

  test("redacts sensitive fields", () => {
    log({ level: "error", msg: "signin failed", password: "s3cr3t", token: "abc" });
    expect(capturedError.join("\n")).not.toContain("s3cr3t");
    expect(capturedError.join("\n")).not.toContain("abc");
    expect(capturedError.join("\n")).toContain("[redacted]");
  });

  test("scrubs bearer credentials in free text", () => {
    log({ level: "warn", msg: "fetch failed", error: "401 with Bearer deadbeef auth" });
    expect(capturedError.join("\n")).not.toContain("deadbeef");
    expect(capturedError.join("\n")).toContain("Bearer [redacted]");
  });

  test("scrubs basic credentials and header-style api keys", () => {
    log({ level: "warn", msg: "upstream", error: "denied Basic c2VjcmV0OnBhc3M=" });
    log({ level: "warn", msg: "upstream", error: "invalid x-api-key=supersecret123" });
    const out = capturedError.join("\n");
    expect(out).not.toContain("c2VjcmV0OnBhc3M=");
    expect(out).not.toContain("supersecret123");
    expect(out).toContain("Basic [redacted]");
  });

  test("scrubs query-string secrets in logged urls", () => {
    log({ level: "warn", msg: "tryFetch.ssrf_blocked", url: "https://api.example.com/data?token=abc123&limit=10" });
    log({ level: "warn", msg: "fetch", url: "https://api.example.com/data?api_key=key456" });
    const out = capturedError.join("\n");
    expect(out).not.toContain("abc123");
    expect(out).not.toContain("key456");
    expect(out).toContain("token=[redacted]");
    expect(out).toContain("api_key=[redacted]");
  });

  test("redacts session and cookie fields", () => {
    log({ level: "error", msg: "auth", session: "v1.payload.sig", cookie: "getlib_session=x" });
    const out = capturedError.join("\n");
    expect(out).not.toContain("v1.payload.sig");
    expect(out).not.toContain("getlib_session=x");
  });

  test("scrubs API keys and PII-ish fields", () => {
    log({ level: "warn", msg: "mcp", error: "denied glk_abcDEF123_-" });
    log({ level: "error", msg: "auth", email: "ops@example.com", key_hash: "deadbeef" });
    const out = capturedError.join("\n");
    expect(out).not.toContain("glk_abcDEF123_-");
    expect(out).toContain("glk_[redacted]");
    expect(out).not.toContain("ops@example.com");
    expect(out).not.toContain("deadbeef");
  });

  test("redacts nested objects and camelCase keys without touching class instances", () => {
    const nested = { details: { accessToken: "nested-secret", ok: true } };
    log({ level: "error", msg: "upstream", context: nested });
    const out = capturedError.join("\n");
    expect(out).not.toContain("nested-secret");
    expect(out).toContain("[redacted]");
    // Class instances keep their existing rendering (callers stringify
    // errors explicitly); traversal must not crash on them.
    expect(() =>
      log({ level: "error", msg: "failed", cause: new Error("boom-info") }),
    ).not.toThrow();
  });
});

describe("logger stream routing", () => {
  const originalError = console.error;
  const originalLog = console.log;
  let capturedError: string[];
  let capturedLog: string[];

  beforeEach(() => {
    capturedError = [];
    capturedLog = [];
    console.error = (...args: unknown[]) => {
      capturedError.push(args.map((part) => String(part)).join(" "));
    };
    console.log = (...args: unknown[]) => {
      capturedLog.push(args.map((part) => String(part)).join(" "));
    };
  });

  afterEach(() => {
    console.error = originalError;
    console.log = originalLog;
    setLogStreamMode("stderr");
  });

  test("stderr mode keeps every level on stderr for stdio safety", () => {
    setLogStreamMode("stderr");
    log({ level: "info", msg: "hello" });
    log({ level: "error", msg: "boom" });
    expect(capturedError.join("\n")).toContain("hello");
    expect(capturedError.join("\n")).toContain("boom");
    expect(capturedLog.join("\n")).toBe("");
  });

  test("split mode sends info to stdout and errors to stderr", () => {
    setLogStreamMode("split");
    log({ level: "info", msg: "hello" });
    log({ level: "error", msg: "boom" });
    expect(capturedLog.join("\n")).toContain("hello");
    expect(capturedLog.join("\n")).not.toContain("boom");
    expect(capturedError.join("\n")).toContain("boom");
    expect(capturedError.join("\n")).not.toContain("hello");
  });
});
