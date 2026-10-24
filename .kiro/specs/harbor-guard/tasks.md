# Implementation Plan: HarborGuard

## Overview

Build a demo-ready East Boston coastal resilience app in the remaining ~2-3 hours. The stack is React + TypeScript + Vite + Tailwind + React-Leaflet with a single lightweight Express endpoint for secure AI access. All flood/station geometry is already verified and prepared under `data/processed/`; tasks copy those into `public/data/` and consume them as static assets. The plan front-loads the P0 critical path (scaffold → map → scenarios → exposure → labeling/provenance → AI endpoint → AI UI → end-to-end checkpoint) so a working East Boston flow exists as early as possible. P1 and P2 sub-tasks are marked optional (`*`) so they never block the P0 demo.

Exposure classification is computed at runtime from the verified coordinates and the actual GeoJSON; the previously verified classifications are used only as regression expectations, never hardcoded as outputs.

## Tasks

- [x] 1. Scaffold project, tooling, and prepared data (P0)
  - [x] 1.1 Initialize Vite + React + TS app and Tailwind
    - Create `index.html`, `package.json`, `vite.config.ts`, `tailwind.config.js`, `src/main.tsx`, `src/App.tsx`, `src/index.css` (tailwind directives)
    - Add deps: `react`, `react-dom`, `leaflet`, `react-leaflet`, `@turf/helpers`, `@turf/boolean-point-in-polygon`, `@turf/nearest-point-on-line`, `@turf/distance`, `openai`; dev deps: `vite`, `typescript`, `tailwindcss`, `express`, `concurrently`
    - Add `src/types.ts` with `ScenarioYear`, `DataCategory`, `SourceAttribution`, `ScenarioConfig`, `ExposureStatus`, `StationExposure`
    - Completion: `npm run dev` compiles and a placeholder App renders
    - _Requirements: 9.1, 9.3_
  - [x] 1.2 Add minimal Express server and Vite dev proxy
    - Create `server/index.ts` with an Express app and a health route; add an `npm run dev` that launches Vite and Express together via `concurrently`
    - Configure `vite.config.ts` `server.proxy['/api'] -> http://localhost:8787`
    - Completion: hitting `/api` in dev reaches Express through the Vite proxy
    - _Requirements: 9.2, 9.8_
  - [x] 1.3 Create env scaffolding and gitignore rules, copy prepared GeoJSON
    - Create `.env.example` with `AI_API_KEY=`, `AI_MODEL=`, `PORT=8787`; ensure `.env` is in `.gitignore`
    - Add `public/data/*.geojson` (cached MC-FRM-derived files) to `.gitignore` and add a comment noting this is a DEPLOYMENT DEPENDENCY: keep `public/data/` locally for the demo but do not commit cached MC-FRM geometry until redistribution rights are confirmed
    - Copy `data/processed/eastboston_flood_2050.geojson`, `eastboston_flood_2070.geojson`, and `eastboston_mbta_blue_stations.geojson` into `public/data/`
    - Completion: three GeoJSON files exist under `public/data/`; `.env` and `public/data/*.geojson` are gitignored
    - _Requirements: 8.8, 8.9, 9.3, 9.7, 10.2_

- [x] 2. East Boston interactive map (P0)
  - [x] 2.1 Build `MapView` with base tiles, attribution, and East Boston framing
    - Create `src/components/MapView.tsx` using react-leaflet; center/zoom to contain the East Boston neighborhood boundary (Req 2.4) with a bounded min/max zoom
    - Render base tiles with persistent tile `Source_Attribution` visible in all pan/zoom states
    - Add `src/config/neighborhoods.ts` with East Boston centroid/bounds and reference stats (population 46,892, land 4.851 sq mi) tagged `reference-data`
    - Completion: map loads centered on East Boston, pan/zoom work, tile attribution always visible
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.4_
  - [x] 2.2 Add base-map loading and error states
    - Create `src/components/LoadingState.tsx` and `src/components/ErrorState.tsx`
    - Show a base-map loading indicator until tiles render; on tile failure show "base map unavailable" + a retry control while keeping pan/zoom interactive
    - Completion: loading indicator appears then clears; simulated tile failure shows message + working retry
    - _Requirements: 1.5, 1.6, 1.7_

