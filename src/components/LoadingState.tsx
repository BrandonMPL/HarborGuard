// LoadingState.tsx — small, reusable presentational loading indicator.
// Generic by design so the base map (task 2.2), flood layer (task 3), and the
// AI assessment panel (task 7) can all reuse it. Renders a spinner plus an
// optional label.

interface LoadingStateProps {
  /** Optional message shown next to the spinner (e.g. "Loading base map…"). */
  label?: string;
  /** Visual scale of the spinner. Defaults to "md". */
  size?: 'sm' | 'md';
  className?: string;
}

const SPINNER_SIZE: Record<NonNullable<LoadingStateProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
};

export default function LoadingState({
  label,
  size = 'md',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex items-center gap-2 text-slate-100 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block animate-spin rounded-full border-slate-300 border-t-transparent ${SPINNER_SIZE[size]}`}
        aria-hidden="true"
      />
      {label ? <span className="text-sm">{label}</span> : null}
      <span className="sr-only">{label ?? 'Loading'}</span>
    </div>
  );
}
