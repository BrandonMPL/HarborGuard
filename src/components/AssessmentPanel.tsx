// AssessmentPanel.tsx â€” the AI Resilience_Assessment UI (Requirements 5.1,
// 5.4, 5.5, 5.7, 5.8, 5.10).
//
// Owns ONLY its own result area: it never touches the map or the exposure
// results. A single Generate button builds the verified AssessmentRequest from
// current app state (scenario metadata, the 5 exposure results, East Boston
// reference stats, and the curated STRATEGY_OPTIONS) and POSTs it to the
// server's /api/assessment seam (the Vite dev proxy forwards /api -> :8787).
//
// Four states:
//  - IDLE     : just the Generate button + a short hint.
//  - LOADING  : spinner + disabled button (Req 5.7); duplicate clicks ignored
//               while isLoading is true (Req 5.10).
//  - SUCCESS  : the five assessment sections, clearly labeled as an
//               AI-generated recommendation (Req 5.1, 5.4, 5.5).
//  - FAILURE  : the server's fallbackMessage (or a generic one) + a Retry
//               affordance, map/exposure left untouched (Req 5.8).

import { useEffect, useRef, useState } from 'react';
import type {
  AreaConfig,
  AssessmentRequest,
  ResilienceAssessment,
  ScenarioConfig,
  SourceAttribution,
  StationExposure,
} from '../types';
import { STRATEGY_OPTIONS } from '../config/strategies';
import LoadingState from './LoadingState';
import StrategyComparison from './StrategyComparison';

interface AssessmentPanelProps {
  /**
   * The active flood scenario, or undefined in present-day mode. In present day
   * there is no modeled flood layer and no exposure, so an assessment cannot be
   * grounded â€” Generate is disabled with a hint to pick 2050 or 2070.
   */
  scenario?: ScenarioConfig;
  /** Active area(s) â€” one, or East + West for 'Both'. */
  areas: AreaConfig[];
  exposures: StationExposure[];
}

// Build the neighborhood field for the request. A single area passes its own
// verified stats. For 'both' we keep it TRUTHFUL: a combined name, the PRIMARY
// area's reference stats (never a fabricated summed total), and an attribution
// note stating the figures are for the primary area only.
function buildNeighborhoodField(areas: AreaConfig[]): {
  name: string;
  population: number;
  landSqMi: number;
  category: 'reference-data';
  attribution: SourceAttribution;
} {
  const primary = areas[0];
  if (areas.length === 1) {
    return {
      name: primary.name,
      population: primary.population,
      landSqMi: primary.landSqMi,
      category: 'reference-data',
      attribution: primary.attribution,
    };
  }
  const name = areas.map((a) => a.name).join(' + ');
  return {
    name,
    population: primary.population,
    landSqMi: primary.landSqMi,
    category: 'reference-data',
    attribution: {
      ...primary.attribution,
      limitations: [
        ...(primary.attribution.limitations ?? []),
        `Multiple areas are mapped (${name}). The population/land figures above are for ${primary.name} ONLY and are not a combined total.`,
      ],
    },
  };
}

const GENERIC_FAILURE =
  'The resilience assessment could not be generated. Please try again.';

// Build the verified structured payload the server is allowed to reason over
// (Requirement 5.2 â€” only this supplied data). Shapes match AssessmentRequest.
// Grounds only on supplied verified data regardless of how many areas are
// active (the exposures and neighborhood field already carry everything).
function buildRequest(
  scenario: ScenarioConfig,
  areas: AreaConfig[],
  exposures: StationExposure[],
): AssessmentRequest {
  return {
    scenario: {
      year: scenario.year,
      label: scenario.label,
      attribution: scenario.attribution,
    },
    stationExposures: exposures,
    neighborhood: buildNeighborhoodField(areas),
    strategyOptions: STRATEGY_OPTIONS,
  };
}

