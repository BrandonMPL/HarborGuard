# Requirements Document

## Introduction

HarborGuard is an AI-powered coastal resilience planning web application built for Hackachusetts 2026. It helps Massachusetts residents, local planners, and community organizations understand projected coastal flood exposure, identify potentially vulnerable infrastructure and populations, and explore evidence-backed adaptation strategies that protect both communities and coastal ecosystems.

The application centers on an interactive map of Boston Harbor, lets users select a neighborhood and a future flood scenario, visualizes verified Massachusetts coastal flood model layers, surfaces community and infrastructure context from available datasets, and produces AI-generated resilience assessments and strategy comparisons. HarborGuard must demonstrate meaningful, source-grounded AI functionality as a core deliverable, not only GIS visualization: the AI resilience assessment is treated as essential product value rather than an add-on. The initial AI workflow is intentionally kept simple and source-grounded, drawing only on structured data supplied for the current selection. Three constraints govern the entire system: strict data provenance (every data value carries source, date, units, and limitations), a no-hallucination rule for AI output (the AI must never invent flood depths, populations, costs, or effectiveness figures), and a verified-intersection rule (no facility is reported as flooded unless its geospatial location has been verified and intersected with the selected flood layer).

Scope is sized for a solo intermediate developer in a single-day hackathon. Requirements are tagged with priorities (P0/P1/P2) to guide sequencing. P0 covers the foundational demo deliverables and now includes the AI resilience assessment: the interactive map, neighborhood and scenario selection, verified MC-FRM source verification, verified flood visualization, source-grounded AI resilience assessment, data provenance, and a deployable responsive demo. The P0 acceptance baseline is a complete, working East Boston end-to-end flow. P1 covers community and infrastructure context. P2 covers optional features such as strategy comparison and the shareable briefing, which must not block the P0 East Boston demo. The preferred stack is React, TypeScript, Vite, Tailwind CSS, and Leaflet, with a lightweight Node backend only where required for secure AI access or data processing. There is no login, payment, or complex database.

## Glossary

- **HarborGuard**: The complete web application, including its browser front end and any lightweight backend service.
- **Map_View**: The interactive Leaflet-based map component centered on Boston Harbor.
- **Scenario_Selector**: The UI control that lets a user choose a future flood scenario (2050 or 2070).
- **Neighborhood_Selector**: The UI control that lets a user choose a target neighborhood (initially East Boston).
- **Flood_Layer**: A geospatial layer sourced from verified official Massachusetts coastal flood GIS resources, representing projected flood extent or depth for a specific scenario.
- **Massachusetts Coast Flood Risk Model (MC-FRM)**: The official Massachusetts coastal flood risk model that is the authoritative source for Flood_Layer data.
- **Legend**: The map overlay that explains Flood_Layer symbology, scenario labels, and units.
- **Source_Attribution**: Displayed provenance metadata for a dataset, including source name, source URL, publication or retrieval date, units, scenario definition, and known limitations.
- **Context_Panel**: The UI region that displays community context and potentially exposed infrastructure for the selected neighborhood and scenario.
- **Infrastructure_Feature**: A mapped civic or healthcare asset (for example a hospital or MBTA station) drawn from available datasets.
- **Exposure_Analysis**: The computation that intersects Infrastructure_Feature locations with the selected Flood_Layer to determine potential exposure.
- **Resilience_Assessment**: The AI-generated output containing a risk explanation, possible adaptation strategies, ecological tradeoffs, limitations, and evidence references.
- **AI_Service**: The server-side component that invokes the AI model and enforces grounding and no-hallucination constraints. Its architecture is designed so that a future evidence-review stage (a second pass that reviews AI claims against supplied evidence) can be added without changing the client contract or the no-hallucination guarantees.
- **Adaptation_Strategy**: A described coastal resilience intervention that can be compared qualitatively.
- **Strategy_Comparison**: The UI and logic that compares two or three Adaptation_Strategy items across feasibility, community benefits, ecosystem benefits, and uncertainties.
- **Resilience_Briefing**: A short, shareable summary document generated from the current selection and Resilience_Assessment.
- **Data_Provenance**: The recorded metadata set (source URL, date, units, scenario definition, limitations) attached to every dataset HarborGuard uses, and the recorded verification metadata for verified GIS sources.
- **Data_Category**: The classification of a displayed value as exactly one of five categories: a historical observation, a future model projection, reference data, a derived analysis, or an AI-generated recommendation.
- **Derived_Analysis**: A computed or derived value produced by combining or transforming one or more source datasets (for example an Exposure_Analysis result), as opposed to a value read directly from a single source dataset.
- **User**: A resident, local planner, or community organization member using HarborGuard.

