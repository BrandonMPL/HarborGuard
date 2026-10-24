// validate.ts — the no-hallucination guard for HarborGuard (task 6.3).
//
// Pure, post-call validation of the model's JSON output against the verified
// AssessmentRequest it was grounded on. aiService.ts makes exactly one OpenAI
// call, parses the JSON, then hands the result here. This module performs three
// checks and either returns a well-typed ResilienceAssessment or THROWS a
// descriptive Error. The /api/assessment route turns any throw into the clean,
// credential-free fallback (Requirement 5.8), so throwing is the correct way to
// reject an untrustworthy response.
//
//   1. SCHEMA        — all five sections present and correctly typed, with the
//                      1..5 adaptation-strategy bound (Requirement 5.1).
//   2. NUMERIC GUARD — every numeric token in the human-readable text must be
//                      traceable to a number supplied in the input; any
//                      untraceable number is treated as a fabricated quantity
//                      and rejected (Requirement 5.3).
//   3. CITATIONS     — every citation must map to a SourceAttribution that was
//                      actually supplied in the input (Requirement 5.5).
//
// Conservative-by-design tradeoff: the numeric guard errs toward rejection. It
// is better to occasionally reject a legitimate-but-numeric phrasing (the route
// falls back cleanly and the map/exposure stay intact) than to let a single
// invented number — a flood depth, population, cost, or effectiveness
// percentage — reach the user. This matches the design's deliberately
// conservative no-hallucination stance.

import type {
  AssessmentRequest,
  ResilienceAssessment,
  SourceAttribution,
} from '../src/types';

// Thrown when the model output fails any of the three checks. Named so the
// route (and future tests) can distinguish a validation rejection from a
// transport/parse error without matching on message strings. Either way the
// route returns the same clean fallback.
export class AssessmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentValidationError';
  }
}

// Float tolerance for numeric comparison. Large enough to absorb formatting
// round-trips (e.g. "4.851" vs 4.851, "4.85" vs 4.851 is NOT within tolerance
// and is intentionally rejected) but small enough that genuinely different
// numbers never collide.
const NUMERIC_TOLERANCE = 1e-6;

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

// Validate a parsed model response against the input it was grounded on.
// Returns the same object typed as ResilienceAssessment on success; throws
// AssessmentValidationError on the first failure, naming the offending field.
export function validateAssessment(
  parsed: unknown,
  input: AssessmentRequest,
): ResilienceAssessment {
  const assessment = validateSchema(parsed); // check 1
  validateNumericClaims(assessment, input); // check 2
  validateCitations(assessment, input); // check 3
  return assessment;
}

// ---------------------------------------------------------------------------
// Check 1 — schema validation (Requirement 5.1).
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

const STRATEGY_STRING_FIELDS = [
  'name',
  'description',
  'feasibility',
  'communityBenefits',
  'ecosystemBenefits',
  'uncertainties',
] as const;

