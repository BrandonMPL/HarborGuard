// scenarios.ts — the two flood scenarios (2050, 2070) HarborGuard offers.
//
// ScenarioConfig now carries only the GENERIC year / label / category plus a
// default (East) flood geojsonUrl + MC-FRM attribution for backward
// compatibility. The ACTUAL per-area flood URL + attribution live on each
// AreaConfig (src/config/areas.ts) and are resolved via resolveFlood(area,
// year), because East and West use different files (task 10.2). We reuse the
// East area's flood attribution here so the default values stay in one place.

import type { ScenarioConfig, ScenarioYear } from '../types';
import { EAST_AREA } from './areas';

export const SCENARIO_2050: ScenarioConfig = {
  year: 2050,
  label: '2050 (1% annual chance coastal flood)',
  category: 'future-model-projection',
  geojsonUrl: EAST_AREA.floodUrls[2050],
  attribution: EAST_AREA.floodAttribution[2050],
};

export const SCENARIO_2070: ScenarioConfig = {
  year: 2070,
  label: '2070 (1% annual chance coastal flood)',
  category: 'future-model-projection',
  geojsonUrl: EAST_AREA.floodUrls[2070],
  attribution: EAST_AREA.floodAttribution[2070],
};

// Ordered list with 2050 first (the default scenario — Requirement 2.3).
export const SCENARIOS: ScenarioConfig[] = [SCENARIO_2050, SCENARIO_2070];

/** Look up a scenario config by year. Throws on an unknown year. */
export function getScenario(year: ScenarioYear): ScenarioConfig {
  const found = SCENARIOS.find((s) => s.year === year);
  if (!found) {
    throw new Error(`Unknown scenario year: ${year}`);
  }
  return found;
}
