import { z } from "zod";

/**
 * Shared required-text schema for tool inputs.
 *
 * Plain .min(1) accepts whitespace-only strings ("   "), which then fall
 * through to fuzzy matching, extraction guards, or evidence gates and
 * come back with the wrong error class (e.g. a license refusal for a
 * blank library name). Rejecting blanks at the schema boundary keeps
 * every tool's invalid input a clean -32602 validation error instead.
 */
export function nonBlankString(max: number) {
  return z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim().length > 0, {
      message: "must contain at least one non-whitespace character",
    });
}

/**
 * Canonical tool-name contract shared by the MCP registry and the
 * management execution route. A single pattern keeps catalog validation
 * and route validation from drifting into two contracts.
 */
export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

export function toolNameSchema() {
  return z.string().regex(TOOL_NAME_PATTERN, {
    message: "must match /^[a-z][a-z0-9_]{2,63}$/",
  });
}

/**
 * Optional free-text field shared by management routes. Blank optional
 * text normalizes to undefined so "" and "   " behave like an omitted
 * field instead of flowing into downstream detection or topic filtering
 * as a distinct empty value.
 */
export function optionalNonBlank(max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
    nonBlankString(max).optional(),
  );
}

export const LOG_LIMIT_DEFAULT = 50;
export const LOG_LIMIT_MAX = 100;

/**
 * Canonical log-limit parser shared by catalog service and routes.
 * Accepts the raw query value, returns a clamped integer, throws a
 * plain Error with an actionable message for invalid input.
 */
export function parseLogLimitValue(raw: string | null): number {
  if (raw === null || raw.length === 0) return LOG_LIMIT_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid limit: "${raw}" - must be an integer between 1 and ${LOG_LIMIT_MAX}`);
  }
  return Math.min(parsed, LOG_LIMIT_MAX);
}