function validateSchema(parsed: unknown): ResilienceAssessment {
  if (!isObject(parsed)) {
    throw new AssessmentValidationError(
      'schema: response is not a JSON object',
    );
  }

  // riskExplanation — non-empty string.
  if (!isNonEmptyString(parsed.riskExplanation)) {
    throw new AssessmentValidationError(
      'schema: riskExplanation must be a non-empty string',
    );
  }

  // adaptationStrategies — array of 1..5 objects with six string fields each.
  const strategies = parsed.adaptationStrategies;
  if (!Array.isArray(strategies)) {
    throw new AssessmentValidationError(
      'schema: adaptationStrategies must be an array',
    );
  }
  if (strategies.length < 1 || strategies.length > 5) {
    throw new AssessmentValidationError(
      `schema: adaptationStrategies must contain between 1 and 5 items (got ${strategies.length})`,
    );
  }
  strategies.forEach((s, i) => {
    if (!isObject(s)) {
      throw new AssessmentValidationError(
        `schema: adaptationStrategies[${i}] must be an object`,
      );
    }
    for (const field of STRATEGY_STRING_FIELDS) {
      if (!isNonEmptyString(s[field])) {
        throw new AssessmentValidationError(
          `schema: adaptationStrategies[${i}].${field} must be a non-empty string`,
        );
      }
    }
  });

  // ecologicalTradeoffs & limitations — non-empty strings.
  if (!isNonEmptyString(parsed.ecologicalTradeoffs)) {
    throw new AssessmentValidationError(
      'schema: ecologicalTradeoffs must be a non-empty string',
    );
  }
  if (!isNonEmptyString(parsed.limitations)) {
    throw new AssessmentValidationError(
      'schema: limitations must be a non-empty string',
    );
  }

  // citations — array of { label: string; sourceUrl: string | null }.
  const citations = parsed.citations;
  if (!Array.isArray(citations)) {
    throw new AssessmentValidationError(
      'schema: citations must be an array',
    );
  }
  citations.forEach((c, i) => {
    if (!isObject(c)) {
      throw new AssessmentValidationError(
        `schema: citations[${i}] must be an object`,
      );
    }
    if (!isNonEmptyString(c.label)) {
      throw new AssessmentValidationError(
        `schema: citations[${i}].label must be a non-empty string`,
      );
    }
    if (!(c.sourceUrl === null || typeof c.sourceUrl === 'string')) {
      throw new AssessmentValidationError(
        `schema: citations[${i}].sourceUrl must be a string or null`,
      );
    }
  });

  // category — exact literal.
  if (parsed.category !== 'ai-recommendation') {
    throw new AssessmentValidationError(
      "schema: category must be exactly 'ai-recommendation'",
    );
  }

  // Shape is proven by the checks above; cast through unknown is safe.
  return parsed as unknown as ResilienceAssessment;
}

// ---------------------------------------------------------------------------
// Check 2 — numeric-claim guard (Requirement 5.3).
// ---------------------------------------------------------------------------

// Match numeric tokens, tolerant of comma thousands-separators and decimals:
//   46,892   4.851   2050   30   1,234.5
// We deliberately do NOT require word boundaries so numbers glued to units
// (e.g. "30m", "46,892people") are still caught. Signs/percent are handled by
// comparing the bare magnitude against the allow-list.
const NUMERIC_TOKEN_RE = /\d[\d,]*(?:\.\d+)?/g;

// Normalize a raw numeric token to a JS number: strip thousands separators so
// "46,892" -> 46892, and "4.851" -> 4.851. Returns NaN for anything that does
// not parse (which the caller treats as "nothing to compare").
function normalizeNumber(token: string): number {
  const cleaned = token.replace(/,/g, '');
  return Number(cleaned);
}

// Pull every numeric value out of an arbitrary string (after comma-stripping).
function extractNumbers(text: string): number[] {
  const out: number[] = [];
  const matches = text.match(NUMERIC_TOKEN_RE);
  if (!matches) return out;
  for (const m of matches) {
    const n = normalizeNumber(m);
    if (!Number.isNaN(n)) out.push(n);
  }
  return out;
}

// Build the allow-list of numbers that are traceable to the supplied input.
// A number in the output is permitted only if it matches (within tolerance)
// one of these. Sources of truth:
//   - scenario year(s): the supplied scenario.year plus the two modeled
//     horizons 2050/2070 (either may legitimately appear in text/labels).
//   - neighborhood.population and neighborhood.landSqMi.
//   - each station's minEdgeDistanceM.
//   - every number appearing in the supplied strategyOptions names + summaries.
//   - every number appearing in the supplied SourceAttribution text (names,
//     dates, units, limitations) across scenario, neighborhood, and strategy
//     options. These are things the model was handed, so echoing them is fine.
function buildAllowList(input: AssessmentRequest): number[] {
  const allow: number[] = [];

  // Scenario years — supplied year plus the two modeled horizons.
  allow.push(input.scenario.year, 2050, 2070);

  // Neighborhood reference stats.
  allow.push(input.neighborhood.population, input.neighborhood.landSqMi);

  // Station edge distances, plus any numbers embedded in the station text the
  // model was handed (name + method string — the method carries the "30 m
  // caution" threshold the model may legitimately reference).
  for (const s of input.stationExposures) {
    allow.push(s.minEdgeDistanceM);
    allow.push(...extractNumbers(s.name));
    allow.push(...extractNumbers(s.method));
  }

  // Numbers embedded in supplied strategy text.
  for (const o of input.strategyOptions) {
    allow.push(...extractNumbers(o.name));
    allow.push(...extractNumbers(o.summary));
    allow.push(...numbersFromAttribution(o.sourceAttribution));
  }

  // Numbers embedded in supplied attributions.
  allow.push(...numbersFromAttribution(input.scenario.attribution));
  allow.push(...numbersFromAttribution(input.neighborhood.attribution));

  // De-dupe and drop any NaN that slipped through.
  return allow.filter((n) => !Number.isNaN(n));
}

