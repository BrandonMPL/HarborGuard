// aiService.ts — the single AI seam for HarborGuard.
//
// Exposes exactly one function, generateAssessment, that turns a verified
// AssessmentRequest into a ResilienceAssessment via a single OpenAI chat
// completion (Requirement 5.9). The OpenAI API key is read ONLY here from the
// server-side environment and never logged, returned, or otherwise exposed
// (Requirements 5.6, 9.7).
//
// This module is deliberately the single seam: a future evidence-review second
// pass (task 10.3 / Requirement 5.11) can wrap this internally without changing
// the /api/assessment request/response contract. Do NOT add that second pass
// here now.

import OpenAI from 'openai';
import { buildMessages } from './prompt';
import { validateAssessment } from './validate';
import type { AssessmentRequest, ResilienceAssessment } from '../src/types';

const DEFAULT_MODEL = 'gpt-5-mini';

// Thrown when no API key is configured — surfaced by the route as the clean
// fallback, never as a crash. Kept as a named class so the route (and future
// tests) can distinguish credential problems from model/parse errors without
// inspecting message strings.
export class MissingCredentialsError extends Error {
  constructor(message = 'AI credentials are not configured') {
    super(message);
    this.name = 'MissingCredentialsError';
  }
}

// Make exactly one grounded model call and return the parsed assessment.
// Throws on missing credentials, OpenAI errors, or empty/invalid JSON — the
// route converts any throw into the user-facing fallback.
export async function generateAssessment(
  input: AssessmentRequest,
): Promise<ResilienceAssessment> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingCredentialsError();
  }

  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL;

  // The key lives only in this client instance, scoped to this module.
  const client = new OpenAI({ apiKey });

  const { messages } = buildMessages(input);

  // Exactly ONE model call per invocation (Requirement 5.9). JSON mode
  // guarantees the returned content is a parseable JSON object so validate.ts
  // (task 6.3) can operate on structured data.
  const completion = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
    // Cap output size so the model returns faster and stays concise. Sized to
    // comfortably fit the five-section assessment (with up to five strategies)
    // once the prompt asks for brevity; large enough that valid JSON is never
    // truncated, small enough to trim generation latency.
    max_tokens: 1200,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content || content.trim() === '') {
    throw new Error('AI returned empty content');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Do not include the raw content or any credential in the error.
    throw new Error('AI returned content that was not valid JSON');
  }

  // Post-call, pure no-hallucination guard (task 6.3): schema validation +
  // numeric-claim guard + citation grounding. Throws on any violation, which
  // the route converts into the clean fallback. Exactly one OpenAI call above;
  // nothing here touches the network.
  const validated = validateAssessment(parsed, input);
  return validated;
}

export default generateAssessment;
