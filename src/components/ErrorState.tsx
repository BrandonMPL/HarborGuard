// ErrorState.tsx — small, reusable presentational error indicator.
// Generic by design so the base map (task 2.2), flood layer (task 3), and the
// AI assessment panel (task 7) can all reuse it. Shows an error message and an
// optional retry control.

interface ErrorStateProps {
  /** Human-readable error message (e.g. "Base map unavailable"). */
  message: string;
  /** Optional retry handler; when provided a Retry button is rendered. */
  onRetry?: () => void;
  /** Label for the retry button. Defaults to "Retry". */
  retryLabel?: string;
  className?: string;
}

export default function ErrorState({
  message,
  onRetry,
  retryLabel = 'Retry',
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-md bg-slate-800/90 px-4 py-3 text-center text-slate-100 shadow-lg ${className}`}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
