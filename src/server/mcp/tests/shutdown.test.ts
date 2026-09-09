import { afterEach, describe, expect, test } from "bun:test";
import { resetShutdown, shutdownApplication } from "../shutdown";
import { listSessions } from "../transport/http";
import { listSseSessions } from "../transport/sse";

afterEach(() => {
  resetShutdown();
});

describe("application shutdown lifecycle", () => {
  test("drains cleanly with no live sessions", async () => {
    await shutdownApplication();
    expect(listSessions()).toEqual([]);
    expect(listSseSessions()).toEqual([]);
  });

  test("is idempotent - only the first call runs cleanup", async () => {
    await shutdownApplication();
    await shutdownApplication();
    expect(listSessions()).toEqual([]);
  });

  test("reset re-arms shutdown for repeatable lifecycle tests", async () => {
    await shutdownApplication();
    resetShutdown();
    await shutdownApplication();
    expect(listSseSessions()).toEqual([]);
  });
});
