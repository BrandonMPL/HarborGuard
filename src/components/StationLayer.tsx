// StationLayer.tsx — draws one area's verified MBTA station markers as a
// react-leaflet overlay and reports their computed exposure for the active
// scenario year (Requirements 4.2, 4.3, 4.4, 4.5; task 10.2).
//
// No longer East-only: the stations URL, the active year's flood URL, and that
// flood layer's MC-FRM attribution are all passed in as props, so East and West
// each load THEIR OWN station + flood files and compute exposure independently.
//
// Exposure needs BOTH the station points and the selected year's flood geometry,
// so this component loads both GeoJSON files (via the cached lib/geojson loader)
// then calls computeExposures(...) passing:
//   - stationSource:    built from the stations FeatureCollection metadata
//   - floodLayerSource: the active area/year's MC-FRM attribution (prop)
// It recomputes whenever the year or the URLs change, and surfaces results to
// the parent via `onExposuresChange`.
//
// Markers are plain CircleMarkers color-coded by status, mounted AFTER the
// FloodLayer in MapView so they sit on top of the flood fill. While loading, or
// on load failure, the component renders no markers and reports an empty list.
// In present-day mode (no flood url) it draws neutral markers and reports [].

import { useEffect, useRef, useState } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import type { PathOptions } from 'leaflet';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { loadGeoJSON } from '../lib/geojson';
import { computeExposures } from '../lib/exposure';
import type {
  ExposureStatus,
  SourceAttribution,
  StationExposure,
} from '../types';

interface StationLayerProps {
  /** This area's station points geojson URL. */
  stationsUrl: string;
  /**
   * The active year's flood geojson URL for this area, or undefined in
   * present-day mode. When ABSENT no flood layer exists, so no exposure is
   * computed or implied: markers render neutral and `[]` exposures are
   * reported. No exposure data is ever fabricated for present day.
   */
  floodUrl?: string;
  /** MC-FRM attribution for the active year's flood layer (when floodUrl set). */
  floodAttribution?: SourceAttribution;
  /** Surfaces the computed exposures (empty while loading / on failure / present day). */
  onExposuresChange?: (exposures: StationExposure[]) => void;
}

// Neutral marker color used in present-day mode (slate — reads as "no status").
const NEUTRAL_FILL = '#64748b'; // slate-500
const NEUTRAL_STROKE = '#1e293b'; // slate-800

// Accessible fill per status. exposed = red, not-exposed = green,
// undetermined = amber (boundary caution). Same palette for East and West.
const STATUS_FILL: Record<ExposureStatus, string> = {
  'exposed-modeled': '#dc2626', // red-600
  'not-exposed-modeled': '#16a34a', // green-600
  undetermined: '#f59e0b', // amber-500
};
const STATUS_STROKE: Record<ExposureStatus, string> = {
  'exposed-modeled': '#7f1d1d', // red-900
  'not-exposed-modeled': '#14532d', // green-900
  undetermined: '#78350f', // amber-900
};

/** Human-readable status for marker tooltips and the panel. */
export const STATUS_LABEL: Record<ExposureStatus, string> = {
  'exposed-modeled': 'Exposed (modeled)',
  'not-exposed-modeled': 'Not exposed (modeled)',
  undetermined: 'Undetermined (boundary caution)',
};

function markerStyle(status: ExposureStatus): PathOptions {
  return {
    color: STATUS_STROKE[status],
    weight: 2,
    fillColor: STATUS_FILL[status],
    fillOpacity: 0.9,
    opacity: 1,
  };
}

/**
 * Build the station SourceAttribution from the stations FeatureCollection's
 * top-level metadata. Missing fields degrade to null so provenance stays honest
 * rather than fabricated.
 */
function stationSourceFrom(fc: FeatureCollection): SourceAttribution {
  const meta = (fc as { metadata?: Record<string, unknown> }).metadata ?? {};
  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.length > 0 ? v : null;
  return {
    sourceName: str(meta.source_name),
    sourceUrl: str(meta.source_url),
    dataDate: str(meta.retrieved_utc),
  };
}