- [x] 3. Flood layer loading and scenario switching (P0)
  - [x] 3.1 Implement static GeoJSON loader
    - Create `src/lib/geojson.ts` to fetch and cache the three `public/data/*.geojson` files
    - Add `src/config/scenarios.ts` with 2050/2070 metadata: label, `geojsonUrl`, `future-model-projection` category, and MC-FRM `SourceAttribution` (source name, service URL, data date, units, limitations)
    - Completion: loader returns parsed GeoJSON and caches it; scenario config exposes both scenarios
    - _Requirements: 3.1, 3.2, 8.1_
  - [x] 3.2 Render selected `Flood_Layer` and wire `ScenarioSelector`
    - Create `src/components/ScenarioSelector.tsx` (exactly 2050 and 2070, default 2050) and `src/components/NeighborhoodSelector.tsx` (East Boston; others config-driven, P2)
    - In `App.tsx` hold `scenario`/`neighborhood` selection state; on scenario change remove the previous flood layer, show a flood-layer loading indicator, and draw the new layer
    - Handle unavailable/empty flood data ("flood data unavailable", draw no symbology) and load failure (keep current view, "flood layer failed to load" + retry)
    - Completion: switching 2050↔2070 swaps the layer with a loading indicator; default is 2050
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 2.7, 3.7_

- [x] 4. Station markers and exposure analysis (P0)
  - [x] 4.1 Implement runtime exposure classification in `lib/exposure.ts`
    - Create `src/lib/exposure.ts` computing, for each station point vs the selected year's flood MultiPolygon: `booleanPointInPolygon`, and `minEdgeDistanceM` as the minimum nearest-edge distance across every ring (outer + holes) of every polygon
    - Classify: `minEdgeDistanceM < 30` → `undetermined` (boundary caution first); else inside → `exposed-modeled`; else → `not-exposed-modeled`. Return `StationExposure` with `category: 'derived-analysis'`, `sources` (station + flood layer), and `method`
    - COMPUTE from verified coordinates + actual GeoJSON at runtime — do NOT hardcode results
    - Completion: given the loaded GeoJSON, function returns one status per station with a numeric edge distance
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [ ]* 4.2 Write property test for exposure classification
    - **Property 1: Exposure classification is total and boundary-consistent** (library: `fast-check`, ≥100 iterations)
    - **Validates: Requirements 4.3, 4.4**
  - [ ]* 4.3 Write property test for caution-band correctness
    - **Property 2: Exposure never fabricates exposure outside the caution band**
    - **Validates: Requirements 4.3, 4.4**
  - [ ]* 4.4 Write exposure regression check against verified expectations
    - Assert the 5 stations classify as documented in the design reference table for 2050 and 2070 (regression expectations only, not hardcoded outputs)
    - _Requirements: 4.3, 4.4_
  - [x] 4.5 Render station markers and mandatory disclaimer
    - Draw the 5 verified station markers color-coded by status; recompute on scenario change
    - Render the mandatory disclaimer next to results: point-location test against a generalized model boundary, not a station-wide or operational flood-risk assessment
    - In `ContextPanel`, show exposure results with dataset references and intersection method; for undetermined/un-intersected features show status "undetermined" and never describe them as flooded
    - Completion: markers reflect computed status; undetermined state visible; disclaimer rendered
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 5. Provenance, legend, and Data_Category labeling (P0)
  - [x] 5.1 Add provenance helpers and `Legend`
    - Create `src/lib/provenance.ts` (attribution + `Data_Category` helpers; "unavailable" indicator for any missing attribution field) and `src/components/Legend.tsx` (flood symbology + flood depth units + scenario year label)
    - Completion: legend shows symbology, units, and the selected scenario year
    - _Requirements: 3.3, 3.4, 8.6_
  - [x] 5.2 Add `SourceBadge` (one-click `Source_Attribution` reveal)
    - Create `src/components/SourceBadge.tsx` revealing MC-FRM `Source_Attribution` (source name, service URL, data date) in one interaction; show "unavailable" per missing field
    - Completion: MC-FRM attribution revealed in one interaction; missing fields show an unavailable indicator
    - _Requirements: 3.5, 3.6, 8.3, 8.4_
  - [x] 5.3 Add `CategoryTag` for the five `Data_Category` labels
    - Create `src/components/CategoryTag.tsx` rendering exactly one of the five `Data_Category` labels; withhold any value lacking a category and show "undetermined"
    - Completion: each category tag renders the correct label; uncategorized values are withheld with an undetermined indicator
    - _Requirements: 3.8, 8.2, 8.7_
  - [x] 5.4 Wire labels, attribution, and limitations across displayed values
    - Attach `CategoryTag` + `SourceBadge` wherever a value shows (flood layer, exposure results, neighborhood stats); display recorded MC-FRM limitations alongside attribution
    - Completion: every displayed value carries a category label and one-click source; MC-FRM limitations visible
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 10.2_

