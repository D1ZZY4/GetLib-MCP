import { afterEach, describe, expect, test } from "bun:test";
import { resetBootstrapCache } from "@/application/auth/auth.service";
import { resetDatabaseCache } from "../infrastructure/database";
import { initializeApplication, resetInitialization } from "../init";

afterEach(() => {
  resetInitialization();
  resetBootstrapCache();
  resetDatabaseCache();
});

describe("application initialization lifecycle", () => {
  test("initializes idempotently without throwing", async () => {
    await initializeApplication();
    await initializeApplication();
  });
});
