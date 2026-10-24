// ContextPanel.tsx — the Context_Panel region (Requirements 4.3, 4.4, 4.5;
// task 10.2).
//
// Shows each active area's reference stats (reference-data, one-click source)
// and the station exposure list for the selected scenario. For a single area it
// is the East-Boston-as-before flow; for 'Both' it shows each area's stat block
// (kept honest — no summed/fabricated combined population) and lists every
// active station together.
//
// Honesty rules preserved: UNDETERMINED is explicit and never called flooded;
// not-exposed is never called flooded; only `exposed-modeled` is described as
// exposed, always framed as *modeled* (derived-analysis), never observed.

import type {
  AreaConfig,
  ExposureStatus,
  ScenarioConfig,
  StationExposure,
} from '../types';
import { STATUS_LABEL } from './StationLayer';
import CategoryTag from './CategoryTag';
import SourceBadge from './SourceBadge';
import ScenarioExplainer from './ScenarioExplainer';

interface ContextPanelProps {
  /** The active flood scenario, or undefined in present-day mode. */
  scenario?: ScenarioConfig;
  exposures: StationExposure[];
  /** Active area(s) — one, or East + West for 'Both'. */
  areas: AreaConfig[];
}

// Status → the dot color used in the list (matches the map marker palette).
const STATUS_DOT: Record<ExposureStatus, string> = {
  'exposed-modeled': 'bg-red-500',
  'not-exposed-modeled': 'bg-green-500',
  undetermined: 'bg-amber-400',
};

// Short, honest per-status description. Undetermined and not-exposed are never
// called flooded; exposed is always qualified as "modeled" (Requirement 4.4).
function statusDescription(status: ExposureStatus): string {
  switch (status) {
    case 'exposed-modeled':
      return 'Station point falls inside the modeled flood extent for this scenario.';
    case 'not-exposed-modeled':
      return 'Station point falls outside the modeled flood extent for this scenario.';
    case 'undetermined':
      return 'Station point sits within the boundary-caution band of the generalized model edge, so exposure cannot be determined.';
  }
}

export default function ContextPanel({
  scenario,
  exposures,
  areas,
}: ContextPanelProps) {
  const method = exposures[0]?.method;
  // Both sources are identical across stations of a given area (same station
  // dataset + same flood layer). With 'both' selected, the flood-layer source
  // can differ per area, so we surface the distinct flood-layer sources found
  // across the exposures. The station source(s) likewise.
  const stationSources = dedupeAttributions(
    exposures.map((e) => e.sources[0]).filter(Boolean),
  );
  const floodSources = dedupeAttributions(
    exposures.map((e) => e.sources[1]).filter(Boolean),
  );

  return (
    <aside
      className="flex flex-col gap-4 bg-slate-800 p-4 text-sm text-slate-100"
      aria-label="Exposure results and context"
    >
      {/* One reference-stat block per active area. For 'both' both blocks show;
          we never sum populations into a fake combined total (each block is the
          honest per-area figure, with the Downtown-only note on West). */}
      {areas.map((area) => (
        <div
          key={area.id}
          className="rounded-md border border-slate-700 bg-slate-900/60 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">{area.name}</h2>
            <CategoryTag category={area.category} />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-slate-400">Population</dt>
            <dd className="text-right font-medium text-slate-100">
              {area.population.toLocaleString()}
            </dd>
            <dt className="text-slate-400">Land area</dt>
            <dd className="text-right font-medium text-slate-100">
              {area.landSqMi} sq mi
            </dd>
          </dl>
          <div className="mt-2">
            <SourceBadge
              attribution={area.attribution}
              triggerLabel="Neighborhood source"
            />
          </div>
        </div>
      ))}

      {/* Static, sourced background explainer — display-only, NOT part of the
          AI path. Renders only for a 2050/2070 scenario. */}
      <ScenarioExplainer scenario={scenario} />

      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold leading-tight">
            Station exposure
          </h2>
          <CategoryTag category="derived-analysis" />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Area{areas.length > 1 ? 's' : ''}:{' '}
          {areas.map((a) => a.name).join(' + ')}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Scenario:{' '}
          {scenario ? scenario.label : 'Present day (no modeled flood layer)'}
        </p>
        {scenario ? (
          <>
            <p className="mt-1 text-xs text-slate-400">
              Derived analysis — computed by intersecting verified station
              points with the selected MC-FRM flood layer for each area.
            </p>
            {stationSources.length > 0 || floodSources.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {stationSources.map((s, i) => (
                  <SourceBadge
                    key={`st-${i}`}
                    attribution={s}
                    triggerLabel={
                      stationSources.length > 1
                        ? `Station source ${i + 1}`
                        : 'Station source'
                    }
                  />
                ))}
                {floodSources.map((s, i) => (
                  <SourceBadge
                    key={`fl-${i}`}
                    attribution={s}
                    triggerLabel={
                      floodSources.length > 1
                        ? `Flood layer source ${i + 1}`
                        : 'Flood layer source'
                    }
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            Select a 2050 or 2070 scenario to see modeled exposure.
          </p>
        )}
      </div>

      {!scenario ? null : exposures.length === 0 ? (
        <p className="text-xs text-slate-400">
          Exposure results are not available right now.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {exposures.map((e) => (
            <li
              key={e.stationId}
              className="rounded-md border border-slate-700 bg-slate-900/60 p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 flex-none rounded-full ${STATUS_DOT[e.status]}`}
                  aria-hidden
                />
                <span className="font-medium">{e.name}</span>
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                {STATUS_LABEL[e.status]}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {statusDescription(e.status)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ~{e.minEdgeDistanceM} m from modeled flood edge
              </p>
            </li>
          ))}
        </ul>
      )}

      {method ? (
        <p className="mt-auto text-[11px] leading-relaxed text-slate-500">
          Method: {method}. Sources: verified MBTA station points and the MC-FRM
          flood layer for the selected scenario and area.
        </p>
      ) : null}
    </aside>
  );
}

/** De-duplicate attributions by sourceName so 'both' doesn't show repeats. */
function dedupeAttributions<T extends { sourceName: string | null }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const key = it.sourceName ?? '∅';
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}