## Requirements

### Requirement 1: Interactive Boston Harbor Map (P0)

**User Story:** As a User, I want an interactive map centered on Boston Harbor, so that I can orient myself geographically before exploring flood risk.

#### Acceptance Criteria

1. WHEN HarborGuard finishes loading, THE Map_View SHALL display an interactive map with its initial view centered on Boston Harbor at a zoom level that renders the harbor and its adjacent shoreline within the visible viewport.
2. WHEN the User performs a pan gesture (mouse drag or touch drag), THE Map_View SHALL reposition the visible map area to follow the gesture.
3. WHEN the User performs a zoom interaction (scroll, pinch, or zoom control), THE Map_View SHALL change the zoom level within a bounded range of a configured minimum and maximum zoom level.
4. WHEN the Map_View displays base map tiles, THE Map_View SHALL display Source_Attribution identifying the tile provider and keep it visible in all pan and zoom states.
5. WHILE base map tiles are being requested and have not yet rendered, THE Map_View SHALL display a visible loading indicator for the base map.
6. WHEN base map tiles are requested under normal network conditions, THE Map_View SHALL render the base map within a reasonable time under normal network conditions and SHALL remove the loading indicator once the base map has rendered.
7. IF the base map tiles fail to load, THEN THE Map_View SHALL display a message indicating that the base map is unavailable, SHALL display a retry control for reloading the base map, and SHALL retain pan and zoom controls in an interactive state.

### Requirement 2: Neighborhood and Scenario Selection (P0)

**User Story:** As a User, I want to select a neighborhood and a future flood scenario, so that I can view flood exposure for a specific place and time horizon.

#### Acceptance Criteria

1. THE Neighborhood_Selector SHALL offer East Boston as a selectable neighborhood.
2. THE Scenario_Selector SHALL offer exactly two selectable scenarios: a 2050 scenario and a 2070 scenario.
3. WHEN HarborGuard finishes loading, THE Scenario_Selector SHALL have the 2050 scenario selected as the default.
4. WHEN a User selects a neighborhood, THE Map_View SHALL center on the selected neighborhood's centroid and set a zoom level such that the neighborhood boundary is fully contained within the visible map area.
5. WHILE a Flood_Layer for a selected scenario is being requested and has not yet rendered, THE Map_View SHALL display a visible loading indicator for the Flood_Layer.
6. WHEN a User selects a scenario, THE Map_View SHALL remove the previously displayed Flood_Layer and display the Flood_Layer corresponding to the selected scenario within a reasonable time under normal network conditions, removing the loading indicator once the Flood_Layer has rendered.
7. IF the Flood_Layer corresponding to the selected scenario fails to load, THEN THE Map_View SHALL retain the current neighborhood view and any already-displayed content, SHALL display a message indicating that the flood layer failed to load, and SHALL display a retry control for reloading the Flood_Layer.
8. THE HarborGuard SHALL treat a complete, working East Boston demo, consisting of the base map, scenario selection, verified flood visualization, community context, and the AI Resilience_Assessment, as the P0 acceptance baseline and SHALL make this East Boston end-to-end flow operate independently of any P2 feature.
9. WHERE additional neighborhoods are configured, THE Neighborhood_Selector SHALL offer those neighborhoods as selectable options, and these additional neighborhoods SHALL NOT be required for the East Boston P0 acceptance baseline. (P2)

### Requirement 3: Verified Flood Layer Visualization (P0)

**User Story:** As a User, I want to see verified Massachusetts coastal flood layers with a clear legend and attribution, so that I can trust the flood information and understand what it represents.

#### Acceptance Criteria

