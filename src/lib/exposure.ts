// exposure.ts — Exposure_Analysis: pure, framework-agnostic runtime classification
// of each MBTA Blue Line station against the selected year's flood MultiPolygon.
//
// This file is intentionally free of React and of any hardcoded result table:
// classifications are COMPUTED from the actual loaded GeoJSON at runtime (see
// design.md "Exposure Classification Algorithm"). The design's reference table
// is only a regression expectation (tasks 4.2–4.4), never an output.
//
// For each station point against the flood FeatureCollection's polygon features:
//   1. insidePolygon = booleanPointInPolygon(point, feature) for ANY polygon
//      feature in the collection.
//   2. minEdgeDistanceM = minimum distance (meters) from the point to the
//      nearest polygon edge, iterating every ring (outer + holes) of every
//      polygon in every (Multi)Polygon feature. A lineString is built per ring
//      and @turf/nearest-point-on-line gives the snap distance.
//   3. Classification with boundary caution FIRST:
//        minEdgeDistanceM < 30  -> 'undetermined'
//        else inside            -> 'exposed-modeled'
//        else                   -> 'not-exposed-modeled'
//
// Rationale: the prepared flood geometry is server-side generalized for web
// display and is not survey-accurate, so a 30 m band around the modeled
// boundary is treated as too uncertain to call (Requirements 4.3, 4.4).

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import { lineString } from '@turf/helpers';
import type {
  Feature,
  FeatureCollection,
  Point,
  Polygon,
  MultiPolygon,
  Position,
} from 'geojson';
import type {
  ExposureStatus,
  SourceAttribution,
  StationExposure,
} from '../types';

/**
 * Boundary-caution band, in meters. Any station whose nearest modeled flood
 * edge is closer than this is classified `undetermined` regardless of whether
 * the point falls inside or outside the polygon, because the generalized
 * geometry is not survey-accurate near its boundary (Requirement 4.4).
 */
export const BOUNDARY_CAUTION_M = 30;

/** Short, human-readable description of how exposure was derived. */
export const EXPOSURE_METHOD =
  'Turf booleanPointInPolygon + nearest-edge distance; 30 m boundary caution';

/** A station point is accepted either as a GeoJSON Point Feature or a raw [lon, lat]. */
export type StationPointInput = Feature<Point> | [number, number];

/** Result of classifying a single point — the numeric core of a StationExposure. */
export interface ExposureClassification {
  status: ExposureStatus;
  insidePolygon: boolean;
  /** Minimum distance to the nearest modeled flood edge, in meters (1-decimal rounded). */
  minEdgeDistanceM: number;
}

/** Normalize a station input into a [lon, lat] position usable by Turf. */
function toPosition(input: StationPointInput): Position {
  if (Array.isArray(input)) return input;
  return input.geometry.coordinates;
}

/**
 * Collect every linear ring (as a Position[]) from a (Multi)Polygon geometry.
 * Polygon coordinates are an array of rings; MultiPolygon is an array of those.
 * Degenerate rings (fewer than 2 coordinates) are skipped so lineString never
 * throws and never contributes a bogus distance.
 */
function ringsOf(geometry: Polygon | MultiPolygon): Position[][] {
  const rings: Position[][] = [];
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      if (ring.length >= 2) rings.push(ring);
    }
  } else {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        if (ring.length >= 2) rings.push(ring);
      }
    }
  }
  return rings;
}

/** Type guard: is this feature's geometry a Polygon or MultiPolygon? */
function isPolygonalFeature(
  feature: Feature,
): feature is Feature<Polygon | MultiPolygon> {
  const t = feature.geometry?.type;
  return t === 'Polygon' || t === 'MultiPolygon';
}

/**
 * Classify a single point against the flood FeatureCollection.
 *
 * Pure: depends only on its inputs, performs no I/O. Returns the numeric core
 * (status, insidePolygon, minEdgeDistanceM); callers attach attribution.
 */
export function classifyPoint(
  point: StationPointInput,
  floodFC: FeatureCollection,
): ExposureClassification {
  const position = toPosition(point);

  let insidePolygon = false;
  let minEdgeDistanceM = Infinity;

  for (const feature of floodFC.features) {
    if (!isPolygonalFeature(feature)) continue;

    // inside = true if the point is inside ANY polygon feature in the FC.
    if (!insidePolygon && booleanPointInPolygon(position, feature)) {
      insidePolygon = true;
    }

    // Nearest edge across every ring (outer + holes) of every polygon.
    for (const ring of ringsOf(feature.geometry)) {
      const snapped = nearestPointOnLine(lineString(ring), position, {
        units: 'meters',
      });
      // v7 exposes the snap distance as `pointDistance`; `dist` is the
      // (still-supported) legacy alias. Prefer the new name, fall back safely.
      const dist =
        typeof snapped.properties.pointDistance === 'number'
          ? snapped.properties.pointDistance
          : snapped.properties.dist;
      if (dist < minEdgeDistanceM) minEdgeDistanceM = dist;
    }
  }

  // Round to ~1 decimal (meters) for stable display/regression comparison.
  const rounded =
    Number.isFinite(minEdgeDistanceM) ? Math.round(minEdgeDistanceM * 10) / 10 : minEdgeDistanceM;

  const status = classifyStatus(rounded, insidePolygon);

  return { status, insidePolygon, minEdgeDistanceM: rounded };
}

/**
 * The classification decision, isolated so property tests can exercise it
 * directly. Boundary caution applies FIRST, regardless of inside/outside.
 */
export function classifyStatus(
  minEdgeDistanceM: number,
  insidePolygon: boolean,
): ExposureStatus {
  if (minEdgeDistanceM < BOUNDARY_CAUTION_M) return 'undetermined';
  if (insidePolygon) return 'exposed-modeled';
  return 'not-exposed-modeled';
}

/** Minimal shape read from a station Point feature's properties. */
interface StationProps {
  station_id?: unknown;
  name?: unknown;
}

/**
 * Classify a single station Feature and build a full StationExposure, attaching
 * the supplied source attributions. `sources` is ordered [station, floodLayer].
 */
export function classifyStation(
  station: Feature<Point>,
  floodFC: FeatureCollection,
  sources: { stationSource: SourceAttribution; floodLayerSource: SourceAttribution },
): StationExposure {
  const props = (station.properties ?? {}) as StationProps;
  const stationId =
    typeof props.station_id === 'string' ? props.station_id : '';
  const name = typeof props.name === 'string' ? props.name : '';

  const { status, insidePolygon, minEdgeDistanceM } = classifyPoint(
    station,
    floodFC,
  );

  return {
    stationId,
    name,
    status,
    insidePolygon,
    minEdgeDistanceM,
    category: 'derived-analysis',
    sources: [sources.stationSource, sources.floodLayerSource],
    method: EXPOSURE_METHOD,
  };
}

/**
 * Batch entry point: classify every Point feature in `stationsFC` against
 * `floodFC`, returning one StationExposure per station. Pure and testable —
 * callers (the map/panel) pass in the station and flood-layer attributions.
 */
export function computeExposures(
  stationsFC: FeatureCollection,
  floodFC: FeatureCollection,
  sources: { stationSource: SourceAttribution; floodLayerSource: SourceAttribution },
): StationExposure[] {
  const results: StationExposure[] = [];
  for (const feature of stationsFC.features) {
    if (feature.geometry?.type !== 'Point') continue;
    results.push(classifyStation(feature as Feature<Point>, floodFC, sources));
  }
  return results;
}
