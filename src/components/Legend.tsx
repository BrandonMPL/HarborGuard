// Legend.tsx — the map Legend (Requirements 3.3, 3.4).
//
// Presentational only: given the currently displayed scenario it explains the
// map's symbology so a User can read the flood fill and the colored station
// markers, and it states the scenario year and the flood layer units.
//
// What it shows:
//  - Flood-extent swatch (cyan fill + outline matching FloodLayer's
//    FLOOD_STYLE) with the scenario year label (Req 3.4) and the units from
//    scenario.attribution (Req 3.3). Our units string is honest that flood
//    EXTENT is shown and depth is not displayed; we surface it verbatim via
//    the provenance helper rather than claiming a depth unit we don't render.
//  - Station marker status key (exposed / not exposed / undetermined) using
//    the StationLayer palette + STATUS_LABEL so the colored markers are
//    explained.
//
// Task 5.4: the Legend is the chosen home for the flood layer's provenance.
// It carries a CategoryTag ('future-model-projection') plus a SourceBadge for
// scenario.attribution so the MC-FRM source name/URL/date AND its recorded
// limitations (Req 8.5) are revealable in one interaction right next to the
// flood symbology (Req 8.2, 8.3, 8.4).

import type { ExposureStatus, ScenarioConfig } from '../types';
import { displayUnits } from '../lib/provenance';
import { STATUS_LABEL } from './StationLayer';
import CategoryTag from './CategoryTag';
import SourceBadge from './SourceBadge';

interface LegendProps {
  /**
   * The currently displayed scenario — drives year label + flood units. When
   * ABSENT (present-day baseline) there is NO modeled flood layer, so the flood
   * swatch is replaced with a "no modeled flood layer" note and only the
   * station key is shown.
   */
  scenario?: ScenarioConfig;
}

// Flood-extent swatch colors — MUST mirror FloodLayer's FLOOD_STYLE so the
// legend reads as the same symbology drawn on the map (cyan-500 fill,
// cyan-700 outline).
const FLOOD_FILL = '#06b6d4';
const FLOOD_OUTLINE = '#0e7490';

// Neutral station marker color — mirrors StationLayer's present-day NEUTRAL_FILL
// so the present-day key matches the markers drawn on the map (slate-500).
const NEUTRAL_FILL = '#64748b';

// Station marker swatch colors — mirror StationLayer's STATUS_FILL palette so
// the dots here match the markers on the map (exposed red, not-exposed green,
// undetermined amber).
const STATUS_FILL: Record<ExposureStatus, string> = {
  'exposed-modeled': '#dc2626',
  'not-exposed-modeled': '#16a34a',
  undetermined: '#f59e0b',
};

// Render order for the station key — exposed, not exposed, undetermined.
const STATUS_ORDER: ExposureStatus[] = [
  'exposed-modeled',
  'not-exposed-modeled',
  'undetermined',
];

export default function Legend({ scenario }: LegendProps) {
  return (
    <section
      className="rounded-md border border-slate-700 bg-slate-900/90 p-3 text-xs text-slate-100 shadow-lg backdrop-blur-sm"
      aria-label="Map legend"
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
        Legend
      </h2>

      {scenario ? (
        <>
          {/* Scenario year label (Req 3.4). */}
          <p className="mt-1 font-medium text-slate-100">{scenario.label}</p>

          {/* Flood symbology + units (Req 3.3). */}
          <div className="mt-2 flex items-start gap-2">
            <span
              className="mt-0.5 inline-block h-3.5 w-3.5 flex-none rounded-sm"
              style={{
                backgroundColor: FLOOD_FILL,
                border: `1.5px solid ${FLOOD_OUTLINE}`,
              }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="font-medium">Modeled flood extent</div>
              <div className="text-slate-400">
                Units: {displayUnits(scenario.attribution)}
              </div>
              {/* Data_Category + one-click MC-FRM source (with limitations) for
                  the displayed flood layer (Req 8.2, 8.3, 8.4, 8.5). */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <CategoryTag category={scenario.category} />
                <SourceBadge
                  attribution={scenario.attribution}
                  triggerLabel="MC-FRM source"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        // Present-day baseline: no modeled flood layer. State that plainly
        // rather than drawing a flood swatch that would imply a layer exists.
        <p className="mt-1 font-medium text-slate-300">
          Present day — no modeled flood layer
        </p>
      )}

      {/* Station marker key — explains the markers. In present-day mode the
          markers are neutral (no exposure computed), so the key reflects that
          rather than the exposure color palette. */}
      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
          {scenario ? 'Station exposure' : 'MBTA Blue Line stations'}
        </div>
        {scenario ? (
          <ul className="mt-1 flex flex-col gap-1">
            {STATUS_ORDER.map((status) => (
              <li key={status} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 flex-none rounded-full"
                  style={{ backgroundColor: STATUS_FILL[status] }}
                  aria-hidden
                />
                <span className="text-slate-200">{STATUS_LABEL[status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 flex-none rounded-full"
              style={{ backgroundColor: NEUTRAL_FILL }}
              aria-hidden
            />
            <span className="text-slate-200">
              Stations (select 2050 or 2070 for modeled exposure)
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