1. THE Flood_Layer SHALL be sourced only from the Massachusetts Coast Flood Risk Model (MC-FRM) as the authoritative source.
2. IF a Flood_Layer is not sourced from the Massachusetts Coast Flood Risk Model (MC-FRM), THEN THE Map_View SHALL NOT display that Flood_Layer.
3. WHEN a Flood_Layer finishes rendering, THE Map_View SHALL display a Legend that describes the Flood_Layer symbology and states the flood depth units.
4. WHEN a Flood_Layer finishes rendering, THE Map_View SHALL display a scenario label stating the selected scenario year.
5. WHEN a Flood_Layer finishes rendering, THE Map_View SHALL display Source_Attribution containing the source name, source URL, and data date for that Flood_Layer.
6. IF the Source_Attribution for the displayed Flood_Layer is missing the source name, source URL, or data date, THEN THE Map_View SHALL display the available Source_Attribution fields and SHALL display an unavailable indicator for each missing field.
7. IF the Flood_Layer for the selected scenario is unavailable, where unavailable means the Flood_Layer cannot be retrieved or returns no data, THEN THE Map_View SHALL display a message stating that flood data for the selected scenario is unavailable and SHALL NOT display flood symbology for that scenario.
8. WHEN a Flood_Layer finishes rendering, THE Map_View SHALL label the Flood_Layer data as a future model projection Data_Category.

### Requirement 4: Community Context and Infrastructure Exposure (P1)

**User Story:** As a User, I want to see community context and potentially exposed infrastructure for my selected neighborhood, so that I can understand which assets and populations may be affected.

#### Acceptance Criteria

1. WHEN a User selects a neighborhood, THE Context_Panel SHALL display community context for the selected neighborhood drawn from available datasets as observable Data_Category values within 3 seconds.
2. WHEN a User selects a neighborhood and scenario, THE Map_View SHALL display Infrastructure_Feature markers located within 500 meters of the selected neighborhood boundary, each marker having a verified geospatial location.
3. WHEN HarborGuard reports an Infrastructure_Feature as potentially exposed to flooding, THE Exposure_Analysis SHALL have verified the geospatial location of that Infrastructure_Feature against its source dataset and intersected that location with the selected Flood_Layer.
4. IF an Infrastructure_Feature has not been intersected with the selected Flood_Layer, THEN THE Context_Panel SHALL NOT describe that Infrastructure_Feature as flooded or exposed and SHALL indicate its exposure status as "undetermined".
5. WHEN HarborGuard displays an Exposure_Analysis result, THE HarborGuard SHALL label that result as a derived analysis Data_Category and SHALL display references to the source datasets used, including the Infrastructure_Feature source dataset and the selected Flood_Layer, together with the intersection method applied.
6. WHEN the Context_Panel displays a data value, THE Context_Panel SHALL display the Data_Category and Source_Attribution for that value.
7. IF a referenced dataset is unavailable, THEN THE Context_Panel SHALL display a message identifying the missing dataset by name and SHALL continue to display the remaining available context values.

### Requirement 5: AI Resilience Assessment (P0)

**User Story:** As a User, I want an AI-generated resilience assessment for my selection, so that I can understand the risk and possible adaptation approaches in plain language.

#### Acceptance Criteria

