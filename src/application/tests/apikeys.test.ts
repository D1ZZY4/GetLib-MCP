import { describe, expect, test } from "bun:test";
import {
  ApiKeyValidationError,
  createApiKey,
  deleteApiKey,
  generateKeyName,
  listApiKeys,
  regenerateApiKey,
  renameApiKey,
  updateApiKeyExpiry,
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

  test("rejects oversized names and ids", async () => {
    const { deps } = stubDeps();
    await expect(createApiKey(deps, "x".repeat(101))).rejects.toThrow(ApiKeyValidationError);
    await expect(deleteApiKey(deps, 0)).rejects.toThrow(ApiKeyValidationError);
    await expect(deleteApiKey(deps, 1.5)).rejects.toThrow(ApiKeyValidationError);
  });

  test("blank names are platform-generated, never blank", async () => {
    const { deps } = stubDeps();
    expect(generateKeyName()).toMatch(/^key-[0-9a-f]{6}$/);
    const nameless = await createApiKey(deps);
    expect(nameless.name).toMatch(/^key-[0-9a-f]{6}$/);
    const blank = await createApiKey(deps, "   ");
    expect(blank.name).toMatch(/^key-[0-9a-f]{6}$/);
    expect(nameless.name).not.toBe(blank.name);
  });

  test("rename updates the name and regenerates on blank", async () => {
    const { deps } = stubDeps();
    const created = await createApiKey(deps, "ci");
    expect(await renameApiKey(deps, created.id, "laptop")).toBe(true);
    expect(await verifyApiKey(deps, created.key)).toEqual({ id: created.id, name: "laptop" });
    expect(await renameApiKey(deps, created.id)).toBe(true);
    const renamed = await verifyApiKey(deps, created.key);
    expect(renamed?.name).toMatch(/^key-[0-9a-f]{6}$/);
    expect(await renameApiKey(deps, 999, "ghost")).toBe(false);
    await expect(renameApiKey(deps, 0, "x")).rejects.toThrow(ApiKeyValidationError);
    await expect(renameApiKey(deps, created.id, "x".repeat(101))).rejects.toThrow(
      ApiKeyValidationError,
    );
  });

  test("regenerate revokes the old secret and issues a new one", async () => {
    const { deps } = stubDeps();
    const created = await createApiKey(deps, "ci");
    const rotated = await regenerateApiKey(deps, created.id);
    expect(rotated).not.toBeNull();
    expect(rotated?.key.startsWith("glk_")).toBe(true);
    expect(rotated?.key).not.toBe(created.key);
    expect(rotated?.name).toBe("ci");
    expect(await verifyApiKey(deps, created.key)).toBeNull();
    expect(await verifyApiKey(deps, rotated?.key ?? "")).toEqual({
      id: created.id,
      name: "ci",
    });
    expect(await regenerateApiKey(deps, 999)).toBeNull();
    await expect(regenerateApiKey(deps, 0)).rejects.toThrow(ApiKeyValidationError);
  });

  test("expired keys fail verification like unknown ones", async () => {
    const { deps } = stubDeps();
    const future = new Date(Date.now() + 60_000).toISOString();
    const created = await createApiKey(deps, "ci", future);
    expect(created.expiresAt).not.toBeNull();
    expect(await verifyApiKey(deps, created.key)).not.toBeNull();
    await expect(createApiKey(deps, "ci", "not-a-date")).rejects.toThrow(ApiKeyValidationError);
    await expect(createApiKey(deps, "ci", new Date(Date.now() - 1000).toISOString())).rejects.toThrow(
      ApiKeyValidationError,
    );
  });

  test("rows past expiry stop verifying", async () => {
    const { createHash } = await import("crypto");
    const { deps, repo } = stubDeps();
    const past = new Date(Date.now() - 1000).toISOString();
    const future = new Date(Date.now() + 3_600_000).toISOString();
    for (const [suffix, expiresAt, verifies] of [
      ["past", past, false],
      ["future", future, true],
    ] as const) {
      const key = `glk_test${suffix}${"a".repeat(30)}`;
      const keyHash = createHash("sha256").update(key).digest("hex");
      await repo.saveApiKey({ name: suffix, keyHash, keyPrefix: key.slice(0, 12), expiresAt });
      const verified = await verifyApiKey(deps, key);
      expect(verifies ? verified !== null : verified === null).toBe(true);
    }
  });

  test("expiry persists on the row and lists through", async () => {
    const { deps, repo } = stubDeps();
    const future = new Date(Date.now() + 3_600_000).toISOString();
    await createApiKey(deps, "ci", future);
    const rows = await repo.listApiKeys();
    expect(rows[0]?.expiresAt).toBe(new Date(future).toISOString());
    const listed = await listApiKeys(deps);
    expect(listed[0]?.expiresAt).toBe(new Date(future).toISOString());
    const plain = await createApiKey(deps, "plain");
    expect(plain.expiresAt).toBeNull();
  });

  test("expiry updates and clears through the service", async () => {
    const { deps } = stubDeps();
    const created = await createApiKey(deps, "ci");
    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect(await updateApiKeyExpiry(deps, created.id, future)).toBe(true);
    const listed = await listApiKeys(deps);
    expect(listed[0]?.expiresAt).toBe(new Date(future).toISOString());
    expect(await updateApiKeyExpiry(deps, created.id, null)).toBe(true);
    expect((await listApiKeys(deps))[0]?.expiresAt).toBeNull();
    expect(await updateApiKeyExpiry(deps, 999, future)).toBe(false);
    await expect(updateApiKeyExpiry(deps, created.id, "yesterday")).rejects.toThrow(
      ApiKeyValidationError,
    );
    await expect(updateApiKeyExpiry(deps, 0, future)).rejects.toThrow(ApiKeyValidationError);
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