export default function AssessmentPanel({
  scenario,
  areas,
  exposures,
}: AssessmentPanelProps) {
  const areaLabel = areas.map((a) => a.name).join(' + ');
  const [isLoading, setIsLoading] = useState(false);
  const [assessment, setAssessment] = useState<ResilienceAssessment | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Concurrency guard (Req 5.10): a ref flips synchronously on click so a rapid
  // second click is ignored before React re-renders the disabled button.
  const inFlight = useRef(false);

  // Clear a stale result when the selection changes so a 2050 assessment is
  // never shown while 2070 is selected (and vice versa), and so switching to
  // present day drops any prior result.
  useEffect(() => {
    setAssessment(null);
    setError(null);
  }, [scenario?.year, areas.map((a) => a.id).join(',')]);

  // Present-day baseline: no flood scenario â†’ no exposure â†’ nothing to ground
  // an assessment on. Disable Generate with a clear hint (no fabrication).
  const canGenerate = scenario != null && exposures.length > 0;

  async function generate() {
    if (!scenario || exposures.length === 0) return; // nothing to ground on
    if (inFlight.current) return; // ignore duplicate in-flight requests
    inFlight.current = true;
    setIsLoading(true);
    setError(null);

    const request = buildRequest(scenario, areas, exposures);

    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      // On any non-2xx, surface the server's fallbackMessage when present.
      if (!res.ok) {
        let fallback = GENERIC_FAILURE;
        try {
          const body = (await res.json()) as {
            error?: string;
            fallbackMessage?: string;
          };
          if (body?.fallbackMessage) fallback = body.fallbackMessage;
        } catch {
          // non-JSON error body â€” keep the generic message
        }
        setError(fallback);
        setAssessment(null);
        return;
      }

      const data = (await res.json()) as ResilienceAssessment;
      setAssessment(data);
    } catch {
      // Network failure or JSON parse error â€” non-destructive message (Req 5.8).
      setError(GENERIC_FAILURE);
      setAssessment(null);
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }

  return (
    <section
      className="flex flex-col gap-3 border-t border-slate-700 pt-4"
      aria-label="AI resilience assessment"
    >
      <div>
        <h2 className="text-base font-semibold">AI resilience assessment</h2>
        <p className="mt-1 text-xs text-slate-400">
          {scenario
            ? `Generates a source-grounded assessment for ${areaLabel} under the ${scenario.label} scenario.`
            : `Generates a source-grounded assessment for ${areaLabel} once a flood scenario is selected.`}
        </p>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={isLoading || !canGenerate}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <LoadingState size="sm" label="Generating assessment... (usually 10-20s)" />
        ) : assessment || error ? (
          'Regenerate assessment'
        ) : (
          'Generate resilience assessment'
        )}
      </button>

      {/* Present-day hint: explain why Generate is disabled (no modeled
          exposure to ground an assessment on). */}
      {!canGenerate && !isLoading ? (
        <p className="text-xs text-slate-400">
          Select 2050 or 2070 to generate an assessment.
        </p>
      ) : null}

      {/* FAILURE (Req 5.8): non-destructive message + retry (the button above). */}
      {error && !isLoading ? (
        <div
          className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200"
          role="alert"
        >
          <p className="font-semibold">Assessment unavailable</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={generate}
            className="mt-2 rounded border border-red-400/60 px-2 py-1 text-[11px] font-semibold text-red-100 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* SUCCESS (Req 5.1, 5.4, 5.5). */}
      {assessment && !isLoading ? (
        <AssessmentResult assessment={assessment} />
      ) : null}

      {/* Qualitative strategy comparison (Req 6.1-6.5). Only shown once an
          assessment exists, since it compares the grounded, server-validated
          generated strategies â€” never invented UI content. */}
      {assessment && !isLoading ? (
        <StrategyComparison strategies={assessment.adaptationStrategies} />
      ) : null}
    </section>
  );
}

// Renders the five required sections with a prominent AI-generated recommendation
// label (Req 5.4). The formal CategoryTag component is task 5.3; this interim
// badge satisfies the visible-label requirement for 7.1.
function AssessmentResult({
  assessment,
}: {
  assessment: ResilienceAssessment;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-violet-500/40 bg-violet-500/5 p-3 text-xs leading-relaxed text-slate-200">
      {/* AI-generated recommendation Data_Category label (Req 5.4). */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-200">
          AI-generated recommendation
        </span>
      </div>

      <Section title="Risk explanation">
        <p>{assessment.riskExplanation}</p>
      </Section>

      <Section title="Adaptation strategies">
        <ul className="flex flex-col gap-3">
          {assessment.adaptationStrategies.map((s, i) => (
            <li
              key={`${s.name}-${i}`}
              className="rounded border border-slate-700 bg-slate-900/50 p-2"
            >
              <p className="text-sm font-semibold text-slate-100">{s.name}</p>
              <p className="mt-1">{s.description}</p>
              <dl className="mt-2 flex flex-col gap-1">
                <Detail label="Feasibility" value={s.feasibility} />
                <Detail
                  label="Community benefits"
                  value={s.communityBenefits}
                />
                <Detail
                  label="Ecosystem benefits"
                  value={s.ecosystemBenefits}
                />
                <Detail label="Uncertainties" value={s.uncertainties} />
              </dl>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Ecological tradeoffs">
        <p>{assessment.ecologicalTradeoffs}</p>
      </Section>

      <Section title="Limitations">
        <p>{assessment.limitations}</p>
      </Section>

      <Section title="Evidence references">
        {assessment.citations.length === 0 ? (
          <p className="text-slate-400">No citations provided.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {assessment.citations.map((c, i) => (
              <li key={`${c.label}-${i}`}>
                {c.sourceUrl ? (
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-300 underline hover:text-sky-200"
                  >
                    {c.label}
                  </a>
                ) : (
                  <span>{c.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
        {title}
      </h3>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}
