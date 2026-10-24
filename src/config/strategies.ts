// strategies.ts — curated, source-grounded adaptation options for East Boston
// coastal flooding. These are the ONLY interventions the AI service may draw
// from (see design.md "AI Design"): the model selects 1..5 of these and
// describes them qualitatively. Summaries are intentionally qualitative — no
// invented numbers, costs, or effectiveness percentages (Requirement 5.3).
//
// Attributions point at general, reputable public resources (ResilientMass /
// Massachusetts climate resilience programs and the MC-FRM context). URLs are
// best-effort public landing pages; where a stable URL is not known the field
// is null and the UI renders an "unavailable" indicator (Requirement 8.6).

import type { AdaptationStrategyOption, SourceAttribution } from '../types';

// Massachusetts statewide climate resilience planning (ResilientMass / MVP).
const RESILIENT_MASS: SourceAttribution = {
  sourceName: 'ResilientMass — Massachusetts Climate Change Adaptation program',
  sourceUrl: 'https://www.mass.gov/resilientmass',
  dataDate: null,
  units: null,
  limitations: [
    'General statewide guidance; not an East Boston site-specific engineering plan.',
    'Qualitative context only — contains no project-specific cost or effectiveness figures.',
  ],
};

// MC-FRM is the modeling context that frames which adaptations are relevant.
const MC_FRM_CONTEXT: SourceAttribution = {
  sourceName: 'Massachusetts Coast Flood Risk Model (MC-FRM) context',
  sourceUrl: 'https://resilient.mass.gov/',
  dataDate: null,
  units: null,
  limitations: [
    'Modeling context for coastal flood exposure; not a prescriptive adaptation standard.',
    'Qualitative framing only — no site-specific quantitative claims.',
  ],
};

export const STRATEGY_OPTIONS: AdaptationStrategyOption[] = [
  {
    name: 'Coastal wetland and living shoreline restoration',
    summary:
      'Restore salt marsh, tidal wetlands, and vegetated living shorelines along the harbor edge so natural systems absorb wave energy and tidal flooding while providing habitat. A nature-based approach that works with, rather than against, coastal processes.',
    sourceAttribution: { ...RESILIENT_MASS },
  },
  {
    name: 'Elevated and floodable infrastructure with flood barriers',
    summary:
      'Raise or flood-proof critical infrastructure and buildings, and add deployable or fixed flood barriers at vulnerable access points such as transit entrances. Keeps essential services usable during modeled high-water events.',
    sourceAttribution: { ...MC_FRM_CONTEXT },
  },
  {
    name: 'Stormwater and green infrastructure upgrades',
    summary:
      'Add green infrastructure — rain gardens, permeable surfaces, bioswales, and upgraded drainage — to manage stormwater and reduce compound flooding where coastal and rainfall flooding interact. Distributes water management across the neighborhood.',
    sourceAttribution: { ...RESILIENT_MASS },
  },
  {
    name: 'Managed retreat and flood-aware zoning',
    summary:
      'Use land-use planning, zoning, and voluntary relocation over time to steer new development away from the most exposed areas and reduce the assets placed in harm. A longer-horizon, policy-led approach that lowers future exposure.',
    sourceAttribution: { ...RESILIENT_MASS },
  },
  {
    name: 'Community preparedness and emergency response',
    summary:
      'Strengthen early-warning communication, evacuation and access routes, cooling and resilience hubs, and neighborhood response capacity so residents can act ahead of flood events. Complements physical measures with social resilience.',
    sourceAttribution: { ...RESILIENT_MASS },
  },
  {
    name: 'Waterfront buffer parks and open space',
    summary:
      'Design waterfront parks and open space to double as flood buffers that can hold water during surge events while serving as everyday community amenities. Combines public space benefits with coastal protection.',
    sourceAttribution: { ...RESILIENT_MASS },
  },
];

export default STRATEGY_OPTIONS;
