import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRequestId } from "@/server/mcp/utils/guard";
import { SESSION_SECRET_MISSING_MESSAGE, SessionSecretMissingError, UNAUTHORIZED_MESSAGE, UnauthorizedError } from "@/application/auth/session";
import { ApiKeyValidationError } from "@/application/apikeys/apikeys.service";
import { DevelopmentForbiddenError } from "@/application/development/development.service";
import { LogLimitError, ToolNameValidationError, UnknownToolError } from "@/application/mcp/mcp-catalog.service";
import { SourceSettingsValidationError } from "@/application/sources/sources.service";
import { RateLimitError } from "@/server/mcp/utils/rate-limit";
import { log } from "@/server/mcp/utils/logger";
import { OriginRejectedError, assertAllowedOrigin } from "@/server/mcp/transport/request-guard";

export type ErrorCode =
  | "validation_error"
  | "unknown_tool"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "rate_limited"
  | "payload_too_large"
  | "bad_gateway"
  | "service_unavailable"
  | "gateway_timeout"
  | "internal_error";

interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string };
}

const MAX_JSON_BYTES = 256 * 1024;

/**
 * Oversized request body. Distinct from ToolNameValidationError so the
 * mapper branches on type instead of message-prefix matching.
 */
export class PayloadTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

function requestId(): string {
  return generateRequestId();
}

export function jsonOk<T>(data: T, id?: string): NextResponse {
  const response = NextResponse.json(data);
  if (id !== undefined) response.headers.set("X-Request-Id", id);
  return response;
}

export function jsonCreated<T>(data: T, id?: string): NextResponse {
  const response = NextResponse.json(data, { status: 201 });
  if (id !== undefined) response.headers.set("X-Request-Id", id);
  return response;
}

export function jsonError(
  code: ErrorCode,
  message: string,
  status: number,
  id: string,
  headers?: Record<string, string>,
): NextResponse<ErrorBody> {
  const response = NextResponse.json({ error: { code, message, requestId: id } }, { status });
  response.headers.set("X-Request-Id", id);
  if (headers !== undefined) {
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  }
  return response;
}

export function mapRouteError(error: unknown, id: string): NextResponse<ErrorBody> {
  if (error instanceof RateLimitError) {
    // Audit trail for abuse analysis. No identity or headers logged,
    // only the correlation id and retry hint already sent to the client.
    log({ level: "warn", msg: "api.rate_limited", requestId: id, retryAfterSeconds: error.retryAfterSeconds });
    return jsonError("rate_limited", error.message, 429, id, {
      "Retry-After": String(error.retryAfterSeconds),
    });
  }
  if (error instanceof UnauthorizedError) {
    return jsonError("unauthorized", UNAUTHORIZED_MESSAGE, 401, id);
  }
  if (error instanceof SessionSecretMissingError) {
    // Fail closed without leaking configuration detail to the client.
    return jsonError("internal_error", SESSION_SECRET_MISSING_MESSAGE, 500, id);
  }
  if (error instanceof UnknownToolError) {
    return jsonError("unknown_tool", error.message, 404, id);
  }
  if (error instanceof ToolNameValidationError) {
    return jsonError("validation_error", error.message, 400, id);
  }
  if (error instanceof PayloadTooLargeError) {
    return jsonError("payload_too_large", error.message, 413, id);
  }
  if (error instanceof LogLimitError) {
    return jsonError("validation_error", error.message, 400, id);
  }
  if (error instanceof SourceSettingsValidationError) {
    // Syntactically valid JSON that fails semantic policy - 422 per contract.
    return jsonError("validation_error", error.message, 422, id);
  }
  if (error instanceof ApiKeyValidationError) {
    return jsonError("validation_error", error.message, 422, id);
  }
  if (error instanceof DevelopmentForbiddenError) {
    return jsonError("forbidden", error.message, 403, id);
  }
  if (error instanceof SyntaxError) {
    return jsonError("validation_error", "Request body must be valid JSON.", 400, id);
  }
  if (error instanceof z.ZodError) {
    // Well-formed JSON that fails semantic validation - 422 distinguishes
    // it from malformed requests (400) per HTTP semantics.
    return jsonError("validation_error", "Request body failed validation.", 422, id);
  }
  // Audit trail for root-cause analysis. The client only gets the generic
  // message below; details stay server-side in the redacted logger.
  log({ level: "error", msg: "api.internal_error", requestId: id });
  return jsonError("internal_error", "Unexpected error while handling the request.", 500, id);
}

/**
 * Shared Origin/Host validation for MCP transports. Returns a 403 response
 * when the browser Origin is rejected, null when the request may proceed.
 * Non-origin errors are rethrown for mapRouteError handling.
 */
export function assertOriginOr403(req: Request, id: string): NextResponse<ErrorBody> | null {
  try {
    assertAllowedOrigin(req);
    return null;
  } catch (error) {
    if (error instanceof OriginRejectedError) {
      return jsonError("forbidden", error.message, 403, id);
    }
    throw error;
  }
}

export async function readJsonBody(req: Request): Promise<unknown> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
      throw new PayloadTooLargeError(
        `Request body too large: ${declared} bytes - limit is ${MAX_JSON_BYTES} bytes.`,
      );
    }
  }
  const text = await req.text();
  if (text.length === 0) return undefined;
  // Measure bytes, not UTF-16 code units, so multibyte payloads cannot
  // bypass the byte limit by char count.
  const byteLength = typeof Buffer !== "undefined" ? Buffer.byteLength(text, "utf-8") : new TextEncoder().encode(text).length;
  if (byteLength > MAX_JSON_BYTES) {
    throw new PayloadTooLargeError(
      `Request body too large: ${byteLength} bytes - limit is ${MAX_JSON_BYTES} bytes.`,
    );
  }
  return JSON.parse(text) as unknown;
}

export { requestId };
