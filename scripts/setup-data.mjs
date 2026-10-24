// scripts/setup-data.mjs â€” regenerate all verified GeoJSON under public/data/
// from official sources, so a fresh clone works without committing the data.
//
// Produces:
//   public/data/eastboston_flood_2050.geojson
//   public/data/eastboston_flood_2070.geojson
//   public/data/eastboston_mbta_blue_stations.geojson
//   public/data/westboston_flood_2050.geojson
//   public/data/westboston_flood_2070.geojson
//   public/data/westboston_mbta_stations.geojson
//
// Sources (official, public):
//   - Flood extents: Massachusetts Coast Flood Risk Model (MC-FRM) 1% AEP
//     FeatureServers (Commonwealth of Massachusetts / Woods Hole Group).
//   - Stations: MBTA V3 API (https://api-v3.mbta.com).
//
// Run from the repo root: `npm run setup:data` (after `npm install`, which also
// installs this script's deps via the root package). Requires Node 18+ (global
// fetch). No API key needed â€” these are public endpoints.

import bboxClip from '@turf/bbox-clip';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const clip = bboxClip.default || bboxClip;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'data');
mkdirSync(OUT, { recursive: true });

const RETRIEVED = new Date().toISOString();

// Transient 5xx / network errors from the public ArcGIS + MBTA endpoints are
// common. Retry a few times with linear backoff before giving up so a fresh
// clone's one-shot setup is not derailed by a momentary 502/503/504.
async function fetchWithRetry(url, { tries = 4, baseDelayMs = 1500, label = 'request' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      // Retry on gateway/5xx; fail fast on genuine 4xx (bad request etc.).
      if (res.status >= 500 && attempt < tries) {
        lastErr = new Error(`${label} HTTP ${res.status}`);
      } else {
        const body = await res.text().catch(() => '');
        throw new Error(`${label} HTTP ${res.status}: ${body.slice(0, 160)}`);
      }
    } catch (e) {
      lastErr = e;
      if (attempt >= tries) break;
    }
    const delay = baseDelayMs * attempt;
    console.log(`  ...${label} attempt ${attempt} failed, retrying in ${Math.round(delay / 1000)}s`);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastErr ?? new Error(`${label} failed`);
}

const FLOOD_SERVICES = {
  2050: {
    query:
      'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/ArcGIS/rest/services/MA_2050_1Perc_v11/FeatureServer/1/query',
    service:
      'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/ArcGIS/rest/services/MA_2050_1Perc_v11/FeatureServer/1',
    name: 'Massachusetts Coast Flood Risk Model (MC-FRM), 1% annual exceedance probability, 2050 (MA_2050_1Perc_v11)',
    originalSr: 'EPSG:26986 (NAD83 / Massachusetts Mainland)',
  },
  2070: {
    query:
      'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/MCFRM_1pct_2070/FeatureServer/3/query',
    service:
      'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/MCFRM_1pct_2070/FeatureServer/3',
    name: 'Massachusetts Coast Flood Risk Model (MC-FRM), 1% annual exceedance probability, 2070 (MCFRM_1pct_2070)',
    originalSr: 'EPSG:3857 (Web Mercator)',
  },
};

// [minLon, minLat, maxLon, maxLat]
const AREAS = {
  east: {
    label: 'East Boston',
    bbox: [-71.045, 42.355, -70.985, 42.4],
    floodPrefix: 'eastboston_flood',
  },
  west: {
    label: 'Downtown / Waterfront',
    bbox: [-71.065, 42.34, -71.02, 42.372],
    floodPrefix: 'westboston_flood',
  },
};

function coordsInRange(geom) {
  let ok = true;
  const walk = (a) => {
    if (typeof a[0] === 'number') {
      const [x, y] = a;
      if (x < -72 || x > -70 || y < 42 || y > 43) ok = false;
      return;
    }
    a.forEach(walk);
  };
  if (geom && geom.coordinates) walk(geom.coordinates);
  return ok;
}

