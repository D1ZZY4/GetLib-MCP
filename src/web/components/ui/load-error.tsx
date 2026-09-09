/**
 * Canonical load-failure state: alert message plus retry action.
 * Every data-driven view renders this instead of reimplementing the
 * same alert-plus-retry markup, so failure UX stays consistent.
 */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p role="alert" className="text-sm text-danger">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium text-accent underline"
      >
        Retry
      </button>
    </div>
  );
}
