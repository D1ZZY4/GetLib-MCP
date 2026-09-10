/**
 * Shared timeout-fallback factory for MCP tools.
 *
 * Every tool needs the same envelope on timeout (a text part plus an
 * optional structured part), but each tool keeps its own retry message
 * and its own structured payload shape. Centralizing the envelope here
 * removes the duplicated literal without collapsing the per-tool
 * messages into one generic string.
 */

interface TimeoutTextPart {
  type: "text";
  text: string;
}

export interface TimeoutTextOnly {
  content: [TimeoutTextPart];
}

export interface TimeoutWithStructured<TStructured> {
  content: [TimeoutTextPart];
  structuredContent: TStructured;
}

export function timeoutResponse(message: string): TimeoutTextOnly;
export function timeoutResponse<TStructured>(
  message: string,
  structuredContent: TStructured,
): TimeoutWithStructured<TStructured>;
export function timeoutResponse<TStructured>(
  message: string,
  structuredContent?: TStructured,
): TimeoutTextOnly | TimeoutWithStructured<TStructured> {
  if (structuredContent === undefined) {
    return { content: [{ type: "text", text: message }] };
  }
  return {
    content: [{ type: "text", text: message }],
    structuredContent,
  };
}
