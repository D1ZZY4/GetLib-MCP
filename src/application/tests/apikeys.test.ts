import { describe, expect, test } from "bun:test";
import {
  ApiKeyValidationError,
  createApiKey,
  deleteApiKey,
  listApiKeys,
  verifyApiKey,
  type ApiKeyDeps,
} from "../apikeys/apikeys.service";
import { MockDatabaseRepository } from "@/server/mcp/infrastructure/database/mock-repository";

function stubDeps(): { deps: ApiKeyDeps; repo: MockDatabaseRepository } {
  const repo = new MockDatabaseRepository();
  return {
    repo,
    deps: {
      getDatabase: () => repo,
    },
  };
}

describe("api key service with stubbed infrastructure", () => {
  test("creates a prefixed key and lists it without the secret", async () => {
    const { deps } = stubDeps();
    const created = await createApiKey(deps, "ci");
    expect(created.key.startsWith("glk_")).toBe(true);
    expect(created.prefix).toBe(created.key.slice(0, 12));
    expect(created.name).toBe("ci");
    const listed = await listApiKeys(deps);
    expect(listed).toHaveLength(1);
    expect(listed[0]).not.toHaveProperty("key");
    expect(listed[0]).not.toHaveProperty("keyHash");
    expect(listed[0]).not.toHaveProperty("revoked");
  });

  test("verifies the plaintext key and rejects anything else", async () => {
    const { deps } = stubDeps();
    const created = await createApiKey(deps, "ci");
    expect(await verifyApiKey(deps, created.key)).toEqual({ id: created.id, name: "ci" });
    expect(await verifyApiKey(deps, "glk_wrong")).toBeNull();
    expect(await verifyApiKey(deps, "v1.not-an-api-key.sig")).toBeNull();
    expect(await verifyApiKey(deps, "")).toBeNull();
  });

  test("deleted keys stop verifying and disappear from the list", async () => {
    const { deps } = stubDeps();
    const created = await createApiKey(deps, "ci");
    expect(await deleteApiKey(deps, created.id)).toBe(true);
    expect(await verifyApiKey(deps, created.key)).toBeNull();
    expect(await deleteApiKey(deps, created.id)).toBe(false);
    expect(await deleteApiKey(deps, 999)).toBe(false);
    expect(await listApiKeys(deps)).toHaveLength(0);
  });

  test("rejects blank and oversized names and ids", async () => {
    const { deps } = stubDeps();
    await expect(createApiKey(deps, "   ")).rejects.toThrow(ApiKeyValidationError);
    await expect(createApiKey(deps, "x".repeat(101))).rejects.toThrow(ApiKeyValidationError);
    await expect(deleteApiKey(deps, 0)).rejects.toThrow(ApiKeyValidationError);
    await expect(deleteApiKey(deps, 1.5)).rejects.toThrow(ApiKeyValidationError);
  });

  test("stored rows hold hashes, never plaintext", async () => {
    const { repo, deps } = stubDeps();
    const created = await createApiKey(deps, "ci");
    const rows = await repo.listApiKeys();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.keyHash).not.toContain(created.key);
    expect(rows[0]?.keyHash).toHaveLength(64);
  });
});
