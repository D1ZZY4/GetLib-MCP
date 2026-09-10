import { describe, expect, test } from "bun:test";
import {
  externalSchemas,
  normalizeEmDash,
  parseExternal,
  parseJsonExternal,
  safeJsonParse,
} from "./validate-external";

describe("validate-external", () => {
  test("safeJsonParse returns unknown for valid JSON and null for malformed", () => {
    expect(safeJsonParse(`{"a":1}`)).toEqual({ a: 1 });
    expect(safeJsonParse(`not json`)).toBeNull();
  });

  test("parseExternal validates npm package shape", () => {
    const ok = parseExternal(externalSchemas.npmPackage, { name: "react", description: "ui" });
    expect(ok?.name).toBe("react");
    expect(parseExternal(externalSchemas.npmPackage, { description: "missing name" })).toBeNull();
    expect(parseExternal(externalSchemas.npmPackage, null)).toBeNull();
  });

  test("parseExternal validates pypi package shape", () => {
    const ok = parseExternal(externalSchemas.pypiPackage, { info: { name: "requests" } });
    expect(ok?.info.name).toBe("requests");
    expect(parseExternal(externalSchemas.pypiPackage, { info: null })).toBeNull();
  });

  test("parseJsonExternal rejects malformed JSON and wrong shape", () => {
    expect(parseJsonExternal(externalSchemas.versionCheck, `{"version":"1.2.3"}`)?.version).toBe("1.2.3");
    expect(parseJsonExternal(externalSchemas.versionCheck, `not json`)).toBeNull();
    expect(parseJsonExternal(externalSchemas.npmSearch, `{"objects":"nope"}`)).toBeNull();
  });

  test("github releases schema accepts valid window and rejects garbage", () => {
    const ok = parseExternal(externalSchemas.githubReleases, [
      { tag_name: "v1.0.0", prerelease: false },
    ]);
    expect(ok?.length).toBe(1);
    expect(parseExternal(externalSchemas.githubReleases, { not: "array" })).toBeNull();
  });

  test("normalizeEmDash folds em dash code point to hyphen", () => {
    const emDash = String.fromCharCode(0x2014);
    expect(normalizeEmDash(`a${emDash}b`)).toBe("a-b");
    expect(normalizeEmDash("no dash")).toBe("no dash");
  });
});
