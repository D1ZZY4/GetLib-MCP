import { toast } from "@heroui/react";

/**
 * Shared action feedback. One module owns toast titles, variants, and
 * timeouts so every feature confirms the same way: success toasts for
 * completed actions, danger toasts with a next step for failures.
 * Toasts render through the root Toast.Provider and announce via the
 * alertdialog pattern, so callers must not duplicate the same message
 * in a nearby live region.
 */

/** Confirm a completed action. Description carries the specifics. */
export function notifySuccess(title: string, description?: string): void {
  toast.success(title, {
    ...(description !== undefined ? { description } : {}),
    timeout: 4000,
  });
}

/** Report a failed action with its recovery step. Never includes secrets. */
export function notifyError(title: string, description: string): void {
  toast.danger(title, { description, timeout: 6000 });
}

/** Confirm a clipboard copy. Optional hint replaces the default paste line. */
export function notifyCopied(what: string, hint?: string): void {
  notifySuccess("Copied to clipboard", hint ?? `${what} is ready to paste.`);
}

/** Report a clipboard failure with the manual fallback. */
export function notifyCopyFailed(): void {
  notifyError("Copy failed", "Select the text manually and press Ctrl+C.");
}

/**
 * Open a loading toast for an async action and track it with toast.promise
 * instead: the promise variant swaps loading, success, and error states in
 * place. There is no in-place update API on the installed Toast version,
 * so callers needing manual control close the id with toast.close(id)
 * from "@heroui/react" and then show the outcome toast.
 */
export function notifyLoading(title: string, description?: string): string {
  return toast(title, {
    ...(description !== undefined ? { description } : {}),
    isLoading: true,
    timeout: 0,
  });
}
