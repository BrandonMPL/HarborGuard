# HarborGuard

AI-powered coastal resilience planning for Boston Harbor neighborhoods, built for Hackachusetts 2026.

HarborGuard shows verified Massachusetts Coast Flood Risk Model (MC-FRM) coastal flood extents for East Boston and the Downtown/Waterfront area under 2050 and 2070 sea-level horizons, computes transit-station flood exposure from verified MBTA coordinates, and generates a source-grounded AI resilience assessment.

## What it does

- Interactive map of Boston Harbor (React-Leaflet + OpenStreetMap tiles).
- Area selector: East Boston, Downtown / Waterfront, or Both.
- Scenario selector: Present day (no modeled flood layer), 2050, or 2070.
- Verified flood extents from MC-FRM (1% annual exceedance probability), served as static GeoJSON.
- Station exposure: verified MBTA station points classified as exposed / not-exposed / undetermined against the selected flood layer, via a Turf.js point-in-polygon test with a 30 m boundary-caution band.
- AI resilience assessment: one server-side OpenAI call per request, grounded strictly on supplied verified data, validated by a no-hallucination guard (no invented numbers; citations only from supplied sources).
- Qualitative comparison of 2-3 adaptation strategies.

## Tech stack

React + TypeScript + Vite + Tailwind CSS + React-Leaflet (frontend); a minimal Node/Express server used only for the secure AI call. No database, no auth.

## Prerequisites

- Node.js 18+ (uses the global fetch API).
- An OpenAI API key (default model: gpt-5-mini).

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Create your local env file from the template and fill in your real key:

   ```
   # macOS/Linux
   cp .env.example .env
   # Windows PowerShell
   Copy-Item .env.example .env
   ```

   Then edit `.env`:

   ```
   AI_API_KEY=your-openai-key-here   # NEVER commit this
   AI_MODEL=gpt-5-mini
   PORT=8787
   ```

3. Download/regenerate the verified map data into `public/data/`:

   ```
   npm run setup:data
   ```

4. Start the app (Vite + Express together):

   ```
   npm run dev
   ```

   Open the URL Vite prints (default http://localhost:5173). Vite proxies `/api` to the Express server on `PORT`.

## Environment variables

All secrets live in `.env`, which is git-ignored and must never be committed. `.env.example` is the committed template with empty values.

| Variable     | Purpose                                                      |
| ------------ | ------------------------------------------------------------ |
| AI_API_KEY   | OpenAI API key. Server-side only; never sent to the browser. |
| AI_MODEL     | Model name (default gpt-5-mini).                             |
| PORT         | Port for the Express API (default 8787).                    |

The key is read only in `server/aiService.ts` and never appears in any client bundle or API response.

## Data

The map data under `public/data/` is not committed (git-ignored) and is regenerated from official public sources by `npm run setup:data`, which writes six files:

- eastboston_flood_2050.geojson, eastboston_flood_2070.geojson
- westboston_flood_2050.geojson, westboston_flood_2070.geojson
- eastboston_mbta_blue_stations.geojson (5 verified Blue Line stations)
- westboston_mbta_stations.geojson (verified waterfront stations)

Sources:

- Flood extents — Massachusetts Coast Flood Risk Model (MC-FRM), 1% annual exceedance probability, 2050 and 2070 FeatureServers, produced by Woods Hole Group for the Commonwealth of Massachusetts (EEA). Geometry is clipped per area and generalized for web display. Not for engineering or regulatory use. The cached geometry is git-ignored pending confirmation of redistribution rights.
- Station coordinates — the official MBTA V3 API (https://api-v3.mbta.com), parent-station points.

Note: the MC-FRM ArcGIS services occasionally return transient 5xx timeouts. `npm run setup:data` retries with backoff; if it still fails, re-run it a moment later.

## What the data represents (important)

- A "1% annual exceedance probability" flood is the "100-year flood": a 1% chance in any given year — not "once per century." Over 30 years the odds of at least one such event are about 1-in-4; over ~70 years, about even.
- The layers model coastal flooding (sea level rise + storm surge), not rainfall flooding.
- 2050 vs 2070 is the same 1% storm against higher projected sea levels, so later horizons flood farther inland.
- The layers show flood extent, not depth.
- Station exposure is a point-location test against a generalized model boundary — not an assessment of station-wide or operational flood risk.

## Scripts

| Command             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| npm run dev         | Run Vite + Express together (dev).                      |
| npm run dev:web     | Vite only.                                              |
| npm run dev:api     | Express API only.                                       |
| npm run build       | Type-check and build the production bundle.             |
| npm run preview     | Preview the production build.                           |
| npm run setup:data | Download/regenerate verified map data into public/data/. |

## Project layout

```
public/data/   verified GeoJSON (git-ignored; via npm run setup:data)
src/
  components/  MapView, FloodLayer, StationLayer, ContextPanel, AssessmentPanel, Legend, ScenarioExplainer, ...
  config/      areas, scenarios, neighborhoods, strategies
  lib/         geojson loader, exposure classification, provenance
  types.ts     shared types (client + server)
server/
  index.ts     Express app + POST /api/assessment
  aiService.ts single OpenAI call (reads AI_API_KEY)
  prompt.ts    grounding system prompt + request serialization
  validate.ts  no-hallucination guard (schema + numeric + citations)
scripts/
  setup-data.mjs  regenerate public/data from MC-FRM + MBTA
```

## License / attribution

Flood data © Commonwealth of Massachusetts (EEA) / Woods Hole Group (MC-FRM). Transit data © MBTA (V3 API). Base map © OpenStreetMap contributors. Hackathon prototype — not for engineering, regulatory, or operational use.
