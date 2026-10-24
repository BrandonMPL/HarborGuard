import { useMemo, useState } from 'react';
import MapView from './components/MapView';
import ScenarioSelector from './components/ScenarioSelector';
import NeighborhoodSelector from './components/NeighborhoodSelector';
import ContextPanel from './components/ContextPanel';
import AssessmentPanel from './components/AssessmentPanel';
import type {
  AreaSelection,
  ScenarioSelection,
  StationExposure,
} from './types';
import { areasForSelection } from './config/areas';
import { getScenario } from './config/scenarios';

export default function App() {
  // Lifted selection state. Default is the present-day baseline ('current') —
  // base map + neutral stations only, NO modeled flood layer. The user opts
  // into a flood scenario (2050/2070) to see modeled exposure. Area defaults to
  // East Boston (Requirement 2.1); 'both' renders East + West together.
  const [selection, setSelection] = useState<ScenarioSelection>('current');
  const [areaSelection, setAreaSelection] = useState<AreaSelection>('east');

  // Station exposures computed per active area in StationLayer, merged in
  // MapView and surfaced here, then handed to ContextPanel / AssessmentPanel
  // (Requirement 4.5). In present day the merged list is [] (no exposure).
  const [exposures, setExposures] = useState<StationExposure[]>([]);

  // Present day → no active flood scenario (undefined). Only 2050/2070 resolve
  // to a ScenarioConfig and drive the flood layer + exposure.
  const scenario = selection === 'current' ? undefined : getScenario(selection);

  // The active area(s) for the current selection (one, or East+West for 'both').
  const areas = useMemo(
    () => areasForSelection(areaSelection),
    [areaSelection],
  );

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
      <header className="flex-none border-b border-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">HarborGuard</h1>
          <div className="flex flex-wrap items-center gap-3">
            <NeighborhoodSelector
              value={areaSelection}
              onChange={setAreaSelection}
            />
            <ScenarioSelector value={selection} onChange={setSelection} />
          </div>
        </div>
      </header>
      {/* Responsive single-scroll layout (task 9.1, Req 9.4/9.5/9.6) —
          unchanged: stacked single column <lg with the outer <main> as the
          scroll container; side-by-side two-column grid at lg. */}
      <main className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_22rem] lg:overflow-hidden">
        <div className="h-[60vh] min-h-[22rem] lg:h-auto lg:min-h-0">
          <MapView
            areas={areas}
            scenario={scenario}
            onExposuresChange={setExposures}
          />
        </div>
        <div className="flex min-h-0 flex-col bg-slate-800 lg:overflow-y-auto">
          <ContextPanel
            scenario={scenario}
            exposures={exposures}
            areas={areas}
          />
          <div className="px-4 pb-4">
            <AssessmentPanel
              scenario={scenario}
              areas={areas}
              exposures={exposures}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