- [x] 6. Secure AI assessment endpoint (P0)
  - [x] 6.1 Build prompt and request/response types
    - Create `server/prompt.ts` with a strict grounding system prompt (exact JSON schema; use only supplied structured data; never invent flood depths, population counts, costs, or effectiveness percentages; cite only supplied sources; 1-5 strategies) and serialize the `AssessmentRequest`
    - Add `AssessmentRequest`, `AdaptationStrategyOption`, `ResilienceAssessment` types and `src/config/strategies.ts` (curated, source-grounded strategy options)
    - Completion: prompt builder produces a system prompt + serialized verified payload
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [x] 6.2 Implement `aiService.ts` single-call seam and `/api/assessment` route
    - Create `server/aiService.ts` exposing `generateAssessment(input): Promise<ResilienceAssessment>` that uses the OpenAI API via the official `openai` Node SDK, reading `AI_API_KEY` and `AI_MODEL` (default/example `gpt-5-mini`) from env server-side (never client-side), makes exactly one call per request, requests a JSON-structured response (e.g., `response_format` JSON / JSON mode) so `validate.ts` can parse it, and returns parsed JSON
    - Add `POST /api/assessment` in `server/index.ts` returning `200` with the assessment or `4xx/5xx` with `{ error, fallbackMessage }`; ensure no credential appears in any response
    - Completion: endpoint calls OpenAI (gpt-5-mini) when credentials are present and returns a validated assessment; when the key is missing or the call fails, it returns a clean `{ error, fallbackMessage }` without crashing
    - _Requirements: 5.1, 5.2, 5.6, 5.8, 5.9, 9.7_
  - [x] 6.3 Implement no-hallucination validation in `validate.ts`
    - Create `server/validate.ts`: schema validation (all five sections present, 1-5 strategies), numeric-claim guard (every numeric token traceable to supplied inputs), and citation check (every citation maps to a supplied `SourceAttribution`); on failure return the fallback
    - Completion: invalid/untraceable responses are rejected to fallback; valid ones pass
    - _Requirements: 5.1, 5.3, 5.5, 5.8_
  - [ ]* 6.4 Write property test for numeric-claim guard
    - **Property 3: Validated assessments contain no untraceable numbers**
    - **Validates: Requirements 5.3**
  - [ ]* 6.5 Write property test for citation grounding
    - **Property 4: Citations reference only supplied sources**
    - **Validates: Requirements 5.2, 5.5**
  - [ ]* 6.6 Write mocked endpoint integration test
    - With a mocked AI client, assert exactly one call per request, fallback on invalid JSON, and that no credential appears in the response
    - _Requirements: 5.6, 5.8, 5.9_

- [x] 7. AI assessment UI (P0)
  - [x] 7.1 Build `AssessmentPanel` and wire the Generate flow
    - Create `src/components/AssessmentPanel.tsx` with a Generate button that POSTs the verified structured payload (scenario metadata, the 5 exposure results, East Boston reference stats, curated strategy options) to `/api/assessment`
    - Show a loading indicator while in progress; render the five-section result on success; label the result as an AI-generated recommendation `Data_Category`
    - On failure show a non-destructive message + retry, leaving map and exposure untouched; disable/ignore duplicate in-flight requests for the same selection
    - Completion: Generate produces a grounded, AI-labeled assessment; retry works; duplicate requests ignored while in flight
    - _Requirements: 5.1, 5.4, 5.5, 5.7, 5.8, 5.10_

