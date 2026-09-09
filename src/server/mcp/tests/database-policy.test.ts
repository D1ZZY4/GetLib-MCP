import { afterEach, describe, expect, test } from "bun:test";
import { getDatabase, resetDatabaseCache } from "../infrastructure/database";

const KEY = "GET_LIB_MODE";

afterEach(() => {
  resetDatabaseCache();
  delete process.env[KEY];
});

describe("database production guard", () => {
  test("production never resolves the mock repository", () => {
    process.env[KEY] = "production";
    try {
      expect(() => getDatabase("mock")).toThrow("mock mode is not allowed");
    } finally {
      delete process.env[KEY];
    }
  });

  test("development resolves mock explicitly", () => {
    process.env[KEY] = "development";
    try {
      expect(getDatabase("mock").mode).toBe("mock");
    } finally {
      delete process.env[KEY];
    }
  });
});
