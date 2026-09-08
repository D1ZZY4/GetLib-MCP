import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRequestId } from "@/server/mcp/utils/guard";
import { ToolNameValidationError, UnknownToolError } from "@/application/mcp/mcp-catalog.service";
import { SourceSettingsValidationError } from "@/server/mcp/services/source-settings";

export type ErrorCode =
  | "validation_error"
  | "unknown_tool"
  | "not_found"
  | "unauthorized"
  | "provider_error"
  | "internal_error";

interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string };
}

const MAX_JSON_BYTES = 256 * 1024;

function requestId(): string {
  return generateRequestId();
}

export function jsonOk<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

export function jsonError(code: ErrorCode, message: string, status: number, id: string): NextResponse<ErrorBody> {
  return NextResponse.json({ error: { code, message, requestId: id } }, { status });
}

export function mapRouteError(error: unknown, id: string): NextResponse<ErrorBody> {
  if (error instanceof UnknownToolError) {
    return jsonError("unknown_tool", error.message, 404, id);
  }
  if (error instanceof ToolNameValidationError) {
    return jsonError("validation_error", error.message, 400, id);
  }
  if (error instanceof SourceSettingsValidationError) {
    return jsonError("validation_error", error.message, 400, id);
  }
  if (error instanceof SyntaxError) {
    return jsonError("validation_error", "Request body must be valid JSON.", 400, id);
  }
  if (error instanceof z.ZodError) {
    return jsonError("validation_error", "Request body failed validation.", 400, id);
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
