import { describe, expect, test } from "bun:test";
import {
  getPersistenceWriteHealth,
  recordPersistenceFailure,
  resetPersistenceWriteHealth,
} from "./persistence-health";

describe("persistence write health", () => {
  test("starts clean and records failures with context", () => {
    resetPersistenceWriteHealth();
    expect(getPersistenceWriteHealth()).toEqual({
      failedWrites: 0,
      lastSink: null,
      lastErrorAt: null,
      lastError: null,
    });
    recordPersistenceFailure("mcp_clients", new Error('relation "public.mcp_clients" does not exist'));
    const snapshot = getPersistenceWriteHealth();
    expect(snapshot.failedWrites).toBe(1);
    expect(snapshot.lastSink).toBe("mcp_clients");
    expect(snapshot.lastErrorAt).not.toBeNull();
    expect(snapshot.lastError).toContain("mcp_clients");
    recordPersistenceFailure("mcp_logs", "timeout");
    expect(getPersistenceWriteHealth().failedWrites).toBe(2);
    expect(getPersistenceWriteHealth().lastSink).toBe("mcp_logs");
    resetPersistenceWriteHealth();
    expect(getPersistenceWriteHealth().failedWrites).toBe(0);
  });

  test("caps error length and never throws", () => {
    resetPersistenceWriteHealth();
    recordPersistenceFailure("mcp_logs", "x".repeat(1000));
    expect(getPersistenceWriteHealth().lastError).toHaveLength(300);
    resetPersistenceWriteHealth();
  });
});
