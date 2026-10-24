// MapView.tsx — interactive Leaflet map (Map_View) for HarborGuard.
// Renders OpenStreetMap base tiles with persistent attribution, frames the
// selected area(s), and draws each active area's Flood_Layer + StationLayer for
// the selected scenario year (task 10.2).
//
// Single area: frame that area's bounds. 'Both': fit to the UNION of both
// areas' bounds. One FloodLayer + one StationLayer is mounted per active area;
// each loads ITS OWN flood/station files and computes exposure independently.
// Per-area exposures are merged here and surfaced to App via onExposuresChange.
// In present-day mode NO flood layers render (unchanged) and exposures are [].

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  AreaConfig,
  ScenarioConfig,
  ScenarioYear,
  StationExposure,
} from '../types';
import { resolveFlood } from '../config/areas';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import FloodLayer, { type FloodLayerStatus } from './FloodLayer';
import StationLayer from './StationLayer';
import Legend from './Legend';

const MIN_ZOOM = 11;
const MAX_ZOOM = 18;

// Required OpenStreetMap attribution — Leaflet keeps the attribution control
// visible in every pan/zoom state (Requirement 1.4).
const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

interface MapViewProps {
  /** The active area(s). One entry for East/West; two for 'Both'. */
  areas: AreaConfig[];
  /** The active scenario (year/label), or undefined in present-day mode. */
  scenario?: ScenarioConfig;
  /** Surfaces the MERGED station exposures (all active areas) to App. */
  onExposuresChange?: (exposures: StationExposure[]) => void;
}

/** Combine every active area's bounds into a single fitting LatLngBounds. */
function combinedBounds(areas: AreaConfig[]): LatLngBoundsExpression {
  const bounds = latLngBounds(areas[0].bounds);
  for (let i = 1; i < areas.length; i++) bounds.extend(areas[i].bounds);
  return bounds;
}

/**
 * MapResizeSync — fixes the ~1-2 block marker offset on West/Both. Leaflet
 * computes its coordinate↔pixel mapping before the responsive container has
 * settled its final size (the layout, the 'Both' fit-bounds, and East↔West↔Both
 * switches all resize the container), which renders the vector overlay slightly
 * shifted. We call map.invalidateSize() once the container has settled (after a
 * frame) on mount and whenever the active area selection changes, then re-fit
 * the bounds so the framing stays correct. No coordinates/data are touched.
 */
function MapResizeSync({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Wait for the container to settle its final size before resyncing.
    frame = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(bounds);
      }, 0);
    });
    const onWindowResize = () => map.invalidateSize();
    window.addEventListener('resize', onWindowResize);
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', onWindowResize);
    };
  }, [map, bounds]);

  return null;
}

