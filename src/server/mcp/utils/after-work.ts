import { after } from "next/server";

/**
 * Serverless-safe background observation. A bare floating promise may
 * never run: hosts freeze the process once the response is sent, and the
 * orphaned timer then fails with a timeout that looks exactly like a
 * database outage. after() extends the invocation lifetime for the
 * work; outside a request scope (tests, CLI, stdio) it falls back to a
 * plain call. The work itself must still never throw.
 */
export function afterWork(work: () => void): void {
  const guarded = () => {
    try {
      work();
    } catch {
      // Observation must never break the request it observes, in any runtime.
    }
  };
  try {
    after(guarded);
  } catch {
    guarded();
  }
}
