import { describe, expect, test } from "bun:test";
import {
  LOG_LIMIT_DEFAULT,
  LOG_LIMIT_MAX,
  TOOL_NAME_PATTERN,
  nonBlankString,
  optionalNonBlank,
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

  test("optionalNonBlank normalizes blanks to undefined", () => {
    expect(optionalNonBlank(10).parse("   ")).toBeUndefined();
    expect(optionalNonBlank(10).parse("")).toBeUndefined();
    expect(optionalNonBlank(10).parse(undefined)).toBeUndefined();
    expect(optionalNonBlank(10).parse("react")).toBe("react");
    expect(optionalNonBlank(10).safeParse("   ").success).toBe(true);
  });

  test("parseLogLimitValue returns default, clamps, and rejects invalid", () => {
    expect(parseLogLimitValue(null)).toBe(LOG_LIMIT_DEFAULT);
    expect(parseLogLimitValue("")).toBe(LOG_LIMIT_DEFAULT);
    expect(parseLogLimitValue("10")).toBe(10);
    expect(parseLogLimitValue("9999")).toBe(LOG_LIMIT_MAX);
    expect(() => parseLogLimitValue("0")).toThrow();
    expect(() => parseLogLimitValue("abc")).toThrow();
  });

});
