// geojson.ts — framework-agnostic static GeoJSON loader with in-memory caching.
//
// The three prepared files live under public/data/ and are served as static
// assets (e.g. /data/eastboston_flood_2050.geojson). Each flood file is a
// FeatureCollection carrying embedded `metadata` provenance; the stations file
// is a FeatureCollection of 5 Points with its own metadata. This loader just
// fetches and parses them, caching by URL so repeat callers share one request.
//
// No React here on purpose — callers (task 3.2) handle UI/error presentation.

import type { FeatureCollection } from 'geojson';

// Cache the in-flight/resolved Promise (not just the value) so concurrent calls
// for the same URL dedupe onto a single fetch. A rejected load is evicted so a
// later caller can retry.
const cache = new Map<string, Promise<FeatureCollection>>();

/**
 * Fetch and parse a GeoJSON FeatureCollection from `url`, caching the result.
 *
 * Repeat calls for the same URL return the same cached Promise and do not
 * refetch. On fetch/parse failure the cache entry is removed and a clear Error
 * is thrown so callers can surface a retry affordance.
 */
export function loadGeoJSON(url: string): Promise<FeatureCollection> {
  const cached = cache.get(url);
  if (cached) return cached;

  const pending = fetchGeoJSON(url).catch((err) => {
    // Evict so a subsequent call can retry instead of getting the failure.
    cache.delete(url);
    throw err;
  });

  cache.set(url, pending);
  return pending;
}

/** Clear the cache (useful for tests or forced reloads). */
export function clearGeoJSONCache(url?: string): void {
  if (url) cache.delete(url);
  else cache.clear();
}

async function fetchGeoJSON(url: string): Promise<FeatureCollection> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Failed to fetch GeoJSON from "${url}": ${detail}`);
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch GeoJSON from "${url}": ${res.status} ${res.statusText}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new Error(`Failed to parse GeoJSON from "${url}": invalid JSON`);
  }

  if (!isFeatureCollection(parsed)) {
    throw new Error(
      `Invalid GeoJSON from "${url}": expected a FeatureCollection`,
    );
  }

  return parsed;
}

function isFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'FeatureCollection' &&
    Array.isArray((value as { features?: unknown }).features)
  );
}
