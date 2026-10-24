// FloodLayer.tsx — loads and draws the selected scenario's Flood_Layer.
//
// Responsibilities (Requirements 2.5, 2.6, 2.7, 3.7):
//  - Load the scenario's GeoJSON via lib/geojson.ts (cached).
//  - While loading, report `loading` so MapView can show a flood-layer spinner
//    distinct from the base-map spinner.
//  - On success with features, draw a semi-transparent flood extent over OSM.
//  - On an EMPTY FeatureCollection (no usable features), report `empty` and
//    draw NO symbology (Requirement 3.7).
//  - On load failure, report `error` and draw nothing; MapView keeps the
//    current view and offers a retry (Requirement 2.7).
//  - On scenario change, the previous layer is removed before the new one is
//    shown. This component is keyed by scenario year in MapView, so switching
//    scenarios REMOUNTS it — the old GeoJSON layer unmounts (Leaflet removes it)
//    before the new data renders. Internally we also clear local data on each
//    load so a same-key reload can't leave a stale layer visible.

import { useEffect, useRef, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { PathOptions } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { loadGeoJSON } from '../lib/geojson';

export type FloodLayerStatus = 'loading' | 'ready' | 'empty' | 'error';

interface FloodLayerProps {
  /** Scenario GeoJSON URL (e.g. /data/eastboston_flood_2050.geojson). */
  url: string;
  /** Bumped by the parent to force a reload/retry of the same URL. */
  reloadToken?: number;
  /** Reports load status so MapView can show loading / error / empty UI. */
  onStatusChange?: (status: FloodLayerStatus) => void;
}

// Flood extent symbology: a readable teal/blue fill at ~0.4 opacity with a
// crisper outline so the extent stays legible over OSM base tiles.
const FLOOD_STYLE: PathOptions = {
  color: '#0e7490', // cyan-700 outline
  weight: 1,
  fillColor: '#06b6d4', // cyan-500 fill
  fillOpacity: 0.4,
  opacity: 0.8,
};

/** A feature contributes symbology only if it carries drawable geometry. */
function hasDrawableGeometry(feature: Feature<Geometry>): boolean {
  const g = feature.geometry;
  if (!g) return false;
  if (g.type === 'Polygon') return g.coordinates.some((ring) => ring.length > 0);
  if (g.type === 'MultiPolygon')
    return g.coordinates.some((poly) => poly.some((ring) => ring.length > 0));
  // Any other non-empty geometry type is still considered drawable.
  return g.type !== 'GeometryCollection' || g.geometries.length > 0;
}

/** True when the collection has no feature with usable geometry (Req 3.7). */
function isEmptyCollection(fc: FeatureCollection): boolean {
  return !fc.features.some(hasDrawableGeometry);
}

export default function FloodLayer({
  url,
  reloadToken = 0,
  onStatusChange,
}: FloodLayerProps) {
  const [data, setData] = useState<FeatureCollection | null>(null);
  // Keep the latest callback in a ref so the load effect doesn't re-run just
  // because the parent passed a new function identity.
  const statusCb = useRef(onStatusChange);
  statusCb.current = onStatusChange;

  useEffect(() => {
    let cancelled = false;
    // Clear any previously drawn layer before loading the next one so a stale
    // extent is never visible during the swap (Requirement 2.6).
    setData(null);
    statusCb.current?.('loading');

    loadGeoJSON(url)
      .then((fc) => {
        if (cancelled) return;
        if (isEmptyCollection(fc)) {
          setData(null);
          statusCb.current?.('empty');
          return;
        }
        setData(fc);
        statusCb.current?.('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setData(null);
        statusCb.current?.('error');
      });

    return () => {
      cancelled = true;
    };
  }, [url, reloadToken]);

  if (!data) return null;

  // Key by url+token so react-leaflet replaces the layer (rather than trying to
  // diff GeoJSON data, which it does not do) whenever the source changes.
  return <GeoJSON key={`${url}:${reloadToken}`} data={data} style={FLOOD_STYLE} />;
}