// Numbers that appear in the human-readable parts of a supplied attribution.
// sourceUrl is intentionally EXCLUDED here too for symmetry with the output
// scan — url IDs are not meaningful claims — but dates/units/limitations are
// fair game because the model may legitimately echo them.
function numbersFromAttribution(a: SourceAttribution): number[] {
  const out: number[] = [];
  if (a.sourceName) out.push(...extractNumbers(a.sourceName));
  if (a.dataDate) out.push(...extractNumbers(a.dataDate));
  if (a.units) out.push(...extractNumbers(a.units));
  if (a.limitations) {
    for (const lim of a.limitations) out.push(...extractNumbers(lim));
  }
  return out;
}

function isTraceable(n: number, allow: number[]): boolean {
  return allow.some((a) => Math.abs(a - n) <= NUMERIC_TOLERANCE);
}

function validateNumericClaims(
  assessment: ResilienceAssessment,
  input: AssessmentRequest,
): void {
  const allow = buildAllowList(input);

  // The human-readable fields to scan. NOTE: citation.sourceUrl is NOT scanned
  // (URLs may carry opaque IDs); only citation.label text is scanned, and that
  // happens below.
  const textFields: string[] = [assessment.riskExplanation];
  for (const s of assessment.adaptationStrategies) {
    textFields.push(
      s.name,
      s.description,
      s.feasibility,
      s.communityBenefits,
      s.ecosystemBenefits,
      s.uncertainties,
    );
  }
  textFields.push(assessment.ecologicalTradeoffs, assessment.limitations);
  for (const c of assessment.citations) {
    textFields.push(c.label); // label only — never the sourceUrl
  }

  for (const text of textFields) {
    for (const n of extractNumbers(text)) {
      if (!isTraceable(n, allow)) {
        // Conservative policy: a single untraceable number fails the whole
        // response. The route falls back cleanly rather than surface an
        // unsupported quantitative claim.
        throw new AssessmentValidationError(
          `numeric-claim: untraceable number ${n} found in assessment text (not present in supplied input)`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Check 3 — citation grounding (Requirement 5.5).
// ---------------------------------------------------------------------------

// Collect every SourceAttribution that was actually supplied to the model:
// scenario, neighborhood, and each strategy option.
function suppliedSources(input: AssessmentRequest): SourceAttribution[] {
  return [
    input.scenario.attribution,
    input.neighborhood.attribution,
    ...input.strategyOptions.map((o) => o.sourceAttribution),
  ];
}

function normalizeText(v: string): string {
  return v.trim().toLowerCase();
}

// A citation is grounded if it matches a supplied source. Prefer matching on
// sourceUrl when the citation carries one; otherwise fall back to matching the
// citation label against a supplied sourceName.
function citationMatchesSource(
  citation: { label: string; sourceUrl: string | null },
  source: SourceAttribution,
): boolean {
  // URL match (strongest signal) — only when both sides have a url.
  if (citation.sourceUrl && source.sourceUrl) {
    if (normalizeText(citation.sourceUrl) === normalizeText(source.sourceUrl)) {
      return true;
    }
  }

  // Name/label match — compare the citation label against the supplied name.
  if (source.sourceName) {
    if (normalizeText(citation.label) === normalizeText(source.sourceName)) {
      return true;
    }
  }

  return false;
}

function validateCitations(
  assessment: ResilienceAssessment,
  input: AssessmentRequest,
): void {
  const sources = suppliedSources(input);

  assessment.citations.forEach((citation, i) => {
    const grounded = sources.some((s) => citationMatchesSource(citation, s));
    if (!grounded) {
      throw new AssessmentValidationError(
        `citation: citations[${i}] ("${citation.label}") does not match any supplied source`,
      );
    }
  });
}

export default validateAssessment;
