import { describe, expect, test } from "bun:test";
import { appendLog, listLogs } from "@/server/mcp/middleware/logging";
import { mapStoredLogToActivity } from "../dashboard/dashboard.service";
import { mapStoredLogToView } from "../mcp/mcp-catalog.service";

describe("durable log mapping", () => {
  test("stored row maps to the dashboard log view", () => {
    const view = mapStoredLogToView({
      id: 179,
      timestamp: "2026-09-09T06:41:55.419148+00:00",
      requestId: "abc123",
      kind: "tool",
      name: "gl_search",
      durationMs: 42,
      ok: true,
    });
    expect(view).toEqual({
      id: 179,
      timestamp: "2026-09-09T06:41:55.419148+00:00",
      requestId: "abc123",
      kind: "tool",
      name: "gl_search",
      durationMs: 42,
      ok: true,
    });
  });

  test("unknown kinds normalize to tool, missing request id stays absent", () => {
    const view = mapStoredLogToView({
      id: 1,
      timestamp: "2026-09-09T00:00:00.000Z",
      kind: "worker",
      name: "gl_audit",
      durationMs: 3,
      ok: false,
    });
    expect(view.kind).toBe("tool");
    expect("requestId" in view).toBe(false);
  });

  test("stored row maps to a dashboard activity item", () => {
    const activity = mapStoredLogToActivity({
      id: 7,
      timestamp: "2026-09-09T00:00:00.000Z",
      kind: "tool",
      name: "gl_audit",
      durationMs: 120,
      ok: false,
    });
    expect(activity).toEqual({
      id: "db-7",
      kind: "audit",
      title: "Failed gl_audit",
      detail: "120ms - error",
      timestamp: "2026-09-09T00:00:00.000Z",
    });
  });
});

describe("in-memory log ring", () => {
  test("ring caps at 100 entries, newest first", () => {
    for (let i = 0; i < 105; i++) {
      appendLog({ kind: "tool", name: `gl_probe_${i}`, durationMs: i, ok: true });
    }
    const logs = listLogs();
    expect(logs).toHaveLength(100);
    expect(logs[0]?.name).toBe("gl_probe_104");
  });
});