1. WHEN a User requests a Resilience_Assessment for the current neighborhood and scenario, THE AI_Service SHALL generate an assessment containing all five of the following sections: a risk explanation, at least one and at most five adaptation strategies, ecological tradeoffs, limitations, and evidence references.
2. THE AI_Service SHALL generate the Resilience_Assessment using only the structured data supplied to the AI_Service for the current selection, and SHALL NOT use any data outside that supplied structured data.
3. THE AI_Service SHALL NOT include flood depths, affected population counts, cost estimates, or effectiveness percentages in the Resilience_Assessment unless those exact values are present in the supplied structured data.
4. WHEN the Resilience_Assessment is displayed, THE Resilience_Assessment SHALL be labeled with a visible indicator identifying it as an AI-generated recommendation Data_Category.
5. WHEN the Resilience_Assessment cites evidence, THE Resilience_Assessment SHALL reference, for each cited item, the supplied dataset or Source_Attribution from which that evidence was drawn.
6. THE AI_Service SHALL run server-side and SHALL keep AI API credentials server-side such that no credential value is included in any response returned to the client.
7. WHILE an AI request for a Resilience_Assessment is in progress, THE HarborGuard SHALL display a visible loading indicator for the assessment and SHALL complete the assessment within a reasonable time under normal network conditions, removing the loading indicator once the assessment is displayed.
8. IF the AI_Service fails to produce a Resilience_Assessment, or returns an error, THEN HarborGuard SHALL display a message indicating that the assessment could not be generated, SHALL display a retry control for requesting the assessment again, and SHALL retain the map and context already displayed without modification.
9. WHEN a User requests a Resilience_Assessment, THE AI_Service SHALL issue exactly one AI request per Resilience_Assessment in its initial single-model workflow.
10. WHILE an AI request for a Resilience_Assessment is in progress, IF the same User submits an additional Resilience_Assessment request for the same selection, THEN THE AI_Service SHALL ignore the additional request until the in-progress request completes or fails.
11. THE AI_Service architecture SHALL allow a future evidence-review stage, consisting of a second pass that reviews AI claims against the supplied evidence, to be added without changing the client contract for requesting a Resilience_Assessment and without weakening the no-hallucination guarantees stated in this requirement.

### Requirement 6: Adaptation Strategy Comparison (P2)

**User Story:** As a User, I want to compare adaptation strategies qualitatively, so that I can weigh options for my community.

#### Acceptance Criteria

1. WHEN a User selects two or three Adaptation_Strategy items and requests a comparison, THE Strategy_Comparison SHALL display the selected strategies side by side with one column per selected strategy and one row for each of the four comparison dimensions: feasibility, community benefits, ecosystem benefits, and uncertainties.
2. IF a User requests a comparison with fewer than two or more than three Adaptation_Strategy items selected, THEN THE Strategy_Comparison SHALL NOT display a comparison and SHALL display a message stating that between two and three strategies must be selected.
3. THE Strategy_Comparison SHALL present each of the four comparison dimensions as descriptive text only and SHALL NOT display any numeric cost, score, rating, or effectiveness value for any dimension.
4. IF a selected Adaptation_Strategy has no available content for a comparison dimension, THEN THE Strategy_Comparison SHALL display an explicit not-available indicator for that dimension cell and SHALL NOT substitute an invented value.
5. WHEN the Strategy_Comparison includes AI-generated content, THE Strategy_Comparison SHALL display a visible label identifying that content as an AI-generated recommendation Data_Category adjacent to the content it describes.

### Requirement 7: Shareable Resilience Briefing (P2)

**User Story:** As a User, I want to generate a short shareable resilience briefing, so that I can communicate findings to my community or officials.

#### Acceptance Criteria

1. WHEN a User requests a Resilience_Briefing, THE HarborGuard SHALL generate a briefing containing the selected neighborhood, the selected scenario, a summary of the Resilience_Assessment limited to a maximum of 500 words, and Source_Attribution for each referenced data item.
2. THE Resilience_Briefing SHALL display a visible label identifying AI-generated content as an AI-generated recommendation Data_Category, positioned adjacent to each AI-generated content section.
3. WHEN a User requests a Resilience_Briefing, THE HarborGuard SHALL produce the briefing as a self-contained file in at least one of the following formats that the User can save or share: HTML, Markdown, or printable page.
4. WHEN the HarborGuard produces the Resilience_Briefing, THE HarborGuard SHALL complete generation and present the saveable or shareable output within 5 seconds of the request.
5. IF no Resilience_Assessment has been generated for the current selection, THEN THE HarborGuard SHALL reject the briefing request, retain the current selection without modification, and display a message stating that an assessment must be generated before a briefing can be produced.

### Requirement 8: Data Provenance and Category Distinctions (P0)

**User Story:** As a User, I want every value to carry its source and category, so that I can distinguish measured observations from model projections and AI recommendations.

#### Acceptance Criteria

