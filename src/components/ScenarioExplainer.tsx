// ScenarioExplainer.tsx — static, human-authored background copy explaining
// what a "1% annual chance" (so-called "100-year") coastal flood means over a
// planning horizon.
//
// IMPORTANT: this is DISPLAY-ONLY educational copy. It is NOT model output, is
// NOT an AI recommendation, and is NOT part of the AI path — it is never added
// to the AI system prompt, to serializeRequest, or to AssessmentRequest. The
// no-hallucination guarantee is therefore untouched. The figures below are the
// standard compounded-probability math (1 − 0.99^N) and the well-established
// FEMA "1% annual chance flood" definition, stated here as fixed, citable copy.

import type { ScenarioConfig } from '../types';

interface ScenarioExplainerProps {
  /** The active flood scenario, or undefined in present-day mode. */
  scenario?: ScenarioConfig;
}

export default function ScenarioExplainer({
  scenario,
}: ScenarioExplainerProps) {
  // Only shown for a 2050/2070 flood scenario. In present day we render nothing
  // so we never imply a flood scenario is active.
  if (!scenario) return null;

  return (
    <section
      className="rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100"
      aria-label='What "1% annual chance" means over time'
    >
      <h2 className="text-base font-semibold leading-tight">
        What “1% annual chance” means
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        A “1% annual chance” (often called the “100-year”) flood means a 1%
        chance in any given year — not “once per century.” Because that chance
        compounds, the odds of seeing at least one such event are roughly 1-in-4
        (~26%) over 30 years and about even (~50%) over ~70 years. Those odds
        describe the storm itself; the 2050 and 2070 layers also assume higher
        projected sea levels, so the same 1% storm reaches farther inland over
        time.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Background definition, not model output or an AI recommendation. Framing
        follows the standard FEMA “1% annual chance flood” definition and the
        MC-FRM sea-level-rise horizons; compounded odds use 1 − (0.99)
        <sup>N</sup>. See the{' '}
        <a
          href="https://www.mass.gov/info-details/massachusetts-sea-level-rise-and-coastal-flooding-viewer"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
        >
          Massachusetts sea level rise and coastal flooding viewer
        </a>
        .
      </p>
    </section>
  );
}
