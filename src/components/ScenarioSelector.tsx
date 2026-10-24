// ScenarioSelector.tsx — the Scenario_Selector control (Requirement 2.2, 2.3).
//
// Offers a "Present day" baseline (no modeled flood layer) plus the two flood
// scenarios HarborGuard supports (2050, 2070), sourced from `SCENARIOS`
// (ordered 2050-first). "Present day" is first and is the default selection.
// Rendered as a segmented toggle; the active option is visually distinct. State
// lives in App (lifted); this is a controlled component via `value` / `onChange`.

import type { ScenarioSelection } from '../types';
import { SCENARIOS } from '../config/scenarios';

interface ScenarioSelectorProps {
  value: ScenarioSelection;
  onChange: (selection: ScenarioSelection) => void;
}

// The ordered options: present-day baseline first, then each flood scenario.
const OPTIONS: Array<{
  value: ScenarioSelection;
  label: string;
  title: string;
}> = [
  {
    value: 'current',
    label: 'Present day',
    title: 'Present day — base map and stations only, no modeled flood layer',
  },
  ...SCENARIOS.map((scenario) => ({
    value: scenario.year as ScenarioSelection,
    label: String(scenario.year),
    title: scenario.label,
  })),
];

export default function ScenarioSelector({
  value,
  onChange,
}: ScenarioSelectorProps) {
  return (
    <div
      className="inline-flex rounded-md border border-slate-700 bg-slate-800 p-0.5"
      role="radiogroup"
      aria-label="Flood scenario"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            title={option.title}
            className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
              active
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