1. THE HarborGuard SHALL record Data_Provenance for every dataset it uses, including source URL, retrieval date, units of measure, scenario definition where applicable, and a list of known limitations, with at least these five fields populated or explicitly marked "not applicable".
2. WHEN HarborGuard displays a data value, THE HarborGuard SHALL assign exactly one Data_Category to that value from the set {historical observation, future model projection, reference data, derived analysis, AI-generated recommendation} and SHALL display that category label adjacent to the value.
3. WHEN HarborGuard displays a value categorized as derived analysis, THE HarborGuard SHALL display references to the source dataset or datasets the value was derived from and the calculation method used to derive the value.
4. WHEN HarborGuard displays a data value, THE HarborGuard SHALL make the Source_Attribution for that value accessible to the User through a visible control or link that requires no more than one interaction to reveal.
5. WHERE a dataset has one or more known limitations recorded in its Data_Provenance, THE HarborGuard SHALL display the text of those limitations together with that dataset's Source_Attribution.
6. IF a required dataset's source URL and retrieval date cannot be matched against the recorded official source, THEN THE HarborGuard SHALL label that dataset with a data availability risk indicator and SHALL NOT display its values with any verified or confirmed status marker.
7. IF a displayed data value has no recorded Data_Category, THEN THE HarborGuard SHALL withhold that value from display and SHALL show an indication that the value's category is undetermined.
8. BEFORE any field of a supplied Hackachusetts dataset is used in HarborGuard, THE developer SHALL copy the supplied Hackachusetts ZIP datasets into the Kiro workspace and SHALL inspect and verify the fields of each copied dataset.
9. IF a supplied Hackachusetts dataset is missing or has not yet been copied into the workspace, THEN THE HarborGuard SHALL continue to run with the available data and SHALL NOT block initial application startup on the missing dataset.

### Requirement 9: Hackathon Deployability and Responsive Demo (P0)

**User Story:** As a solo developer, I want the application to run and present well in a live demo, so that I can show a working product within hackathon constraints.

#### Acceptance Criteria

1. THE HarborGuard SHALL run as a web application built with React, TypeScript, and Vite.
2. WHERE server-side processing is required for secure AI access or data processing, THE HarborGuard SHALL provide a lightweight Node backend for that processing.
3. THE HarborGuard SHALL operate without user login, payment collection, or a persistent server-side database, storing any required state in browser-local storage only.
4. WHILE the viewport width is at least 1024 pixels, THE HarborGuard SHALL display the Map_View and Context_Panel side by side.
5. WHILE the viewport width is below 768 pixels, THE HarborGuard SHALL stack the Map_View and Context_Panel vertically and keep all controls reachable without horizontal scrolling.
6. WHEN the application loads on a viewport between 768 and 1024 pixels wide, THE HarborGuard SHALL render the Map_View, Context_Panel, and all controls without content overflowing the viewport boundaries.
7. THE HarborGuard SHALL keep all AI API credentials server-side and SHALL NOT include those credentials in any asset, response, or script delivered to the browser.
8. WHEN the application is served from a single start command, THE HarborGuard SHALL become reachable in a browser within 60 seconds without additional manual configuration steps.

### Requirement 10: MC-FRM Source Verification (P0)

**User Story:** As a developer, I want to verify the actual Massachusetts Coast Flood Risk Model (MC-FRM) GIS source before building flood visualization, so that HarborGuard only ever displays real, licensed, correctly interpreted flood data.

#### Acceptance Criteria

1. BEFORE flood visualization is implemented, THE developer SHALL inspect and verify the actual Massachusetts Coast Flood Risk Model (MC-FRM) GIS source and SHALL record the endpoint or URL, the layer geometry type, the scenario year or years, the flood probability definition, the units, the spatial reference or coordinate system, the licensing or terms of use, and the availability of that source.
2. WHEN the developer records the MC-FRM verification details, THE HarborGuard SHALL store the recorded verification metadata as Data_Provenance for the MC-FRM source.
3. IF the Massachusetts Coast Flood Risk Model (MC-FRM) source cannot be verified, where cannot be verified means the source is unreachable, undocumented, or license-incompatible, THEN THE HarborGuard SHALL NOT display invented or placeholder flood geometry and SHALL display a message stating that verified flood data is unavailable.
