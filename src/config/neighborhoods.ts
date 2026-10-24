// neighborhoods.ts — backward-compatibility shim.
//
// Reference-data neighborhood config now lives in src/config/areas.ts as
// AreaConfig (each area also carries its own flood + station data — task 10.2).
// This module re-exposes the East Boston values as a plain NeighborhoodConfig
// for any code that still imports the older names, derived from EAST_AREA so
// the facts stay in one place.

import type { NeighborhoodConfig } from '../types';
import { EAST_AREA } from './areas';

export const EAST_BOSTON: NeighborhoodConfig = {
  id: EAST_AREA.id,
  name: EAST_AREA.name,
  centroid: EAST_AREA.centroid,
  bounds: EAST_AREA.bounds,
  population: EAST_AREA.population,
  landSqMi: EAST_AREA.landSqMi,
  category: EAST_AREA.category,
  attribution: EAST_AREA.attribution,
};

export const NEIGHBORHOODS: NeighborhoodConfig[] = [EAST_BOSTON];

export const DEFAULT_NEIGHBORHOOD = EAST_BOSTON;
