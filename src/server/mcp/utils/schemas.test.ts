import { describe, expect, test } from "bun:test";
import {
  LOG_LIMIT_DEFAULT,
  LOG_LIMIT_MAX,
  TOOL_NAME_PATTERN,
  clampLogLimit,
  nonBlankString,
  parseLogLimitValue,
  toolNameSchema,
} from "./schemas";

describe("shared schemas", () => {
  test("nonBlankString rejects whitespace-only input", () => {
    expect(nonBlankString(10).safeParse("   ").success).toBe(false);
    expect(nonBlankString(10).safeParse("react").success).toBe(true);
  });

  test("toolNameSchema matches catalog contract", () => {
    expect(TOOL_NAME_PATTERN.test("gl_search")).toBe(true);
    expect(toolNameSchema().safeParse("gl_search").success).toBe(true);
    expect(toolNameSchema().safeParse("Bad-Name").success).toBe(false);
    expect(toolNameSchema().safeParse("").success).toBe(false);
  });

  test("parseLogLimitValue returns default, clamps, and rejects invalid", () => {
    expect(parseLogLimitValue(null)).toBe(LOG_LIMIT_DEFAULT);
    expect(parseLogLimitValue("")).toBe(LOG_LIMIT_DEFAULT);
    expect(parseLogLimitValue("10")).toBe(10);
    expect(parseLogLimitValue("9999")).toBe(LOG_LIMIT_MAX);
    expect(() => parseLogLimitValue("0")).toThrow();
    expect(() => parseLogLimitValue("abc")).toThrow();
  });

  test("clampLogLimit never throws and stays in range", () => {
    expect(clampLogLimit(10)).toBe(10);
    expect(clampLogLimit(9999)).toBe(LOG_LIMIT_MAX);
    expect(clampLogLimit(0)).toBe(LOG_LIMIT_DEFAULT);
    expect(clampLogLimit(Number.NaN)).toBe(LOG_LIMIT_DEFAULT);
  });
});