- [x] 8. P0 acceptance checkpoint (P0)
  - End-to-end manual verification of the East Boston flow: open map → switch 2050/2070 → see exposure including the undetermined state → view attribution/limitations/category labels → generate assessment → see a grounded, AI-labeled result. Ensure the flow runs independently of any P1/P2 feature and the app is reachable within 60 seconds from `npm run dev`. Ensure all written tests pass; fix any blockers; ask the user if questions arise.
  - _Requirements: 2.8, 9.8_

- [x] 9. P1 enhancements (optional, only after P0 works)
  - [x]* 9.1 Responsive layout polish
    - Side-by-side `MapView` + `ContextPanel` at ≥1024px; stacked <768px with all controls reachable without horizontal scroll; no overflow 768-1024px
    - _Requirements: 9.4, 9.5, 9.6_
  - [ ]* 9.2 Richer `ContextPanel` with reference context and missing-data handling
    - Show East Boston neighborhood reference stats; show hospitals/EJ as reference/context ONLY (no spatial exposure; do not attribute municipality-level EJ to East Boston); if a referenced dataset is unavailable, name the missing dataset and keep remaining values
    - _Requirements: 4.1, 4.6, 4.7, 8.9_
  - [x]* 9.3 Qualitative `StrategyComparison`
    - Create `src/components/StrategyComparison.tsx`: compare 2-3 strategies side by side across feasibility, community benefits, ecosystem benefits, uncertainties; descriptive text only (no invented numbers); require 2-3 selections else show a message; show not-available indicator for empty cells; label AI content
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. P2 stretch (optional, must not block P0)
  - [ ]* 10.1 Downloadable `Resilience_Briefing`
    - Generate a self-contained briefing (HTML/Markdown/printable) with neighborhood, scenario, ≤500-word assessment summary, and `Source_Attribution` per item; label AI content; block the request with a message until an assessment exists for the current selection
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x]* 10.2 Additional config-driven neighborhoods
    - Allow additional neighborhoods via `config/neighborhoods.ts` as `Neighborhood_Selector` options without affecting the East Boston P0 baseline
    - _Requirements: 2.9_
  - [ ]* 10.3 Evidence-review second pass behind the existing seam
    - Add a review pass inside `generateAssessment` (generate → review claims against supplied evidence → return) without changing the `/api/assessment` client contract or weakening the no-hallucination guards
    - _Requirements: 5.11_

## Notes

- Tasks marked with `*` are optional (P1/P2 or tests) and can be skipped to protect the P0 demo timeline.
- Exposure is computed at runtime from verified coordinates + actual GeoJSON; the design's reference table is a regression expectation only, never a hardcoded output.
- Deployment dependency: keep `public/data/` locally for the demo but do not commit cached MC-FRM geometry until redistribution rights are confirmed (`public/data/*.geojson` is gitignored in task 1.3).
- AI provider is OpenAI (gpt-5-mini) via the server-side `openai` SDK; key in gitignored `.env`.
- AI credentials stay server-side in a gitignored `.env`; no credential is ever shipped to the browser or included in any response.
- Test touch is intentionally light: property tests map to the design's correctness properties, plus a small exposure regression check and one mocked endpoint test. No heavy suite that would block the demo.
- Long-running processes (`vite`, `node server`, `npm run dev`) are started manually in a terminal by the developer.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "6.1"] },
    { "id": 3, "tasks": ["2.2", "3.1", "6.2"] },
    { "id": 4, "tasks": ["3.2", "6.3"] },
    { "id": 5, "tasks": ["4.1", "6.4", "6.5", "6.6"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.4", "4.5"] },
    { "id": 7, "tasks": ["5.1"] },
    { "id": 8, "tasks": ["5.2", "5.3"] },
    { "id": 9, "tasks": ["5.4"] },
    { "id": 10, "tasks": ["7.1"] },
    { "id": 11, "tasks": ["9.1", "9.2", "9.3", "10.1", "10.2", "10.3"] }
  ]
}
```
