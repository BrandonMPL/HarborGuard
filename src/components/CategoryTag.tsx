// CategoryTag.tsx — the Data_Category pill (Requirements 3.8, 8.2, 8.7).
//
// Presentational only. Renders EXACTLY one of the five Data_Category labels
// (via categoryLabel) with a distinct, consistent color per category so the
// five categories are visually distinguishable (Req 8.2). The label is real
// text — never color-only — so the tag is readable without relying on hue.
//
// Undetermined case (Req 3.8 / 8.7): when a value has NO recorded category,
// pass `null`/`undefined` and the tag renders a muted "Category: undetermined"
// indicator. Per Req 8.7 the actual value must then be WITHHELD from display;
// that withholding is enforced by the callers (task 5.4) — this component only
// provides the undetermined indicator, it does not render any value.
//
// This does NOT wire CategoryTag across the app (task 5.4); it is the reusable
// building block those call sites consume.

import type { DataCategory } from '../types';
import { categoryLabel } from '../lib/provenance';

export type CategoryTagSize = 'sm' | 'md';

interface CategoryTagProps {
  /**
   * The value's Data_Category. When null/undefined the value has no recorded
   * category, so an "undetermined" indicator is shown instead (Req 8.7).
   */
  category?: DataCategory | null;
  /** Visual size — 'sm' (default, 10px) or 'md' (11px). */
  size?: CategoryTagSize;
  /** Extra classes appended to the pill. */
  className?: string;
}

// Per-category Tailwind classes. Each category gets a distinct, consistent hue
// so the five are visually distinguishable (Req 8.2). Colors align with the
// app's existing semantics: future-model-projection = cyan (matches the flood
// symbology), ai-recommendation = violet (matches AssessmentPanel's badge).
const CATEGORY_CLASS: Record<DataCategory, string> = {
  'historical-observation': 'bg-sky-500/20 text-sky-200',
  'future-model-projection': 'bg-cyan-500/20 text-cyan-200',
  'reference-data': 'bg-slate-500/25 text-slate-200',
  'derived-analysis': 'bg-indigo-500/20 text-indigo-200',
  'ai-recommendation': 'bg-violet-500/20 text-violet-200',
};

// Muted amber indicator for a value with no recorded Data_Category (Req 8.7),
// mirroring the "undetermined" amber used for station exposure elsewhere.
const UNDETERMINED_CLASS = 'bg-amber-500/15 text-amber-200';
const UNDETERMINED_LABEL = 'Category: undetermined';

const SIZE_CLASS: Record<CategoryTagSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-[11px]',
};

// `leading-none` keeps the pill's box tight around its text so, when it sits in
// an `items-center` row beside a larger heading or a status circle, it lines up
// cleanly instead of appearing a hair high/low from inherited line-height.
const BASE_CLASS =
  'inline-flex items-center leading-none rounded-full font-bold uppercase tracking-wide';

/**
 * A small pill labeling a displayed value's Data_Category. Renders the
 * category label when a category is recorded, or a muted "undetermined"
 * indicator when it is missing (Req 8.7).
 */
export default function CategoryTag({
  category,
  size = 'sm',
  className,
}: CategoryTagProps) {
  const isUndetermined = category == null;
  const colorClass = isUndetermined
    ? UNDETERMINED_CLASS
    : CATEGORY_CLASS[category];
  const label = isUndetermined ? UNDETERMINED_LABEL : categoryLabel(category);

  return (
    <span
      className={[BASE_CLASS, SIZE_CLASS[size], colorClass, className]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  );
}
