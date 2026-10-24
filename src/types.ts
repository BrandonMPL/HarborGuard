// types.ts — shared interfaces for HarborGuard (see design.md)

export type ScenarioYear = 2050 | 2070;

// A UI-level selection that also allows a "present day" baseline with NO
// modeled flood layer. Flood scenarios themselves stay 2050/2070 (ScenarioYear);
// 'current' means "no active flood scenario" — the map shows base tiles and
// neutral station markers only, and no exposure is computed or implied.
export type ScenarioSelection = 'current' | ScenarioYear;

export type DataCategory =
  | 'historical-observation'
  | 'future-model-projection'
  | 'reference-data'
  | 'derived-analysis'
  | 'ai-recommendation';

export interface SourceAttribution {
  sourceName: string | null;
  sourceUrl: string | null;
  dataDate: string | null; // retrieved_utc / publication date
  units?: string | null;
  limitations?: string[];
}

// Leaflet lat/lon tuple and bounding box (south-west, north-east corners)
export type LatLon = [number, number];
export type LatLonBounds = [LatLon, LatLon];

export interface NeighborhoodConfig {
  id: string;
  name: string;
  centroid: LatLon; // [lat, lon]
  bounds: LatLonBounds; // [[southLat, westLon], [northLat, eastLon]]
  population: number;
  landSqMi: number;
  category: 'reference-data';
  attribution: SourceAttribution;
}

// ---------------------------------------------------------------------------
// Areas (task 10.2). An AreaConfig is a single mappable area that carries its
// OWN flood layer files (per year) and its OWN station file, so East Boston and
// the Downtown/Waterfront window no longer share one hardcoded flood/station
// source. The flood geojson URL + MC-FRM attribution now live on the area, not
// on ScenarioConfig — ScenarioConfig keeps only the generic year/label/category.
// ---------------------------------------------------------------------------

// Extends NeighborhoodConfig (same reference-stat fields) with the per-area
// flood + station data needed to render and compute exposure independently.
export interface AreaConfig extends NeighborhoodConfig {
  /** Per-scenario-year flood geojson URL for THIS area. */
  floodUrls: Record<ScenarioYear, string>;
  /** Per-scenario-year MC-FRM attribution for THIS area's flood layer. */
  floodAttribution: Record<ScenarioYear, SourceAttribution>;
  /** This area's station points geojson URL. */
  stationsUrl: string;
  /** Short label for the station set (e.g. "MBTA Blue Line"). */
  stationsLabel?: string;
}

// UI-level area selection. 'both' renders East + West together.
export type AreaSelection = 'east' | 'west' | 'both';

export interface ScenarioConfig {
  year: ScenarioYear;
  label: string; // e.g. "2050 (1% annual chance)"
  category: 'future-model-projection';
  // Generic year label/category only. The ACTUAL flood geojson URL + MC-FRM
  // attribution now live on each AreaConfig (East and West differ), resolved
  // per-area via resolveFlood(area, year). These two fields remain as the
  // default/East values so existing single-area imports keep working.
  geojsonUrl: string; // /data/eastboston_flood_2050.geojson (default/East)
  attribution: SourceAttribution; // MC-FRM name, service URL, date, units, limitations (default/East)
}

export type ExposureStatus =
  | 'exposed-modeled'
  | 'not-exposed-modeled'
  | 'undetermined';

export interface StationExposure {
  stationId: string; // place-mvbcl etc.
  name: string;
  status: ExposureStatus;
  insidePolygon: boolean;
  minEdgeDistanceM: number; // meters to nearest flood boundary
  category: 'derived-analysis';
  sources: SourceAttribution[]; // station source + flood layer source
  method: string; // "booleanPointInPolygon + nearest-edge distance, 30m caution"
}
// ---------------------------------------------------------------------------
// AI Resilience Assessment contract (see design.md "AI Design").
// Shared single source of truth: the client posts an AssessmentRequest to
// POST /api/assessment; the server returns a validated ResilienceAssessment.
// The server imports these same types from here so request/response shapes
// never drift between browser and Node.
// ---------------------------------------------------------------------------

// A curated, source-grounded adaptation option supplied to the model. The model
// may only draw strategies from the supplied options (no invented interventions).
export interface AdaptationStrategyOption {
  name: string;
  summary: string; // concise qualitative description — no numbers/costs/percentages
  sourceAttribution: SourceAttribution;
}

// Verified structured data posted to the AI service for the current selection.
// Everything the model is allowed to use lives here (Requirement 5.2).
export interface AssessmentRequest {
  scenario: {
    year: ScenarioYear;
    label: string;
    attribution: SourceAttribution;
  };
  stationExposures: StationExposure[]; // the 5 verified exposure results
  neighborhood: {
    name: string;
    population: number;
    landSqMi: number;
    category: 'reference-data';
    attribution: SourceAttribution;
  };
  strategyOptions: AdaptationStrategyOption[]; // curated, source-grounded
}

// Validated AI output. All five sections are required; strategies are bounded
// 1..5 (Requirement 5.1). Citations reference only supplied sources (5.5).
export interface ResilienceAssessment {
  riskExplanation: string;
  adaptationStrategies: Array<{
    name: string;
    description: string;
    feasibility: string;
    communityBenefits: string;
    ecosystemBenefits: string;
    uncertainties: string;
  }>;
  ecologicalTradeoffs: string;
  limitations: string;
  citations: Array<{ label: string; sourceUrl: string | null }>;
  category: 'ai-recommendation';
}
