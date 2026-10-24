// provenance.ts — small, framework-agnostic provenance helpers.
//
// Two concerns live here (Requirements 3.3/3.4 labeling, 8.6 missing-field
// handling), both as pure functions so any component can reuse them:
//
//  1. Data_Category → human-readable label (CATEGORY_LABEL / categoryLabel).
//  2. Source_Attribution field display with an explicit "unavailable"
//     indicator for any missing (null / empty / whitespace) field, plus a
//     predicate so the UI can style missing fields differently (Requirement
//     8.6). No React here — the Legend, SourceBadge (task 5.2) and CategoryTag
//     (task 5.3) all consume these.

import type { DataCategory, SourceAttribution } from '../types';

/** The indicator text shown in place of any missing attribution field. */
export const UNAVAILABLE = 'unavailable';

/** Display string for each of the five Data_Category values. */
export const CATEGORY_LABEL: Record<DataCategory, string> = {
  'historical-observation': 'Historical observation',
  'future-model-projection': 'Future model projection',
  'reference-data': 'Reference data',
  'derived-analysis': 'Derived analysis',
  'ai-recommendation': 'AI-generated recommendation',
};

/** Human-readable label for a Data_Category. */
export function categoryLabel(category: DataCategory): string {
  return CATEGORY_LABEL[category];
}

/**
 * True when an attribution field is missing — null, undefined, or a string
 * that is empty or whitespace only. Lets the UI flag missing fields (Req 8.6).
 */
export function isFieldMissing(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

/** A present field's value, or the "unavailable" indicator when missing. */
function displayField(value: string | null | undefined): string {
  return isFieldMissing(value) ? UNAVAILABLE : (value as string).trim();
}

/** Source name for display, or "unavailable" when absent (Req 8.6). */
export function displaySourceName(attribution: SourceAttribution): string {
  return displayField(attribution.sourceName);
}

/** Source URL for display, or "unavailable" when absent (Req 8.6). */
export function displaySourceUrl(attribution: SourceAttribution): string {
  return displayField(attribution.sourceUrl);
}

/** Data date for display, or "unavailable" when absent (Req 8.6). */
export function displayDataDate(attribution: SourceAttribution): string {
  return displayField(attribution.dataDate);
}

/** Units for display, or "unavailable" when absent (Req 3.3 / 8.6). */
export function displayUnits(attribution: SourceAttribution): string {
  return displayField(attribution.units);
}
