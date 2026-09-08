import { describe, expect, test } from "bun:test";
import { detectVersionForEntry, detectVersionFromLockfile } from "../utils/lockfile";

const ENTRY = { id: "facebook/react", npmPackage: "react", pypiPackage: undefined };

describe("detectVersionForEntry", () => {
  test("keeps an explicit version without touching the filesystem", async () => {
    await expect(detectVersionForEntry("/nonexistent", "18.2.0", ENTRY)).resolves.toBe("18.2.0");
  });

  test("returns undefined without projectPath or entry", async () => {
    await expect(detectVersionForEntry(undefined, undefined, ENTRY)).resolves.toBeUndefined();
    await expect(detectVersionForEntry("/tmp", undefined, null)).resolves.toBeUndefined();
  });

  test("blocked paths fail closed to null instead of throwing", async () => {
    await expect(detectVersionFromLockfile("/etc", "react")).resolves.toBeNull();
  });
});
