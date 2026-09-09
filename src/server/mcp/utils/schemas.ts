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
