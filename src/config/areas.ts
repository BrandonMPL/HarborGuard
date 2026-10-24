// areas.ts — AreaConfig definitions (task 10.2).
//
// Each AreaConfig is a self-contained mappable area that owns its flood layer
// files (per year) AND its station file, so East Boston and the Downtown /
// Waterfront window resolve completely independent flood + station data. This
// decouples the app from the single-East assumption that previously baked the
// flood URL into ScenarioConfig.
//
// All facts here are hard-coded from the verified prepared files under
// public/data/ and the verified reference datasets — nothing is fabricated.
// East reuses the existing East MC-FRM attribution (moved here from
// scenarios.ts); West carries its own MC-FRM attribution matching the clipped
// downtown/waterfront files' embedded metadata (source_service_url /
// retrieved_utc), and HONEST reference stats (see WEST below).

import type { AreaConfig, ScenarioYear, SourceAttribution } from '../types';

// ---------------------------------------------------------------------------
// Shared MC-FRM limitations. The East text already lived in scenarios.ts; the
// West text is identical except the clip window describes downtown/waterfront.
// ---------------------------------------------------------------------------
const MCFRM_UNITS = 'meters (flood extent shown; depth not displayed)';

const EAST_MCFRM_LIMITATIONS: string[] = [
  'Geometry is generalized for web display and is not survey-accurate; not for engineering or regulatory use.',
  '1% annual exceedance probability (the "100-year" flood): a 1% chance of occurring in any given year, not a guarantee or a maximum.',
  'Produced by Woods Hole Group for the Commonwealth of Massachusetts (Executive Office of Energy and Environmental Affairs).',
  'Clipped to an East Boston bounding box used only as a retrieval window — the bbox is NOT the official East Boston neighborhood boundary.',
];

const WEST_MCFRM_LIMITATIONS: string[] = [
  'Geometry is generalized for web display and is not survey-accurate; not for engineering or regulatory use.',
  '1% annual exceedance probability (the "100-year" flood): a 1% chance of occurring in any given year, not a guarantee or a maximum.',
  'Produced by Woods Hole Group for the Commonwealth of Massachusetts (Executive Office of Energy and Environmental Affairs).',
  'Clipped to a downtown/waterfront (mainland Boston) bounding box [-71.065, 42.340, -71.020, 42.372] used only as a retrieval window — the bbox is NOT an official neighborhood boundary.',
];

// ---------------------------------------------------------------------------
// EAST Boston — the P0 baseline. Flood attribution matches scenarios.ts.
// ---------------------------------------------------------------------------
const EAST_FLOOD_ATTRIBUTION: Record<ScenarioYear, SourceAttribution> = {
  2050: {
    sourceName:
      'Massachusetts Coast Flood Risk Model (MC-FRM), 1% annual exceedance probability, 2050 (MA_2050_1Perc_v11)',
    sourceUrl:
      'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/ArcGIS/rest/services/MA_2050_1Perc_v11/FeatureServer/1',
    dataDate: '2026-10-24',
    units: MCFRM_UNITS,
    limitations: EAST_MCFRM_LIMITATIONS,
  },
  2070: {
    sourceName:
      'Massachusetts Coast Flood Risk Model (MC-FRM), 1% annual exceedance probability, 2070 (MCFRM_1pct_2070)',
    sourceUrl:
      'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/MCFRM_1pct_2070/FeatureServer/3',
    dataDate: '2026-10-24',
    units: MCFRM_UNITS,
    limitations: EAST_MCFRM_LIMITATIONS,
  },
};

// Hackachusetts "Boston neighborhood estimates, 2025" dataset, saved 2026-10-18.
const EAST_NEIGHBORHOOD_ATTRIBUTION: SourceAttribution = {
  sourceName: 'Hackachusetts neighborhoods dataset',
  sourceUrl: 'https://data.boston.gov/',
  dataDate: '2026-10-18',
  units: null,
  limitations: [
    'Reference data only; not used for spatial flood exposure.',
    'City of Boston 2025 published neighborhood estimates (ACS-derived), not a new Census tabulation.',
  ],
};

export const EAST_AREA: AreaConfig = {
  id: 'east',
  name: 'East Boston',
  centroid: [42.375, -71.025],
  bounds: [
    [42.355, -71.045],
    [42.4, -70.985],
  ],
  population: 46892,
  landSqMi: 4.851,
  category: 'reference-data',
  attribution: { ...EAST_NEIGHBORHOOD_ATTRIBUTION },
  floodUrls: {
    2050: '/data/eastboston_flood_2050.geojson',
    2070: '/data/eastboston_flood_2070.geojson',
  },
  floodAttribution: EAST_FLOOD_ATTRIBUTION,
  stationsUrl: '/data/eastboston_mbta_blue_stations.geojson',
  stationsLabel: 'MBTA Blue Line',
};

