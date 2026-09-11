import { describe, expect, test } from "bun:test";
import { fetchSemaphore } from "../services/http/semaphore";

describe("fetch semaphore", () => {
  test("acquire times out instead of queuing forever", async () => {
    const acquired: number[] = [];
    // Fill the global budget; extra waiters must time out with false
    // instead of hanging queued behind slow-drip bodies.
    for (let i = 0; i < 24; i++) {
      if (await fetchSemaphore.acquire(10)) acquired.push(i);
      else break;
    }
    expect(acquired.length).toBeGreaterThan(0);
    const timedOut = await fetchSemaphore.acquire(10);
    expect(timedOut).toBe(false);
    for (const _ of acquired) fetchSemaphore.release();
    expect(await fetchSemaphore.acquire(10)).toBe(true);
    fetchSemaphore.release();
  });
});
