// SourceBadge.tsx — one-interaction Source_Attribution reveal (Req 3.5, 3.6,
// 8.3, 8.4).
//
// Presentational only. Given a SourceAttribution, it renders a compact trigger
// that reveals the provenance (source name, source URL, data date) in a SINGLE
// interaction (Req 8.4 — no more than one interaction to reveal). We use a
// native <details>/<summary> disclosure: one click (or Enter/Space on the
// focused summary) toggles it open, the revealed content is keyboard reachable
// for free, and no popover/focus-trap plumbing is needed.
//
// Missing-field handling (Req 3.6 / 8.6): every field goes through the
// provenance display helpers, so a null/empty field shows the "unavailable"
// indicator instead of a blank or a broken link. isFieldMissing drives a
// subtle muted/italic style so it reads as "unavailable", not just empty, and
// a missing URL is rendered as plain text (never an anchor to nothing).
//
// Scope (task 5.2): this builds the reusable component only. Wiring it into
// ContextPanel / Legend / AssessmentPanel, and rendering limitations in full
// prose, is task 5.4. Limitations are shown here compactly only when present.
//
// Usage: <SourceBadge attribution={scenario.attribution} /> — place it
// adjacent to the value whose provenance it describes.

import { useId } from 'react';
import type { SourceAttribution } from '../types';
import {
  displayDataDate,
  displaySourceName,
  displaySourceUrl,
  isFieldMissing,
} from '../lib/provenance';

interface SourceBadgeProps {
  /** The attribution to reveal (source name, URL, date, optional limitations). */
  attribution: SourceAttribution;
  /** Text on the disclosure trigger. Defaults to "Source". */
  triggerLabel?: string;
}

/** One labeled provenance row; missing values render as a muted "unavailable". */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const missing = isFieldMissing(value);
  return (
    <div className="flex gap-1.5">
      <dt className="flex-none font-medium text-slate-400">{label}:</dt>
      <dd
        className={
          missing ? 'italic text-slate-500' : 'break-words text-slate-100'
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default function SourceBadge({
  attribution,
  triggerLabel = 'Source',
}: SourceBadgeProps) {
  const contentId = useId();

  const name = displaySourceName(attribution);
  const url = displaySourceUrl(attribution);
  const date = displayDataDate(attribution);

  // Only render a real link when the URL is actually present; otherwise show
  // the "unavailable" indicator as plain (muted) text, never a broken anchor.
  const urlMissing = isFieldMissing(attribution.sourceUrl);

  const limitations = (attribution.limitations ?? []).filter(
    (l) => !isFieldMissing(l),
  );

  return (
    <details className="group inline-block text-xs text-slate-100">
      <summary
        className="inline-flex cursor-pointer select-none items-center gap-1 rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-sky-300 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 marker:content-none [&::-webkit-details-marker]:hidden"
        aria-controls={contentId}
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3 flex-none transition-transform group-open:rotate-90"
          aria-hidden
        >
          <path
            d="M6 4l4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {triggerLabel}
      </summary>

      <div
        id={contentId}
        className="mt-1 w-max max-w-xs rounded-md border border-slate-700 bg-slate-900 p-2 shadow-lg"
      >
        <dl className="flex flex-col gap-1">
          <Field label="Name" value={name} />

          {/* Source URL — clickable link when present, muted "unavailable"
              otherwise (Req 3.5 / 3.6). */}
          <div className="flex gap-1.5">
            <dt className="flex-none font-medium text-slate-400">URL:</dt>
            <dd className="min-w-0 break-all">
              {urlMissing ? (
                <span className="italic text-slate-500">{url}</span>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline hover:text-sky-300"
                >
                  {url}
                </a>
              )}
            </dd>
          </div>

          <Field label="Date" value={date} />
        </dl>

        {/* Optional compact limitations (full prose is task 5.4). */}
        {limitations.length > 0 && (
          <div className="mt-1.5 border-t border-slate-700 pt-1.5">
            <div className="font-medium text-slate-400">Limitations:</div>
            <ul className="mt-0.5 list-disc pl-4 text-slate-200">
              {limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