// ---------------------------------------------------------------------------
// WEST — Downtown / Waterfront (mainland Boston).
//
// HONEST reference stats: the mapped bbox spans several neighborhoods (Downtown,
// North End, South Boston Waterfront, etc.), so there is NO single census figure
// for it. Rather than fabricate a combined number, we show the DOWNTOWN row
// (population 15,752; land 0.6473 sq mi) and record in attribution.limitations
// that the mapped waterfront window spans several neighborhoods and the stat
// shown is for Downtown only.
// ---------------------------------------------------------------------------
const WEST_FLOOD_ATTRIBUTION: Record<ScenarioYear, SourceAttribution> = {
  2050: {
    sourceName:
      'MC-FRM 1% Annual Exceedance Probability, 2050 (MA_2050_1Perc_v11) — Downtown/Waterfront subset',
    sourceUrl:
      'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/ArcGIS/rest/services/MA_2050_1Perc_v11/FeatureServer/1',
    dataDate: '2026-10-24',
    units: MCFRM_UNITS,
    limitations: WEST_MCFRM_LIMITATIONS,
  },
  2070: {
    sourceName:
      'MC-FRM 1% Annual Exceedance Probability, 2070 (MCFRM_1pct_2070) — Downtown/Waterfront subset',
    sourceUrl:
      'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/MCFRM_1pct_2070/FeatureServer/3',
    dataDate: '2026-10-24',
    units: MCFRM_UNITS,
    limitations: WEST_MCFRM_LIMITATIONS,
  },
};

const WEST_NEIGHBORHOOD_ATTRIBUTION: SourceAttribution = {
  sourceName: 'Hackachusetts neighborhoods dataset (Downtown row)',
  sourceUrl: 'https://data.boston.gov/',
  dataDate: '2026-10-18',
  units: null,
  limitations: [
    'Reference data only; not used for spatial flood exposure.',
    'City of Boston 2025 published neighborhood estimates (ACS-derived), not a new Census tabulation.',
    'The mapped downtown/waterfront window spans several neighborhoods (Downtown, North End, South Boston Waterfront, and others). The population/land shown is for the Downtown neighborhood ONLY and is NOT a combined total for the mapped area.',
  ],
};

export const WEST_AREA: AreaConfig = {
  id: 'west',
  name: 'Downtown / Waterfront',
  centroid: [42.356, -71.045],
  // [[southLat, westLon], [northLat, eastLon]] — matches the clip bbox
  // [-71.065, 42.340, -71.020, 42.372] (minLon, minLat, maxLon, maxLat).
  bounds: [
    [42.34, -71.065],
    [42.372, -71.02],
  ],
  // HONEST: Downtown neighborhood stats only (not a combined figure) — see note.
  population: 15752,
  landSqMi: 0.6473,
  category: 'reference-data',
  attribution: { ...WEST_NEIGHBORHOOD_ATTRIBUTION },
  floodUrls: {
    2050: '/data/westboston_flood_2050.geojson',
    2070: '/data/westboston_flood_2070.geojson',
  },
  floodAttribution: WEST_FLOOD_ATTRIBUTION,
  stationsUrl: '/data/westboston_mbta_stations.geojson',
  stationsLabel: 'MBTA (Orange/Red/Silver/Blue)',
};

// Config-driven list; adding entries here surfaces them in the selector.
export const AREAS: AreaConfig[] = [EAST_AREA, WEST_AREA];

export const DEFAULT_AREA = EAST_AREA;

/** Resolve an area's flood geojson URL + MC-FRM attribution for a given year. */
export function resolveFlood(
  area: AreaConfig,
  year: ScenarioYear,
): { url: string; attribution: SourceAttribution } {
  return { url: area.floodUrls[year], attribution: area.floodAttribution[year] };
}

/** Look up an AreaConfig by id. */
export function getArea(id: string): AreaConfig | undefined {
  return AREAS.find((a) => a.id === id);
}

/**
 * Resolve an AreaSelection to the active areas. 'both' returns East + West;
 * a single id returns just that area.
 */
export function areasForSelection(
  selection: 'east' | 'west' | 'both',
): AreaConfig[] {
  if (selection === 'both') return [EAST_AREA, WEST_AREA];
  if (selection === 'west') return [WEST_AREA];
  return [EAST_AREA];
}