export default function StationLayer({
  stationsUrl,
  floodUrl,
  floodAttribution,
  onExposuresChange,
}: StationLayerProps) {
  const [stationsFC, setStationsFC] = useState<FeatureCollection | null>(null);
  const [exposures, setExposures] = useState<StationExposure[]>([]);

  // Keep the latest callback in a ref so the load effect doesn't re-run purely
  // because the parent passed a new function identity.
  const changeCb = useRef(onExposuresChange);
  changeCb.current = onExposuresChange;

  const hasFlood = Boolean(floodUrl && floodAttribution);

  useEffect(() => {
    let cancelled = false;

    // Present-day baseline: no flood layer → load only the stations and compute
    // NO exposure (none fabricated). Report `[]`.
    if (!floodUrl || !floodAttribution) {
      loadGeoJSON(stationsUrl)
        .then((stations) => {
          if (cancelled) return;
          setStationsFC(stations);
          setExposures([]);
          changeCb.current?.([]);
        })
        .catch(() => {
          if (cancelled) return;
          setStationsFC(null);
          setExposures([]);
          changeCb.current?.([]);
        });
      return () => {
        cancelled = true;
      };
    }

    // Flood scenario selected: load stations + this area's flood geometry
    // together, then compute exposure. On any failure render nothing + report [].
    Promise.all([loadGeoJSON(stationsUrl), loadGeoJSON(floodUrl)])
      .then(([stations, flood]) => {
        if (cancelled) return;
        const results = computeExposures(stations, flood, {
          stationSource: stationSourceFrom(stations),
          floodLayerSource: floodAttribution,
        });
        setStationsFC(stations);
        setExposures(results);
        changeCb.current?.(results);
      })
      .catch(() => {
        if (cancelled) return;
        setStationsFC(null);
        setExposures([]);
        changeCb.current?.([]);
      });

    return () => {
      cancelled = true;
    };
  }, [stationsUrl, floodUrl, floodAttribution]);

  if (!stationsFC) return null;

  // Present-day baseline: draw neutral markers (no status, no exposure text).
  if (!hasFlood) {
    return (
      <>
        {stationsFC.features.map((feature) => {
          if (feature.geometry?.type !== 'Point') return null;
          const point = feature as Feature<Point>;
          const id =
            typeof point.properties?.station_id === 'string'
              ? point.properties.station_id
              : '';
          const name =
            typeof point.properties?.name === 'string'
              ? point.properties.name
              : id;
          // GeoJSON is [lon, lat]; Leaflet wants [lat, lon].
          const [lon, lat] = point.geometry.coordinates;
          return (
            <CircleMarker
              key={id || `${lat},${lon}`}
              center={[lat, lon]}
              radius={9}
              pathOptions={{
                color: NEUTRAL_STROKE,
                weight: 2,
                fillColor: NEUTRAL_FILL,
                fillOpacity: 0.9,
                opacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">{name}</div>
                  <div>Select 2050 or 2070 to see modeled exposure</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </>
    );
  }

  if (exposures.length === 0) return null;

  // Map stationId -> exposure for quick lookup while rendering markers.
  const byId = new Map(exposures.map((e) => [e.stationId, e]));

  return (
    <>
      {stationsFC.features.map((feature) => {
        if (feature.geometry?.type !== 'Point') return null;
        const point = feature as Feature<Point>;
        const id =
          typeof point.properties?.station_id === 'string'
            ? point.properties.station_id
            : '';
        const exposure = byId.get(id);
        if (!exposure) return null;

        // GeoJSON is [lon, lat]; Leaflet wants [lat, lon].
        const [lon, lat] = point.geometry.coordinates;

        return (
          <CircleMarker
            key={id}
            center={[lat, lon]}
            radius={9}
            pathOptions={markerStyle(exposure.status)}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div className="text-xs">
                <div className="font-semibold">{exposure.name}</div>
                <div>{STATUS_LABEL[exposure.status]}</div>
                <div>
                  ~{exposure.minEdgeDistanceM} m from modeled flood edge
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
