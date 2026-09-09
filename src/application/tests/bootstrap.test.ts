import { afterEach, describe, expect, test } from "bun:test";
import { ensureBootstrapAccount, resetBootstrapCache } from "../auth/auth.service";
import { getDatabase, resetDatabaseCache } from "@/server/mcp/infrastructure/database";
import { setDatabaseModeOverride } from "@/server/mcp/runtime";
import { resetConfigOverride, setConfigOverride } from "@/server/mcp/config";
import { FALLBACK_ACCOUNT } from "@/domain/auth/policy";

afterEach(() => {
  resetBootstrapCache();
  resetDatabaseCache();
  resetConfigOverride();
});

// Test intent is the mock repository contract, independent of whatever the
// local .env selects. Force development + mock explicitly (environment is
// read live) and clear bootstrap credentials so the fallback identity
// applies regardless of operator GETLIB_DEFAULT_ACCOUNT configuration.
async function withMockMode(fn: () => Promise<void>): Promise<void> {
  const prevMode = process.env.GETLIB_DATABASE_MODE;
  const prevLibMode = process.env.GET_LIB_MODE;
  try {
    delete process.env.GETLIB_DATABASE_MODE;
    process.env.GET_LIB_MODE = "development";
    setDatabaseModeOverride(null);
    setConfigOverride({ defaultAccount: undefined, defaultPass: undefined });
    await fn();
  } finally {
    if (prevMode === undefined) delete process.env.GETLIB_DATABASE_MODE;
    else process.env.GETLIB_DATABASE_MODE = prevMode;
    if (prevLibMode === undefined) delete process.env.GET_LIB_MODE;
    else process.env.GET_LIB_MODE = prevLibMode;
    setDatabaseModeOverride(null);
  }
}

describe("bootstrap lifecycle", () => {
  test("seeds the fallback record idempotently", async () => {
    await withMockMode(async () => {
      const first = await ensureBootstrapAccount();
      const second = await ensureBootstrapAccount();
      expect(first).toEqual(second);
      expect(first.account).toBe(FALLBACK_ACCOUNT);
      expect(first.isFallback).toBe(true);
      expect(first.credentialsChanged).toBe(false);
    });
  });

  test("env rotation overwrites a stale stored row", async () => {
    await withMockMode(async () => {
      const db = getDatabase("mock");
      await db.saveBootstrap({
        account: "old@example.com",
        credentialsChanged: true,
        updatedAt: "2020-01-01T00:00:00.000Z",
      });
      resetBootstrapCache();
      // Config still resolves the fallback identity, so the stale custom row
      // is replaced and the rotation warning clears only for custom env creds.
      const status = await ensureBootstrapAccount();
      expect(status.account).toBe(FALLBACK_ACCOUNT);
      const stored = await getDatabase("mock").getBootstrap();
      expect(stored?.account).toBe(FALLBACK_ACCOUNT);
    });
  });
});
