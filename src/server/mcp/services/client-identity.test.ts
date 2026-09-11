import { describe, expect, test } from "bun:test";
import { identifyClient, parseClientName, slugifyClientName, uuidv5 } from "./client-identity";

const ID_PATTERN = /^[a-z0-9-]{1,40}=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("client identity", () => {
  test("uuidv5 is deterministic and well-formed", () => {
    const first = uuidv5("apikey:opencode");
    expect(first).toBe(uuidv5("apikey:opencode"));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidv5("apikey:other")).not.toBe(first);
  });

  test("slugify keeps ids route-safe", () => {
    expect(slugifyClientName("OpenCode Editor!")).toBe("opencode-editor");
    expect(slugifyClientName("")).toBe("unknown");
    expect(slugifyClientName("  ")).toBe("unknown");
  });

  test("parses product/version user agents", () => {
    expect(parseClientName("opencode/1.18.30")).toEqual({ name: "opencode", version: "1.18.30" });
    expect(parseClientName(undefined)).toEqual({ name: "unknown" });
    expect(parseClientName("")).toEqual({ name: "unknown" });
  });

  test("same identity resolves to the same stable id", () => {
    const first = identifyClient({ transport: "streamable-http", userAgent: "opencode/1.18.30" });
    const second = identifyClient({ transport: "streamable-http", userAgent: "opencode/1.18.30" });
    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(ID_PATTERN);
    expect(first.name).toBe("opencode");
    expect(first.version).toBe("1.18.30");
    expect(first.authType).toBe("anonymous");
  });

  test("api key identity keys on the key name, not the agent string", () => {
    const first = identifyClient({ transport: "streamable-http", userAgent: "opencode/1.18.30", apiKeyName: "laptop", apiKeyId: 7 });
    const second = identifyClient({ transport: "streamable-http", userAgent: "opencode/9.9.9", apiKeyName: "laptop", apiKeyId: 7 });
    expect(first.id).toBe(second.id);
    expect(first.authType).toBe("api_key");
    expect(first.apiKeyId).toBe(7);
  });

  test("different identities resolve to different ids", () => {
    const a = identifyClient({ transport: "streamable-http", userAgent: "opencode/1.18.30" });
    const b = identifyClient({ transport: "streamable-http", userAgent: "cursor/2.0.0" });
    expect(a.id).not.toBe(b.id);
  });

  test("session identity is stable per email and opaque", () => {
    const first = identifyClient({ transport: "sse", sessionEmail: "Ops@Example.com" });
    const second = identifyClient({ transport: "sse", sessionEmail: "ops@example.com" });
    expect(first.id).toBe(second.id);
    expect(first.id).toMatch(/^session=[0-9a-f-]{36}$/);
    expect(first.authType).toBe("session");
    expect(first.id).not.toContain("ops");
  });
});
