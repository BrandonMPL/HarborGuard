// NeighborhoodSelector.tsx — the area selector (Requirement 2.1, task 10.2).
//
// Offers three options: East Boston, Downtown / Waterfront, and Both. The value
// is an AreaSelection ('east' | 'west' | 'both'); 'both' renders both areas'
// flood layers + stations together. The East-only P0 baseline is preserved —
// selecting 'east' behaves exactly as before. Controlled via value/onChange.

import type { AreaSelection } from '../types';

interface NeighborhoodSelectorProps {
  value: AreaSelection;
  onChange: (selection: AreaSelection) => void;
}

const OPTIONS: Array<{ value: AreaSelection; label: string }> = [
  { value: 'east', label: 'East Boston' },
  { value: 'west', label: 'Downtown / Waterfront' },
  { value: 'both', label: 'Both' },
];

export default function NeighborhoodSelector({
  value,
  onChange,
}: NeighborhoodSelectorProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-300">
      <span className="font-medium">Area</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AreaSelection)}
        aria-label="Area"
        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
