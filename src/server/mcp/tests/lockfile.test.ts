import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
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

  test("symlinked lockfiles cannot escape the guarded directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gl-lockfile-link-"));
    const outside = join(tmpdir(), `gl-lockfile-secret-${Date.now()}.json`);
    try {
      // A lockfile symlink pointing outside must resolve to null
      // (blocked), never to content-derived versions.
      writeFileSync(outside, JSON.stringify({ packages: { "node_modules/react": { version: "9.9.9" } } }));
      symlinkSync(outside, join(dir, "package-lock.json"));
      await expect(detectVersionFromLockfile(dir, "react")).resolves.toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(outside, { force: true });
    }
  });
});