export default function MapView({
  areas,
  scenario,
  onExposuresChange,
}: MapViewProps) {
  const year = scenario?.year as ScenarioYear | undefined;

  // Frame the union of all active areas (one area → just that area's bounds).
  const bounds = useMemo(() => combinedBounds(areas), [areas]);
  const center = areas[0].centroid as LatLngExpression;

  // Base-map tile status (Req 1.5–1.7).
  const [tilesLoading, setTilesLoading] = useState(true);
  const [tilesError, setTilesError] = useState(false);
  const [tileLayerKey, setTileLayerKey] = useState(0);

  // Flood-layer status reported by FloodLayer. With multiple areas we keep a
  // status per area id and surface the "worst" one for the overlays (error >
  // loading > empty > ready) so a single spinner/error reflects any pending or
  // failed area layer.
  const [floodStatusById, setFloodStatusById] = useState<
    Record<string, FloodLayerStatus>
  >({});
  const [floodReloadToken, setFloodReloadToken] = useState(0);

  // Per-area exposures, merged into one list for App. Keyed by area id so a
  // re-report from one area doesn't drop the other's results.
  const exposuresByArea = useRef<Record<string, StationExposure[]>>({});
  const emitMerged = () => {
    const merged = areas.flatMap((a) => exposuresByArea.current[a.id] ?? []);
    onExposuresChange?.(merged);
  };

  const retryBaseMap = () => {
    setTilesError(false);
    setTilesLoading(true);
    setTileLayerKey((k) => k + 1);
  };

  const retryFloodLayer = () => {
    setFloodStatusById({});
    setFloodReloadToken((t) => t + 1);
  };

  // Aggregate flood status across active areas for the overlay UI.
  const aggregateFloodStatus: FloodLayerStatus = (() => {
    const statuses = areas.map((a) => floodStatusById[a.id] ?? 'loading');
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('loading')) return 'loading';
    if (statuses.every((s) => s === 'empty')) return 'empty';
    return 'ready';
  })();

  return (
    <div className="relative h-full w-full">
      <MapContainer
        className="h-full w-full"
        center={center}
        bounds={bounds}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom
      >
        <MapResizeSync bounds={bounds} />
        <TileLayer
          key={tileLayerKey}
          url={OSM_TILE_URL}
          attribution={OSM_ATTRIBUTION}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          eventHandlers={{
            loading: () => {
              setTilesError(false);
              setTilesLoading(true);
            },
            load: () => setTilesLoading(false),
            tileerror: () => {
              setTilesLoading(false);
              setTilesError(true);
            },
          }}
        />

        {/* Flood_Layer per active area, only when a flood scenario is selected.
            Each area uses ITS OWN files (East → East files, West → West files).
            In present-day mode NO flood layer renders. Keyed by area id + year
            so switching area or year remounts cleanly (Req 2.6). */}
        {scenario && year
          ? areas.map((area) => {
              const { url } = resolveFlood(area, year);
              return (
                <FloodLayer
                  key={`flood-${area.id}-${year}`}
                  url={url}
                  reloadToken={floodReloadToken}
                  onStatusChange={(status) =>
                    setFloodStatusById((prev) =>
                      prev[area.id] === status
                        ? prev
                        : { ...prev, [area.id]: status },
                    )
                  }
                />
              );
            })
          : null}

        {/* StationLayer per active area (mounted after FloodLayer so markers
            sit on top). Each loads its own station file and computes exposure
            against its own flood layer for the selected year. Keyed by area id +
            selection so switching remounts and recomputes (Req 4.5). */}
        {areas.map((area) => {
          const flood = scenario && year ? resolveFlood(area, year) : null;
          return (
            <StationLayer
              key={`stations-${area.id}-${year ?? 'current'}`}
              stationsUrl={area.stationsUrl}
              floodUrl={flood?.url}
              floodAttribution={flood?.attribution}
              onExposuresChange={(exposures) => {
                exposuresByArea.current[area.id] = exposures;
                emitMerged();
              }}
            />
          );
        })}
      </MapContainer>

      {/* Legend — bottom-LEFT so it never covers Leaflet's attribution control.
          For 'both' one legend is fine (same symbology). */}
      {scenario ? (
        aggregateFloodStatus === 'ready' ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[16rem]">
            <div className="pointer-events-auto">
              <Legend scenario={scenario} />
            </div>
          </div>
        ) : null
      ) : (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[16rem]">
          <div className="pointer-events-auto">
            <Legend />
          </div>
        </div>
      )}

      {/* Base-map loading indicator — top-left. */}
      {tilesLoading && !tilesError ? (
        <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md bg-slate-800/90 px-3 py-2 shadow-lg">
          <LoadingState label="Loading base map…" size="sm" />
        </div>
      ) : null}

      {/* Flood-layer loading indicator — top-RIGHT. Suppressed in present day. */}
      {scenario && aggregateFloodStatus === 'loading' ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded-md bg-slate-800/90 px-3 py-2 shadow-lg">
          <LoadingState label="Loading flood layer…" size="sm" />
        </div>
      ) : null}

      {/* Flood data unavailable/empty — message, no symbology (Req 3.7). */}
      {scenario && aggregateFloodStatus === 'empty' ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded-md bg-slate-800/90 px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-slate-100" role="status">
            Flood data unavailable for the selected scenario
          </p>
        </div>
      ) : null}

      {/* Flood-layer load failure — keep the current view; message + retry. */}
      {scenario && aggregateFloodStatus === 'error' ? (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000]">
          <div className="pointer-events-auto">
            <ErrorState
              message="Flood layer failed to load"
              onRetry={retryFloodLayer}
              retryLabel="Retry"
            />
          </div>
        </div>
      ) : null}

      {/* Base-map error overlay — centered, non-blocking. */}
      {tilesError ? (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-start justify-center pt-6">
          <div className="pointer-events-auto">
            <ErrorState
              message="Base map unavailable"
              onRetry={retryBaseMap}
              retryLabel="Retry"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
