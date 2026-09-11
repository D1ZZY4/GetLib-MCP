/**
 * Telemetry - request lifecycle tracking, structured logs, and success/error
 * rate observability for every MCP tool invocation.
 *
 * Every tool handler should be wrapped with `withTelemetry` so every call gets:
 * - Unique request ID for log correlation
 * - Duration measurement (p50/p95 via metrics.ts)
 * - Success / error / empty-result tracking
 * - Structured log entry
 * - Stored last-failure for /health diagnostics
 *
 * The goal: every "use getlib mcp" invocation produces an observable trace so we
 * can prove 100% success rate (or diagnose exactly why it dropped).
 */

import { log, type LogEntry } from "../utils/logger";
import { generateRequestId } from "../utils/guard";
import { recordToolCall } from "./metrics";
import { lookupByAlias } from "../sources/registry";

export interface TelemetryContext {
  tool: string;
  requestId: string;
  startTime: number;
  /** Set by handler when a request resolves from cache */
  cacheHit: boolean;
  /** Set by handler when content was successfully delivered to the user */
  resolved: boolean;
  /** Library the call is about, via noteToolSubject. Powers most-used stats. */
  subject?: string;
  /** Optional input fingerprint for grouping retries */
  inputHash?: string;
}

export interface TelemetryResult {
  durationMs: number;
  success: boolean;
  cacheHit: boolean;
  resolved: boolean;
  error?: string;
}

import { pushOutcome, type InvocationOutcome } from "./telemetry-outcomes";

export type { InvocationOutcome } from "./telemetry-outcomes";
export { getRecentOutcomes, getInvocationSummary, resetTelemetry, OUTCOME_WINDOW } from "./telemetry-outcomes";

const SUBJECT_MAX_LENGTH = 120;

/**
 * Normalize a raw library reference to the canonical registry id when it
 * matches a known name or alias ("react" becomes "facebook/react"),
 * otherwise a trimmed lowercase label. Accepts the shapes tool inputs
 * actually carry: a single id string or a list (compare), where the
 * first entry is the primary subject. Null when nothing usable is given.
 */
export function normalizeToolSubject(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") return null;
  const trimmed = first.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  const sliced = trimmed.slice(0, SUBJECT_MAX_LENGTH);
  return lookupByAlias(sliced)?.id ?? sliced;
}

/**
 * Record which library a tool call is about for most-used statistics.
 * Handlers call this once with their library input (resolve passes the
 * name, single-library tools their libraryId, compare its first entry).
 * Display-only observability label, never a security boundary.
 */
export function noteToolSubject(ctx: TelemetryContext, value: unknown): void {
  const subject = normalizeToolSubject(value);
  if (subject !== null) ctx.subject = subject;
}

/**
 * Extract the subject from raw tool args for paths that never see a
 * telemetry context (the registry run log). Same normalization as the
 * context path so both agree on every call.
 */
export function subjectFromToolArgs(args: unknown): string | null {
  if (typeof args !== "object" || args === null) return null;
  const record = args as Record<string, unknown>;
  return normalizeToolSubject(record["libraryId"] ?? record["library"] ?? record["libraryName"] ?? record["libraries"] ?? null);
}

/**
 * Open a telemetry context for a tool invocation. Pair with `endCall*`
 * exactly once. Prefer `withTelemetry` for typical handler wrapping.
 */
export function startCall(tool: string, inputHash?: string): TelemetryContext {  const ctx: TelemetryContext = {
    tool,
    requestId: generateRequestId(),
    startTime: Date.now(),
    cacheHit: false,
    resolved: false,
  };
  if (inputHash !== undefined) ctx.inputHash = inputHash;
  log({ level: "debug", msg: "tool.start", tool, requestId: ctx.requestId });
  return ctx;
}

function finish(
  ctx: TelemetryContext,
  success: boolean,
  errorMessage?: string,
): TelemetryResult {
  const durationMs = Date.now() - ctx.startTime;
  recordToolCall(ctx.tool, durationMs, ctx.cacheHit, !success);
  const outcome: InvocationOutcome = {
    tool: ctx.tool,
    requestId: ctx.requestId,
    ts: Date.now(),
    durationMs,
    success,
    cacheHit: ctx.cacheHit,
    resolved: ctx.resolved,
    ...(ctx.subject !== undefined ? { subject: ctx.subject } : {}),
  };
  if (errorMessage !== undefined) outcome.error = errorMessage;
  pushOutcome(outcome);

  const baseEntry: LogEntry = {
    level: success ? "info" : "error",
    msg: success ? "tool.end" : "tool.error",
    tool: ctx.tool,
    requestId: ctx.requestId,
    durationMs,
    cacheHit: ctx.cacheHit,
    resolved: ctx.resolved,
    ...(ctx.subject !== undefined ? { subject: ctx.subject } : {}),
  };
  if (errorMessage !== undefined) baseEntry["error"] = errorMessage;
  log(baseEntry);
  const result: TelemetryResult = { durationMs, success, cacheHit: ctx.cacheHit, resolved: ctx.resolved };
  if (errorMessage !== undefined) result.error = errorMessage;
  return result;
}

export function endCallSuccess(ctx: TelemetryContext): TelemetryResult {
  return finish(ctx, true);
}

export function endCallError(ctx: TelemetryContext, error: unknown): TelemetryResult {
  const message = error instanceof Error ? error.message : String(error);
  return finish(ctx, false, message);
}

/**
 * Wrap a tool handler with full telemetry instrumentation.
 *
 * The handler receives the `ctx` so it can flip `ctx.cacheHit` and
 * `ctx.resolved` to communicate richer state to telemetry. Errors thrown
 * inside the handler are caught, recorded, then re-thrown so the MCP
 * protocol layer can format them. If you want a never-fail tool that
 * returns guidance text instead of throwing, wrap the handler with
 * withToolTimeout and a fallback response instead.
 */
export async function withTelemetry<T>(
  tool: string,
  fn: (ctx: TelemetryContext) => Promise<T>,
  inputHash?: string,
): Promise<T> {
  const ctx = startCall(tool, inputHash);
  try {
    const result = await fn(ctx);
    endCallSuccess(ctx);
    return result;
  } catch (err) {
    endCallError(ctx, err);
    throw err;
  }
}
