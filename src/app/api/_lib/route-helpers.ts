import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRequestId } from "@/server/mcp/utils/guard";
import { DevelopmentForbiddenError } from "@/application/development/development.service";
import { ToolNameValidationError, UnknownToolError } from "@/application/mcp/mcp-catalog.service";
import { SourceSettingsValidationError } from "@/server/mcp/services/source-settings";

export type ErrorCode =
  | "validation_error"
  | "unknown_tool"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "rate_limited"
  | "provider_error"
  | "unavailable"
  | "internal_error";

interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string };
}

interface SuccessEnvelope<T> {
  data: T;
  meta: { requestId: string };
}

const MAX_JSON_BYTES = 256 * 1024;

function requestId(): string {
  return generateRequestId();
}

export function jsonOk<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

/**
 * Successful result that is partial or degraded at the application level.
 * Always HTTP 200 - the payload meta carries the degraded state so HTTP
 * success is never confused with application completeness.
 */
export function jsonPartial<T>(data: T, warnings: string[] = []): NextResponse {
  const body: SuccessEnvelope<T> & { meta: { status: "partial"; warnings: string[] } } = {
    data,
    meta: { requestId: requestId(), status: "partial", warnings },
  };
  return NextResponse.json(body);
}

export function jsonError(code: ErrorCode, message: string, status: number, id: string): NextResponse<ErrorBody> {
  return NextResponse.json({ error: { code, message, requestId: id } }, { status });
}

export function mapRouteError(error: unknown, id: string): NextResponse<ErrorBody> {
  if (error instanceof UnknownToolError) {
    return jsonError("unknown_tool", error.message, 404, id);
  }
  if (error instanceof ToolNameValidationError) {
    const message = error.message;
    if (message.startsWith("Request body too large")) {
      return jsonError("validation_error", message, 413, id);
    }
    return jsonError("validation_error", message, 400, id);
  }
  if (error instanceof SourceSettingsValidationError) {
    // Syntactically valid JSON that fails semantic policy - 422 per contract.
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
  return jsonError("internal_error", "Unexpected error while handling the request.", 500, id);
}

export async function readJsonBody(req: Request): Promise<unknown> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > MAX_JSON_BYTES) {
      throw new ToolNameValidationError(
        `Request body too large: ${declared} bytes - limit is ${MAX_JSON_BYTES} bytes.`,
      );
    }
  }
  const text = await req.text();
  if (text.length === 0) return undefined;
  if (text.length > MAX_JSON_BYTES) {
    throw new ToolNameValidationError(
      `Request body too large: ${text.length} bytes - limit is ${MAX_JSON_BYTES} bytes.`,
    );
  }
  return JSON.parse(text) as unknown;
}

export { requestId };