async function fetchFlood(areaKey, year) {
  const area = AREAS[areaKey];
  const svc = FLOOD_SERVICES[year];
  const bbox = area.bbox;
  const params = new URLSearchParams({
    where: '1=1',
    geometry: bbox.join(','),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'true',
    geometryPrecision: '6',
    maxAllowableOffset: '0.00005',
    outSR: '4326',
    f: 'geojson',
  });
  const res = await fetchWithRetry(`${svc.query}?${params.toString()}`, { label: `${areaKey} ${year} flood` });
  const text = await res.text();
  const fc = JSON.parse(text);
  if (fc.error) throw new Error(`${areaKey} ${year} flood ArcGIS error: ${JSON.stringify(fc.error)}`);

  const clipped = [];
  for (const f of fc.features || []) {
    try {
      const c = clip(f, bbox);
      if (c.geometry && c.geometry.coordinates && c.geometry.coordinates.length) {
        clipped.push({
          type: 'Feature',
          properties: {
            scenario_year: year,
            flood_probability: '1% annual exceedance probability (100-year)',
            Id: f.properties?.Id ?? f.properties?.ID ?? null,
            gridcode: f.properties?.gridcode ?? null,
          },
          geometry: c.geometry,
        });
      }
    } catch {
      /* skip bad clip */
    }
  }
  const rangeOk = clipped.every((f) => coordsInRange(f.geometry));
  if (!rangeOk) throw new Error(`${areaKey} ${year} flood: clipped coords out of expected range`);

  const out = {
    type: 'FeatureCollection',
    name: `MC-FRM ${year} 1% AEP - ${area.label} subset`,
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    metadata: {
      source_name: svc.name,
      source_service_url: svc.service,
      publisher: 'Commonwealth of Massachusetts (EEA) / data by Woods Hole Group',
      model: 'Massachusetts Coast Flood Risk Model (MC-FRM)',
      scenario_year: year,
      flood_probability: '1% annual exceedance probability (100-year flood)',
      original_spatial_reference: svc.originalSr,
      output_spatial_reference: 'EPSG:4326 (WGS84)',
      clip_bbox_wgs84: bbox,
      retrieved_utc: RETRIEVED,
      generalization_maxAllowableOffset_deg: 0.00005,
      note: `Clipped to a ${area.label} bounding box from the official MC-FRM FeatureServer. Geometry generalized server-side for web display. Not for engineering/regulatory use. The bbox is a retrieval window, not an official neighborhood boundary.`,
    },
    features: clipped,
  };
  const file = join(OUT, `${area.floodPrefix}_${year}.geojson`);
  writeFileSync(file, JSON.stringify(out));
  return { file, features: clipped.length };
}

async function fetchStops(route) {
  const url = `https://api-v3.mbta.com/stops?filter[route]=${encodeURIComponent(route)}&include=parent_station`;
  const res = await fetchWithRetry(url, { label: `MBTA ${route}` });
  const json = await res.json();
  return json.data || [];
}

function stationFeature(stop, route) {
  const a = stop.attributes || {};
  return {
    type: 'Feature',
    properties: {
      station_id: stop.id,
      name: a.name,
      routes: [route],
      source_url: `https://api-v3.mbta.com/stops?filter[route]=${encodeURIComponent(route)}&include=parent_station`,
      retrieved_utc: RETRIEVED,
    },
    geometry: { type: 'Point', coordinates: [a.longitude, a.latitude] },
  };
}

