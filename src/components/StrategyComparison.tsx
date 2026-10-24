// StrategyComparison.tsx — qualitative side-by-side strategy comparison
// (Requirements 6.1, 6.2, 6.3, 6.4, 6.5).
//
// Operates ONLY on the generated ResilienceAssessment.adaptationStrategies[],
// which are source-grounded and server-validated (tasks 6.1-6.3). This is the
// no-hallucination rule in practice: every dimension cell shows the EXACT prose
// the model already produced — never a value synthesized here. The curated
// STRATEGY_OPTIONS deliberately lack these four dimensions and are NOT used.
//
// Interaction:
//  - The user toggles 2-3 of the generated strategies by name.
//  - < 2 or > 3 selected (Req 6.2): show the "between two and three" message
//    and render NO comparison table.
//  - 2-3 selected (Req 6.1): one COLUMN per selected strategy, one ROW per
//    dimension (feasibility, community benefits, ecosystem benefits,
//    uncertainties). Descriptive text only; no numbers are computed (Req 6.3).
//  - Any empty/missing dimension field (Req 6.4): a muted "Not available"
//    indicator — never an invented value.
//  - A visible AI-generated recommendation label sits adjacent to the content
//    (Req 6.5), reusing CategoryTag for the ai-recommendation Data_Category.

import { useState } from 'react';
import type { ResilienceAssessment } from '../types';
import CategoryTag from './CategoryTag';

type Strategy = ResilienceAssessment['adaptationStrategies'][number];

interface StrategyComparisonProps {
  strategies: Strategy[];
}

// The four comparison dimensions, in required display order (Req 6.1). Each maps
// a row label to the strategy field whose prose fills that row.
const DIMENSIONS: Array<{ label: string; key: keyof Strategy }> = [
  { label: 'Feasibility', key: 'feasibility' },
  { label: 'Community benefits', key: 'communityBenefits' },
  { label: 'Ecosystem benefits', key: 'ecosystemBenefits' },
  { label: 'Uncertainties', key: 'uncertainties' },
];

const MIN_SELECTION = 2;
const MAX_SELECTION = 3;

export default function StrategyComparison({
  strategies,
}: StrategyComparisonProps) {
  // Selected strategy names. We key by index-qualified name so duplicate names
  // (unlikely but possible from the model) stay distinct.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Nothing to compare if the assessment produced fewer than two strategies —
  // the 2-3 rule can never be satisfied, so the whole feature is hidden.
  if (strategies.length < MIN_SELECTION) return null;

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const selectedIndices = Array.from(selected).sort((a, b) => a - b);
  const count = selectedIndices.length;
  const inRange = count >= MIN_SELECTION && count <= MAX_SELECTION;
  // Disable further checkboxes once at the max, but keep checked ones toggleable.
  const atMax = count >= MAX_SELECTION;

  return (
    <section
      className="flex flex-col gap-3 border-t border-slate-700 pt-4"
      aria-label="Adaptation strategy comparison"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">Compare strategies</h2>
          {/* AI-generated recommendation label adjacent to the content (Req 6.5). */}
          <CategoryTag category="ai-recommendation" />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Select two or three strategies to compare them side by side.
        </p>
      </div>

      {/* Selection toggles — one per generated strategy. */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="sr-only">Strategies to compare</legend>
        {strategies.map((s, i) => {
          const checked = selected.has(i);
          return (
            <label
              key={`${s.name}-${i}`}
              className={`flex items-start gap-2 rounded border px-2 py-1.5 text-xs transition ${
                checked
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-slate-700 bg-slate-900/40'
              } ${
                !checked && atMax
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:border-slate-500'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 accent-violet-500"
                checked={checked}
                disabled={!checked && atMax}
                onChange={() => toggle(i)}
              />
              <span className="font-medium text-slate-200">{s.name}</span>
            </label>
          );
        })}
      </fieldset>

      {/* Req 6.2: out of range → message, no comparison table. */}
      {!inRange ? (
        <p
          className="rounded-md border border-slate-600 bg-slate-800/60 p-2.5 text-xs text-slate-300"
          role="status"
        >
          Select between two and three strategies to compare.
        </p>
      ) : (
        <ComparisonTable
          strategies={selectedIndices.map((i) => strategies[i])}
        />
      )}
    </section>
  );
}

// Req 6.1: one column per selected strategy, one row per dimension. The outer
// wrapper allows horizontal scroll of ONLY the table on narrow viewports so the
// page keeps its no-horizontal-scroll responsive behavior (Req 9.5).
function ComparisonTable({ strategies }: { strategies: Strategy[] }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[22rem] border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-slate-900 p-2 text-left align-bottom text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Dimension
            </th>
            {strategies.map((s, i) => (
              <th
                key={`${s.name}-${i}`}
                className="min-w-[10rem] border-l border-slate-700 p-2 text-left align-bottom text-sm font-semibold text-slate-100"
                scope="col"
              >
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map(({ label, key }) => (
            <tr key={key} className="border-t border-slate-700/70 align-top">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-slate-900 p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400"
              >
                {label}
              </th>
              {strategies.map((s, i) => (
                <Cell key={`${key}-${i}`} value={s[key]} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Req 6.3: descriptive text only (the model's prose). Req 6.4: empty/missing →
// a muted "Not available" indicator; never substitute an invented value.
function Cell({ value }: { value: string }) {
  const text = typeof value === 'string' ? value.trim() : '';
  return (
    <td className="min-w-[10rem] border-l border-slate-700 p-2 leading-relaxed text-slate-200">
      {text ? (
        text
      ) : (
        <span className="italic text-slate-500">Not available</span>
      )}
    </td>
  );
}
