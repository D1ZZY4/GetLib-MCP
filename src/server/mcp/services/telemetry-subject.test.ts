import { describe, expect, test } from "bun:test";
import {
  endCallSuccess,
  normalizeToolSubject,
  noteToolSubject,
  startCall,
  subjectFromToolArgs,
} from "./telemetry";
import { getRecentOutcomes, resetTelemetry } from "./telemetry-outcomes";

describe("tool subject normalization", () => {
  test("canonicalizes known names and aliases to registry ids", () => {
    expect(normalizeToolSubject("React")).toBe("facebook/react");
    expect(normalizeToolSubject("tailwindcss")).toBe("tailwindlabs/tailwindcss");
    expect(normalizeToolSubject("  vercel/next.js  ")).toBe("vercel/next.js");
  });

  test("keeps unknown references as lowercase labels", () => {
    expect(normalizeToolSubject("Some Random Lib")).toBe("some random lib");
    expect(normalizeToolSubject("npm:left-pad")).toBe("npm:left-pad");
  });

  test("rejects non-strings, blanks, and caps length", () => {
    expect(normalizeToolSubject("")).toBeNull();
    expect(normalizeToolSubject("   ")).toBeNull();
    expect(normalizeToolSubject(42)).toBeNull();
    expect(normalizeToolSubject(null)).toBeNull();
    expect(normalizeToolSubject(undefined)).toBeNull();
    expect(normalizeToolSubject("x".repeat(200))).toHaveLength(120);
  });

  test("takes the primary entry from compare-style lists", () => {
    expect(normalizeToolSubject(["react", "vue"])).toBe("facebook/react");
    expect(normalizeToolSubject([])).toBeNull();
    expect(normalizeToolSubject([42])).toBeNull();
  });
});

describe("subjectFromToolArgs", () => {
  test("reads every library arg shape adapters carry", () => {
    expect(subjectFromToolArgs({ libraryId: "zod" })).toBe("colinhacks/zod");
    expect(subjectFromToolArgs({ library: "Zod" })).toBe("colinhacks/zod");
    expect(subjectFromToolArgs({ libraryName: "fastapi" })).toBe("tiangolo/fastapi");
    expect(subjectFromToolArgs({ libraries: ["react", "vue"] })).toBe("facebook/react");
  });

  test("returns null without a usable library arg", () => {
    expect(subjectFromToolArgs({})).toBeNull();
    expect(subjectFromToolArgs({ libraryId: "" })).toBeNull();
    expect(subjectFromToolArgs({ query: "hooks" })).toBeNull();
    expect(subjectFromToolArgs("gl_search")).toBeNull();
    expect(subjectFromToolArgs(null)).toBeNull();
    expect(subjectFromToolArgs(undefined)).toBeNull();
  });
});

describe("noteToolSubject", () => {
  test("lands on the finished outcome", () => {
    resetTelemetry();
    try {
      const ctx = startCall("gl_get_docs");
      noteToolSubject(ctx, "react");
      endCallSuccess(ctx);
      const outcomes = getRecentOutcomes();
      expect(outcomes[outcomes.length - 1]?.subject).toBe("facebook/react");
    } finally {
      resetTelemetry();
    }
  });

  test("leaves the context alone when nothing usable is given", () => {
    resetTelemetry();
    try {
      const ctx = startCall("gl_search");
      noteToolSubject(ctx, "");
      expect(ctx.subject).toBeUndefined();
      endCallSuccess(ctx);
      const outcomes = getRecentOutcomes();
      expect(outcomes[outcomes.length - 1]?.subject).toBeUndefined();
    } finally {
      resetTelemetry();
    }
  });
});