function inBbox(lon, lat, bbox) {
  return lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

// The 5 verified East Boston Blue Line stations (the set the app was built and
// sanity-checked against). We restrict to these explicit ids so the bbox edge
// (which also catches Beachmont, just over the line in Revere) can never change
// the verified set. Order-independent; sorted below.
const EAST_STATION_IDS = new Set([
  'place-mvbcl', // Maverick
  'place-aport', // Airport
  'place-wimnl', // Wood Island
  'place-orhte', // Orient Heights
  'place-sdmnl', // Suffolk Downs
]);

// East Boston: the 5 verified Blue Line stations (explicit allow-list).
async function buildEastStations() {
  const stops = await fetchStops('Blue');
  const bbox = AREAS.east.bbox;
  const features = [];
  for (const s of stops) {
    const a = s.attributes || {};
    if (a.location_type !== 1) continue;
    if (typeof a.longitude !== 'number' || typeof a.latitude !== 'number') continue;
    if (!EAST_STATION_IDS.has(s.id)) continue; // verified set only (not raw bbox)
    if (!inBbox(a.longitude, a.latitude, bbox)) continue;
    features.push(stationFeature(s, 'Blue'));
  }
  features.sort((x, y) => x.properties.name.localeCompare(y.properties.name));
  const out = {
    type: 'FeatureCollection',
    name: 'MBTA Blue Line stations - East Boston (verified)',
    metadata: {
      source_name: 'MBTA V3 API (parent stations, Blue Line)',
      source_url: 'https://api-v3.mbta.com/stops?filter[route]=Blue&include=parent_station',
      retrieved_utc: RETRIEVED,
      coordinate_reference: 'EPSG:4326 (WGS84)',
      clip_bbox_wgs84: bbox,
      note: 'Parent-station point coordinates from the official MBTA V3 API, filtered to an East Boston bounding box. Point location only; not a footprint.',
    },
    features,
  };
  const file = join(OUT, 'eastboston_mbta_blue_stations.geojson');
  writeFileSync(file, JSON.stringify(out, null, 2));
  return { file, features: features.length };
}

// Downtown/Waterfront: Orange/Red/Silver/Blue parent stations in the West bbox.
async function buildWestStations() {
  const bbox = AREAS.west.bbox;
  const routes = [
    ['Orange', 'Orange'],
    ['Red', 'Red'],
    ['741', 'Silver Line SL1 (741)'],
    ['Blue', 'Blue'],
  ];
  const seen = new Map();
  for (const [routeId, routeLabel] of routes) {
    let stops = [];
    try { stops = await fetchStops(routeId); } catch { continue; }
    for (const s of stops) {
      const a = s.attributes || {};
      if (a.location_type !== 1) continue;
      if (typeof a.longitude !== 'number' || typeof a.latitude !== 'number') continue;
      if (!inBbox(a.longitude, a.latitude, bbox)) continue;
      if (EAST_STATION_IDS.has(s.id)) continue; // avoid duplicating an East station on 'Both'
      if (seen.has(s.id)) {
        const f = seen.get(s.id);
        if (!f.properties.routes.includes(routeLabel)) f.properties.routes.push(routeLabel);
        continue;
      }
      seen.set(s.id, stationFeature(s, routeLabel));
    }
  }
  const features = Array.from(seen.values()).sort((x, y) =>
    x.properties.name.localeCompare(y.properties.name));
  const out = {
    type: 'FeatureCollection',
    name: 'MBTA stations - Downtown/Waterfront (verified)',
    metadata: {
      source_name: 'MBTA V3 API (parent stations; Orange, Red, Silver, Blue lines)',
      source_url: 'https://api-v3.mbta.com/stops',
      retrieved_utc: RETRIEVED,
      coordinate_reference: 'EPSG:4326 (WGS84)',
      clip_bbox_wgs84: bbox,
      note: 'Parent-station point coordinates from the official MBTA V3 API, filtered to a downtown/waterfront bounding box. Point location only; not a footprint. The bbox is a retrieval window, not an official neighborhood boundary.',
    },
    features,
  };
  const file = join(OUT, 'westboston_mbta_stations.geojson');
  writeFileSync(file, JSON.stringify(out, null, 2));
  return { file, features: features.length };
}

async function main() {
  console.log('HarborGuard data setup -> public/data/');
  for (const areaKey of ['east', 'west']) {
    for (const year of [2050, 2070]) {
      const r = await fetchFlood(areaKey, year);
      console.log(`  flood ${areaKey} ${year}: ${r.features} feature(s)`);
    }
  }
  const east = await buildEastStations();
  console.log(`  stations east: ${east.features}`);
  const west = await buildWestStations();
  console.log(`  stations west: ${west.features}`);
  console.log('Done. public/data/ is ready.');
}

main().catch((e) => {
  console.error('Data setup FAILED:', e.message || e);
  process.exit(1);
});