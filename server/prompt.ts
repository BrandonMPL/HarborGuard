// prompt.ts — strict grounding system prompt + pure serialization of an
// AssessmentRequest into chat messages. No network, no SDK calls here; this
// module is deliberately pure so it is trivially testable and reusable by
// aiService.ts (task 6.2) and validate.ts (task 6.3).
//
// Enforces the no-hallucination contract at the prompt level (Requirements
// 5.1, 5.2, 5.3, 5.5): respond only as JSON matching ResilienceAssessment,
// use only supplied structured data, never invent numbers, cite only supplied
// sources, draw 1..5 strategies from the supplied options.

import type { AssessmentRequest } from '../src/types';

// The exact JSON shape the model must return. Kept in sync with the
// ResilienceAssessment interface in src/types.ts and enumerated verbatim in the
// system prompt so the model has no ambiguity about the output contract.
const RESPONSE_SCHEMA_TEXT = `{
  "riskExplanation": string,
  "adaptationStrategies": [
    {
      "name": string,
      "description": string,
      "feasibility": string,
      "communityBenefits": string,
      "ecosystemBenefits": string,
      "uncertainties": string
    }
  ],              // 1 to 5 items, each drawn from the supplied strategyOptions
  "ecologicalTradeoffs": string,
  "limitations": string,
  "citations": [
    { "label": string, "sourceUrl": string | null }
  ],              // only sources supplied in the input
  "category": "ai-recommendation"
}`;

export const SYSTEM_PROMPT = `You are HarborGuard's coastal resilience assistant for East Boston, Massachusetts.

Your job: turn the supplied verified structured data into a plain-language resilience assessment, framed clearly as recommendations, not predictions or guarantees.

RESPOND ONLY WITH JSON. Output a single JSON object and nothing else — no prose, no markdown, no code fences. The object MUST match this exact schema:

${RESPONSE_SCHEMA_TEXT}

HARD GROUNDING RULES (follow every one):
1. Use ONLY the structured data supplied in the user message. Do not use outside knowledge, prior training facts, or assumptions about East Boston beyond what is provided.
2. NEVER invent numbers. Do not state any flood depth, population count, cost estimate, effectiveness percentage, dollar figure, or any other quantity that is not present verbatim in the supplied data. If a number would strengthen a claim but is not supplied, describe it qualitatively instead (e.g. "several stations", "a portion of the neighborhood").
3. Produce between 1 and 5 adaptation strategies, and draw every strategy ONLY from the supplied "strategyOptions" list. Use the supplied option names; do not introduce interventions that are not in that list.
4. CITE ONLY supplied sources. Every entry in "citations" must correspond to a source that appears in the input — specifically scenario.attribution, neighborhood.attribution, or one of strategyOptions[].sourceAttribution. Use the supplied sourceName as the label and the supplied sourceUrl (or null if the supplied url is null). Do not cite anything that is not in the input.
5. Keep "exposure" language faithful to the supplied station statuses. A station marked "undetermined" must NOT be described as flooded or exposed. Only describe stations the data marks as exposed-modeled as exposed, and always frame it as modeled exposure against a generalized boundary.
6. Keep language plain and accessible. Frame adaptation strategies explicitly as options and recommendations, and surface uncertainty honestly in the "uncertainties" and "limitations" fields.
7. The "category" field MUST be exactly "ai-recommendation".
8. BE CONCISE. Keep riskExplanation, ecologicalTradeoffs, and limitations to about 2-3 sentences each. For each adaptation strategy, keep description, feasibility, communityBenefits, ecosystemBenefits, and uncertainties to roughly 1-2 sentences each. Prefer 2-3 strong strategies over the full five. Favor clear, direct language over length.

If the supplied data is thin, say so in "limitations" rather than filling gaps with invented detail.`;

// Serialize the verified payload into a compact, model-readable user message.
// Pure function: no side effects, deterministic for a given input.
export function serializeRequest(input: AssessmentRequest): string {
  const lines: string[] = [];

  lines.push('SCENARIO:');
  lines.push(`- year: ${input.scenario.year}`);
  lines.push(`- label: ${input.scenario.label}`);
  lines.push(`- source: ${describeSource(input.scenario.attribution)}`);

  lines.push('');
  lines.push('NEIGHBORHOOD (reference-data):');
  lines.push(`- name: ${input.neighborhood.name}`);
  lines.push(`- population: ${input.neighborhood.population}`);
  lines.push(`- landSqMi: ${input.neighborhood.landSqMi}`);
  lines.push(`- source: ${describeSource(input.neighborhood.attribution)}`);

  lines.push('');
  lines.push('STATION EXPOSURES (derived-analysis — do not re-interpret):');
  if (input.stationExposures.length === 0) {
    lines.push('- (none supplied)');
  } else {
    for (const s of input.stationExposures) {
      lines.push(
        `- ${s.name} [${s.stationId}]: status=${s.status}, insidePolygon=${s.insidePolygon}, minEdgeDistanceM=${s.minEdgeDistanceM}, method="${s.method}"`,
      );
    }
  }

  lines.push('');
  lines.push('STRATEGY OPTIONS (choose 1..5 of these; do not invent others):');
  if (input.strategyOptions.length === 0) {
    lines.push('- (none supplied)');
  } else {
    for (const o of input.strategyOptions) {
      lines.push(`- ${o.name}: ${o.summary}`);
      lines.push(`    source: ${describeSource(o.sourceAttribution)}`);
    }
  }

  lines.push('');
  lines.push(
    'Using ONLY the data above, produce the JSON ResilienceAssessment described in the system instructions. Cite only the sources listed above.',
  );

  return lines.join('\n');
}

// Compact one-line description of a SourceAttribution for the user message.
// Missing fields are rendered as "unavailable" so the model never fabricates
// provenance (mirrors the UI's missing-field handling, Requirement 8.6).
function describeSource(a: {
  sourceName: string | null;
  sourceUrl: string | null;
  dataDate: string | null;
}): string {
  const name = a.sourceName ?? 'unavailable';
  const url = a.sourceUrl ?? 'unavailable';
  const date = a.dataDate ?? 'unavailable';
  return `name="${name}", url="${url}", date="${date}"`;
}

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

// Build the two-message chat payload (system + serialized user message).
// Pure and SDK-agnostic: returns both the raw strings and an OpenAI-style
// messages array so aiService.ts (task 6.2) can consume whichever it needs.
export function buildMessages(input: AssessmentRequest): {
  system: string;
  user: string;
  messages: ChatMessage[];
} {
  const system = SYSTEM_PROMPT;
  const user = serializeRequest(input);
  return {
    system,
    user,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
}

export default buildMessages;
