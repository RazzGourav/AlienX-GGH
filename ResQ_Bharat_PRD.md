# ResQ Bharat — Product Requirements Document

**Product:** ResQ Bharat  
**Tagline:** AI-assisted emergency intelligence and coordination for India  
**Document version:** 1.0  
**Status:** Hackathon MVP specification  
**Target build window:** 6 days  
**Base project:** Aegis — Autonomous Multi-Agent Crisis Command (`iamdanishm/aegis`)  
**Operating mode:** Simulation-first; human dispatcher remains in control

> **Safety and scope statement:** ResQ Bharat is a hackathon prototype. It does not create a new emergency number, replace India's ERSS-112, contact emergency services, dispatch real vehicles, or provide medical diagnosis. Use official emergency channels for real incidents. All stations, responders, availability, routes, and dispatch actions in the MVP are simulated unless explicitly marked otherwise.

---

## 1. Executive Summary

ResQ Bharat is an AI-assisted emergency intelligence layer designed to demonstrate how fragmented, multilingual incident reports could be converted into a single, reviewable incident record for a human dispatcher. It combines the multi-agent crisis-command concept demonstrated by Aegis with an India-focused workflow: Hindi/English and mixed-language reports, photo evidence, text and voice transcripts; a shared incident timeline; coordination proposals across multiple service types; and an explicit human approval handover.

India already operates ERSS-112 as a nationwide emergency response system with multiple intake channels and dispatch coordination. ResQ Bharat is therefore positioned as a **prototype enhancement layer** for information interpretation and operator handover, not a replacement for 112 or a claim that today's system lacks multimodal intake. The hackathon version uses realistic simulated data because genuine police, ambulance, hospital, fire-service and ERSS integrations require authorization, operational agreements, secure interfaces and approved data access.

The product's core demo is simple and observable: a dispatcher receives a Hindi road-accident transcript, a bystander's photo and a second short text report. ResQ Bharat extracts incident facts with source references, flags conflicting or missing details, proposes relevant service categories using deterministic rules, suggests simulated available resources and produces a structured handover. The operator reviews and edits the proposal before approving a simulated action. Every step is visible in an audit timeline.

## 2. Problem Statement

During a complex incident, the information available to an operator may be spread across messages, call transcripts, images and follow-up reports. These reports may use different languages, informal landmark descriptions, duplicate details, uncertain counts and contradictory locations. A single event may also require more than one service category, such as medical assistance plus police/traffic control or fire-and-rescue support.

The MVP explores whether an AI-assisted interface can reduce manual structuring effort without hiding uncertainty or removing human authority. It does not assume that AI can reliably establish truth from an image, infer a precise location from a vague landmark, or decide to dispatch resources by itself.

## 3. Product Vision and Differentiator

**Vision:** Help a human emergency operator turn scattered incident signals into a structured, evidence-linked and multi-service handover faster, while preserving human judgment and a clear audit trail.

**Differentiator:** Multilingual incident fusion plus dispatcher-ready handover. ResQ Bharat connects information across modalities and reports into one shared incident record; keeps each extracted fact linked to the report or image that supports it; highlights unknowns and conflicts; and turns the record into a proposed, human-approved coordination plan for the simulated Indian emergency-services environment.

The differentiator is not simply “a chatbot for emergencies” or “an AI that dispatches an ambulance.” It is the complete workflow from fragmented signal to reviewable incident record to coordinated handover.

## 4. Goals and Non-Goals

### 4.1 Goals

1. Accept text, pasted voice transcripts, and uploaded photographs as incident evidence.
2. Support Hindi and English in the MVP, including common mixed Hindi-English phrasing where feasible. Keep the original input unchanged and provide a normalized summary.
3. Produce a validated structured incident record with facts, unknowns, conflicts, source references, and qualitative evidence strength.
4. Group likely related reports as **candidate duplicates** and ask the operator to confirm before merging.
5. Recommend potentially relevant service categories—medical/ambulance, police/traffic, fire/rescue, disaster response—using explainable rules after AI extraction.
6. Present a multi-service coordination proposal with simulated station/resource availability and clearly labelled estimated distances.
7. Require explicit human review and approval before any simulated dispatch state changes.
8. Maintain an incident timeline and audit trail, including edits, approvals, rejections and simulation actions.
9. Demonstrate degraded-connectivity behavior without falsely claiming full offline AI inference.
10. Provide repeatable test scenarios and measurable prototype evaluation.

### 4.2 Non-Goals

- Replacing, bypassing or competing with ERSS-112 or creating a new emergency number.
- Calling, messaging or sending live dispatch instructions to police, hospitals, ambulance fleets, fire stations or government systems.
- Connecting to real operational databases, private CCTV, live vehicle telemetry or protected citizen records.
- Making autonomous life-critical decisions or dispatching real resources without authorized human operators.
- Diagnosing patients, prescribing treatment, estimating survival, or providing first-aid instructions beyond clearly approved static guidance.
- Claiming validated reductions in real emergency response times based only on a simulated demo.
- Guaranteeing language coverage, image interpretation or exact geolocation.

## 5. Target Users and Personas

| Persona | Need | Product response |
|---|---|---|
| Call-taker / dispatcher | Quickly structure an incoming report and see what is known versus unknown | Evidence-linked incident card with editable fields and a missing-information checklist |
| Dispatch supervisor | Review service needs and approve a handover | Multi-service proposal, visible rationale, explicit approve/reject controls and audit trail |
| Simulated field-service coordinator | See assigned simulated resource and status | Resource card with mock unit ID, availability, service type, distance and status timeline |
| Hackathon evaluator | Understand the AI contribution and safety limits | Reproducible scenario, visible agent outputs, human gate, metrics and simulation watermark |

## 6. Scope and Prioritization

### P0 — Required for the six-day MVP

- Existing Aegis dashboard runs locally and baseline is documented.
- Report intake: text and pasted transcript; optional image attachment.
- Gemini-powered structured extraction through a server-side call.
- Incident record schema with original sources, evidence references, missing fields and conflicts.
- Candidate duplicate matching based on time/location/type cues; operator confirms links.
- Deterministic service recommendation rules.
- Simulated stations/resources and distance-based suggestions using mock coordinates.
- Human review and approve/reject handover flow.
- Incident status, timeline, and audit events.
- Demo seed data, test suite, README, architecture notes and clear simulation disclaimer.

### P1 — Add only after P0 is reliable

- Better mixed-language handling and language toggle for the interface.
- Image annotations or region references to show what prompted a visual observation.
- Optional public-place lookup for resolving a place name or landmark; display source and timestamp and never treat a web result as proof that an emergency occurred.
- Browser-persisted drafts and queued edits during short connectivity loss.
- Operator-facing comparison of two conflicting reports and a “keep separate / link reports” action.

### P2 — Future work, not required for the demo

- Real audio capture and transcription, if the chosen browser/platform supports a reliable path.
- Additional Indian languages with tested datasets and native-speaker review.
- Controlled pilot with a public-sector or emergency-response partner.
- Secure, authenticated integration adapters after formal authorization and technical agreements.
- Production-grade offline synchronization, role-based access, monitoring, security review and disaster recovery.

## 7. Primary User Journey

1. **Receive:** The operator selects a scenario or creates a new report. They paste a transcript or text and optionally attach a photograph. The interface records source type, time received and a generated report ID.
2. **Understand:** Gemini identifies language, incident type, potential hazards, reported injuries/counts, time clues and location clues. It returns a constrained JSON object rather than free-form instructions.
3. **Validate:** The application validates the JSON with a schema, retains the original input, and renders each extracted fact with its supporting source. Missing or inconsistent details are shown as unresolved—not silently guessed.
4. **Relate:** A matching component lists possible duplicate or related reports. The operator chooses whether to link them to the same incident; there is no automatic merge in the MVP.
5. **Coordinate:** A deterministic rules engine proposes one or more service categories. The resource simulator lists matching mock units and facilities, availability, distance estimate and simulated constraints.
6. **Review:** The operator edits the incident facts, reviews evidence and uncertainty, changes suggested services if needed, then approves or rejects the proposal.
7. **Simulate:** On approval, the app changes a mock unit's status and appends an audit event. No real agency is contacted.
8. **Handover:** The application generates a concise handover summary showing confirmed/reported facts, unverified claims, conflicts, missing information, proposed services and approval history.

## 8. Functional Requirements

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-01 | Multimodal report intake | P0 | Operator can submit text or a pasted transcript; if image upload is enabled, the UI shows its filename and source ID. Failed uploads show a recoverable error. |
| FR-02 | Multilingual extraction | P0 | For provided Hindi and English fixtures, the system extracts the configured schema and preserves original source text. Unsupported or uncertain language is flagged, not silently rewritten. |
| FR-03 | Structured output validation | P0 | Invalid or incomplete model output does not enter the incident database as a trusted record; the operator sees a safe error and can retry or create a manual record. |
| FR-04 | Evidence-linked facts | P0 | Each reported fact displays source ID/type and a short supporting excerpt or visual observation reference. Unsupported values remain unknown. |
| FR-05 | Uncertainty and conflicts | P0 | Contradictory locations, injury counts or timestamps are surfaced for review; the app does not arbitrarily overwrite one report with another. |
| FR-06 | Incident grouping | P0 | Candidate duplicate reports are shown with matching reasons. The operator must confirm link/merge or keep separate. |
| FR-07 | Multi-service recommendation | P0 | Rule-based logic can recommend multiple service categories for one scenario and displays rule triggers; Gemini cannot directly execute a dispatch. |
| FR-08 | Resource simulation | P0 | Seeded mock resources show service type, unit ID, availability and distance estimate. UI visibly labels all resources and distances as simulated. |
| FR-09 | Human approval | P0 | Approve/reject is explicit. No simulated dispatch state changes before approval. Approval records operator/demo identity, time, selected services and proposal version. |
| FR-10 | Audit timeline | P0 | Submitted report, extraction result, operator edit, link confirmation, proposal, approval/rejection and simulated assignment appear chronologically. |
| FR-11 | Connectivity degradation | P0 | If the model/API is unavailable, the app preserves the draft and offers manual review; it never displays a fabricated “AI verified” result. |
| FR-12 | Simulation separation | P0 | Every simulated station, unit, assignment and route has a visible “SIMULATED DATA” label. No real dispatch endpoint exists in the MVP. |
| FR-13 | Handover report | P0 | Operator can view and copy/export a concise summary that separates reported facts, verified application facts, uncertainty and operator decisions. |
| FR-14 | Public web lookup | P1 | If implemented, the UI presents the query, source URL and retrieval time; result is context only and never proof of an incident or authorization to dispatch. |
| FR-15 | Draft queue | P1 | During short connectivity loss, local drafts remain available and sync only after an explicit or clearly indicated retry; duplicate submissions are prevented with idempotency keys. |

## 9. Incident Record and Evidence Model

Keep raw evidence and interpreted facts separate. The model may suggest a value, but the application owns validation and audit history.

### Core incident fields

- `incident_id`: stable ID generated by the application.
- `created_at`, `updated_at`, `status`: application-controlled timestamps and state.
- `incident_type`: road accident, fire, flood, structural incident, medical emergency, safety threat, other, unknown.
- `reported_language`: detected language(s); preserve the original source text.
- `location`: raw description, optional coordinates, geocoding state, and location confidence label (low/medium/high, treated as qualitative only).
- `reported_time`: time stated by source if available; keep separate from `received_at`.
- `reported_injuries`: structured reported count/range or `unknown`; not a medical assessment.
- `hazards`: source-backed reported hazards.
- `service_suggestions`: service category + rule IDs + rationale + operator disposition.
- `uncertainties`: missing, ambiguous or conflicting facts requiring review.
- `source_ids`: reports and attachments associated with the incident.
- `approval_state`: draft, awaiting_review, approved_for_simulation, rejected, simulated_assigned, closed.

### Source / evidence fields

- `source_id`, `incident_id`, `source_type` (`text`, `transcript`, `image`, optional `public_web_context`).
- `original_content_ref`: stored source text or controlled file reference.
- `received_at`, `language`, `reporter_label` (synthetic/pseudonymous for demo).
- `extracted_claims[]`: claim, source reference, excerpt or image observation, qualitative evidence strength, validation state.
- `conflicts[]`: claim variants, sources, and unresolved/decided state.

**Important:** Do not present an LLM-generated confidence number as a statistically calibrated probability. Use labels such as “strong source support,” “partial support,” or “needs review,” backed by source presence and validation rules. If numeric model scores are used internally, label them as uncalibrated and do not use them alone for critical prioritization.

### Example extraction contract (illustrative)

```json
{
  "language": "hi",
  "incident_type": "road_accident",
  "reported_time": null,
  "location": {
    "raw_description": "पुराने बस स्टैंड के पास, रायपुर रोड",
    "coordinates": null,
    "status": "needs_confirmation"
  },
  "reported_injuries": {
    "value": "unknown",
    "source_ids": ["src-001"]
  },
  "hazards": [
    {"value": "traffic_obstruction", "source_ids": ["src-001"]}
  ],
  "uncertainties": ["Exact location not confirmed", "Injury count not reported"],
  "proposed_service_categories": ["medical", "police_traffic"],
  "requires_human_review": true
}
```

The above is a schema illustration only, not real incident data. The service suggestions must be independently checked by deterministic application rules before they appear as an operator proposal.

## 10. Service Coordination and Rules Engine

Gemini interprets unstructured reports. Deterministic application code applies the approved prototype rules. This division makes decisions testable and helps avoid letting a generative model invent operational actions.

Example simulation rules:

- Reported collision plus reported injured person(s) → suggest `medical` for operator review.
- Collision causing blocked traffic or vehicle hazard → suggest `police_traffic` for operator review.
- Reported fire, smoke with fire indicators, trapped people or hazardous material → suggest `fire_rescue` for operator review.
- Flooding, building collapse or a large-scale hazard → suggest `disaster_response` for operator review.
- Ambiguous reports or conflicting location → preserve the incident and elevate the need for operator clarification; do not infer extra services solely from model speculation.

These are demonstration rules, not official Indian dispatch protocols. The UI must state this. No automatic priority score may be represented as an official risk category. In the simulation, priority labels should be described as “demo triage suggestion” and be editable by the operator.

## 11. Multi-Agent Design: Reuse, Adapt, Simplify

ResQ Bharat should reuse Aegis's existing UI, orchestration approach and simulation mechanisms where the repository and license permit. Avoid adding agents merely to increase the agent count; each module must have a testable responsibility.

| Aegis concept | ResQ Bharat adaptation | Guardrail |
|---|---|---|
| Coordinator | Normalizes new reports and sends typed evidence to the extraction/fusion flow | Cannot authorize dispatch; rejects unsupported file types and limits payload size |
| Triage agent | Extracts incident facts, reported hazards and unknowns into a schema | No diagnosis or life-critical autonomous decisions; output must pass schema validation |
| Surveillance / multimodal analysis | Describes only observable details from an uploaded photograph and links them to that source | Do not identify people, infer identities, or treat a photo as proof of time/location without corroboration |
| Logistics agent | Uses mock stations, mock units and simulated distance/availability to suggest candidates | No live dispatch endpoint; clearly mark routes and distances as estimates/simulation |
| Reporter agent | Generates a concise handover and an audit-friendly incident summary | Facts must map back to sources; label inferences and unresolved claims |
| Protocol Zero / human gate | Explicit review screen requiring operator approval before simulated assignment | Must be enforced in server-side state transitions, not only by a disabled button |

Recommended implementation: keep the current Next.js/TypeScript architecture unless the repository audit reveals a strong reason to change it. Use small server-side functions/services and typed contracts first. A true distributed multi-agent framework is not required for the six-day demo; sequential or parallel modular calls coordinated by one workflow are sufficient.

## 12. Proposed Technical Architecture

### Frontend

- Reuse Aegis's Next.js App Router, TypeScript, Tailwind/Shadcn components and dashboard shell.
- Main screens: incident feed, incident detail, evidence panel, map/resource panel, handover/approval panel, simulation controls.
- Keep visual priority focused on the most urgent *demo suggestion* while allowing operators to inspect other reports.

### Server-side application

- Report intake and file validation.
- Gemini client with typed request/response schemas.
- Schema validation and safe error handling.
- Incident/fact/source persistence.
- Duplicate candidate generation and operator-confirmed linking.
- Deterministic triage rules.
- Mock resource availability and distance calculation.
- Approval state machine and audit log.
- Handover report generator.

### Data storage

For the hackathon, use the repository's existing state/persistence pattern if stable; otherwise use a small local database or JSON seed fixtures. Keep a clear boundary between demo seed data and user-entered report records. A refresh should not silently convert a pending proposal into an approved assignment.

### Maps and resource simulation

Reuse the existing React Leaflet map where feasible. Seed mock stations and units in a single clearly labelled demo region. For distance, use a simple great-circle/Haversine estimate or existing tested helper; do not call it a live travel time. If a route provider is added, show its source, freshness and failure state, and do not make the demo depend on it.

### Gemini and secret management

- Use Gemini for multilingual extraction and optional image description, not for database writes or dispatch decisions.
- Prefer structured outputs with a defined JSON schema and validate again in the application.
- The Gemini API key must be server-side only (for example, `GEMINI_API_KEY`); never expose it through a `NEXT_PUBLIC_*` variable or browser bundle.
- Add request timeout, bounded retries, payload/image limits and a graceful no-AI fallback.
- Treat report content, especially images and pasted text, as untrusted input. Do not follow instructions embedded inside evidence. Model output must not be allowed to issue arbitrary tools or code.

### Connectivity-aware behavior

- When the API/network is unavailable, preserve the typed draft locally and show “AI analysis unavailable — manual review required.”
- Queue only safe draft/update operations; never queue a hidden dispatch command.
- Use idempotency IDs to prevent a retry from creating duplicate reports or repeated simulated assignments.
- Show last-synced time and pending changes. Clearly distinguish browser-local draft state from persisted server state.
- Do not claim that Gemini inference works offline. The offline feature is graceful degradation and draft preservation only.

## 13. Suggested API / Workflow Contracts

The existing app may use server actions rather than REST endpoints. Implement equivalent contracts in the repository's established pattern; these names are logical boundaries, not a requirement to add a separate backend.

| Operation | Purpose | Expected behavior |
|---|---|---|
| `POST /api/reports` | Create a report from text/transcript and optional image metadata | Return `report_id`, intake status and received timestamp |
| `POST /api/reports/{id}/extract` | Run schema-constrained extraction | Return validated claims, source references, uncertainties and model status |
| `POST /api/incidents/{id}/link-report` | Link a report after operator review | Record operator decision and audit event; prevent duplicate linkage |
| `POST /api/incidents/{id}/proposal` | Generate deterministic multi-service proposal | Return service categories, rule IDs, mock resources and simulated distances |
| `POST /api/incidents/{id}/decision` | Approve/reject the current proposal version | Enforce allowed state transitions on the server and append audit event |
| `GET /api/incidents/{id}/handover` | Build a handover summary | Separate source-reported, unresolved, operator-entered and simulated fields |

## 14. Non-Functional Requirements

- **Reliability:** Model/API failure cannot crash the entire dashboard or corrupt the incident state.
- **Traceability:** Every suggested service and every displayed extracted fact can be traced to a rule, source or operator edit.
- **Latency:** Target a smooth demo rather than a claimed emergency-response SLA. Log extraction time and show loading/retry states. Run independent extraction tasks in parallel only when safe.
- **Accessibility:** Readable contrast, keyboard navigability, explicit labels, no color-only status indicators, responsive layout.
- **Privacy:** Use synthetic demo scenarios and pseudonymous reporter labels. Do not solicit or store real emergency callers' personal data for the hackathon.
- **Security:** Server-side secret handling, upload validation, file size/type limits, safe rendering of user text, dependency checks and no public exposure of real credentials.
- **Auditability:** Append-only event history for important state transitions. Never overwrite original source content with normalized text.
- **Portability:** Clear setup steps and `.env.example` with placeholders only.

## 15. Six-Day Phase-Wise Development Plan

The schedule assumes the Aegis repository is cloned first and its baseline runs locally. If the repository structure or dependencies differ from its README, update the plan after the Day 1 audit rather than forcing an architecture rewrite.

### Phase 0 — Repository audit and safe fork (Day 1, first half)

**Tasks**
1. Clone `https://github.com/iamdanishm/aegis.git` and create a working branch named `resq-bharat-mvp`.
2. Check the repository license before publishing a derivative. A public GitHub repository is not automatically licensed for unrestricted reuse; if no license grants the necessary rights, seek permission or use the repo as a reference and implement independently.
3. Read `README.md`, `CONTEXT.md`, `GEMINI.md`, environment setup, simulation fixtures, agent modules, persistence approach and tests.
4. Install dependencies, configure secrets locally and run the untouched application.
5. Record baseline screens, existing working features, known bugs and the exact start command.
6. Replace any browser-exposed API key pattern with server-only secret handling before adding features.
7. Map the likely change areas, then confirm them against the checked-out code: `src/agents/` (agent roles), `src/components/` (dashboard and evidence panels), `src/hooks/` (simulation state), `src/lib/` (Gemini client and validation), and `src/simulation/` (deterministic scenario fixtures).

**Deliverable:** A running baseline, repository map, license decision, task list and clean Git branch.  
**Exit gate:** The demo baseline starts locally and the team knows which files own intake, agent orchestration, map, simulation state and UI.

### Phase 1 — Indian-context intake and incident schema (Day 1 second half–Day 2)

**Tasks**
1. Define TypeScript/Pydantic-equivalent types for `Report`, `Source`, `Claim`, `Incident`, `Uncertainty`, `ServiceProposal`, `MockResource` and `AuditEvent`.
2. Add a report intake panel with source type, source time, language and raw content retention.
3. Add Hindi and English transcript fixtures plus a mixed-language edge case.
4. Add optional photograph input if the existing Gemini client supports it; otherwise ship text/transcript intake first and mark image analysis as P1 until it works reliably.
5. Update the extraction prompt and structured schema to require unknowns instead of inventing missing facts.
6. Validate responses server-side; implement retry/manual-entry fallback and request limits.

**Deliverable:** A submitted Hindi/English report becomes a typed, source-linked record.  
**Exit gate:** Valid and malformed model output are handled safely; original input is always retained.

### Phase 2 — Evidence, uncertainty and report fusion (Day 3)

**Tasks**
1. Represent extracted facts as claims that cite one or more source IDs.
2. Build a comparison panel for conflicting location, time, injury-count and hazard reports.
3. Generate duplicate candidates using deterministic checks (time window, incident category and normalized place clues); optionally use embeddings/LLM only as a secondary hint if time permits.
4. Require operator confirmation before linking/merging reports.
5. Add evidence strength labels based on source support and validation—not uncalibrated model confidence.
6. Add tests for hallucinated/unsupported fields, contradictory reports and accidental merges.

**Deliverable:** Several separate reports can be reviewed as one candidate incident without losing source history.  
**Exit gate:** Uncertainty is visible and duplicate linkage is reversible/audited.

### Phase 3 — Multi-service coordination and simulated resources (Day 4)

**Tasks**
1. Implement deterministic triage rules with rule IDs and short operator-readable rationales.
2. Create a small seed dataset of mock police/traffic, ambulance/medical and fire/rescue stations and units in one demo region.
3. Show resource service type, status, mock unit ID, coordinates and estimated distance.
4. Support one incident proposing more than one service category.
5. Implement an approval state machine: `draft → awaiting_review → approved_for_simulation → simulated_assigned`; rejected proposals cannot assign resources.
6. Add operator override and record both AI suggestion and final operator decision.

**Deliverable:** A road-accident or fire scenario proposes multiple simulated services with a review-and-approve gate.  
**Exit gate:** No action can be simulated as assigned without an explicit server-validated approval event.

### Phase 4 — Dispatcher handover, audit timeline and low-connectivity behavior (Day 5)

**Tasks**
1. Build the incident-detail workflow: evidence, uncertainties, proposed services, mock map/resources and approval panel.
2. Add a chronological timeline for reports, extraction, edits, report links, proposal, approval/rejection and simulated assignment.
3. Generate a copyable/exportable handover summary that labels reported facts, unresolved facts, operator edits and simulated assignments.
4. Add API-down and timeout states, preserved drafts, last-synced status and idempotent retries.
5. Keep the UI focused: show the most important unresolved facts first; avoid flooding the screen with raw agent reasoning.

**Deliverable:** A dispatcher can review the complete incident and produce a useful handover despite a temporary API/network failure.  
**Exit gate:** No fake success message or hidden dispatch action appears when the service/API is unavailable.

### Phase 5 — Evaluation, hardening and submission demo (Day 6)

**Tasks**
1. Create a seeded evaluation pack covering a Hindi road accident, English fire report, flood report, duplicate report, conflicting location, missing location, image-only ambiguity and Gemini/API failure.
2. Run the same fixtures through the application and record extraction/schema pass rate, fact accuracy, service category accuracy, duplicate-link precision and end-to-end operator workflow time.
3. Fix critical UI, security and error-handling defects; remove all secrets and real personal data from fixtures and screenshots.
4. Write README, architecture diagram, setup instructions, limitations, test results and attribution/license notes.
5. Record a deterministic demo path and fallback screenshots/video if live API quota/network fails.
6. Confirm every UI state that changes an assignment is simulation-labelled and human-approved.

**Deliverable:** Reproducible demo, tests, documented limitations and a clean public repository if licensing permits.  
**Exit gate:** Team can clone the final repo on a clean machine, configure a key, run the app and complete the demo without real-system integrations.

## 16. Demo Scenario and Script

**Scenario:** A bystander submits a Hindi transcript saying there has been a collision near an old bus stand on a named road; another report says traffic is blocked; a photograph may show two vehicles but does not establish exact location, injury severity or precise people count.

1. Submit the transcript and photo as separate source records.
2. Show original Hindi and the normalized summary side by side.
3. Highlight source-linked claims: collision reported, traffic obstruction reported, exact location not confirmed, injury count unknown.
4. Add the second report and show it as a candidate link with matching clues; the operator confirms it belongs to the same incident.
5. Show rule-based proposals for medical and police/traffic support, with the rules and uncertainty displayed.
6. Show nearby simulated units and estimated distances with a permanent simulation label.
7. Try to assign without approval; the application blocks it. Review and approve the proposal; the simulated unit status changes and an audit event appears.
8. Disconnect or simulate an API error; show the draft is preserved and AI analysis is marked unavailable, not falsely completed.
9. Generate a handover summary separating source-reported facts, unresolved fields, operator decisions and simulated actions.

**Demo success condition:** Viewers can see a full, coherent, safety-bounded workflow—not just agent animations or a map with fictional moving dots.

## 17. Evaluation Plan and Success Metrics

Metrics are measured on a fixed synthetic fixture set; do not interpret them as proof of real-world operational readiness.

| Metric | Method | MVP target |
|---|---|---|
| Schema-valid extraction rate | Valid structured outputs / extraction attempts on fixtures | ≥ 90% after bounded retry on test fixtures |
| Core fact accuracy | Manually labelled core fields compared with extracted values | Report measured value; target ≥ 85% on the narrow supported fixture set |
| Unsupported-claim rate | Extracted non-empty facts without source support | 0 for required tested fields; fail test if unsupported location/injury count is invented |
| Service suggestion accuracy | Proposed service categories compared with scenario labels | Report precision/recall on the small labelled set; target ≥ 85% precision for MVP fixtures |
| Duplicate-candidate quality | Precision/recall of candidate links on known related/unrelated pairs | Report measured values; human confirmation remains mandatory |
| Approval enforcement | Attempt state transitions without approval | 100% blocked in automated tests |
| Audit coverage | Required events present after demo workflow | 100% for specified critical state transitions |
| Degraded-mode behavior | Force timeout/API-key error/network interruption | Draft preserved; no false AI completion or assignment success |
| Operator workflow time | Time to produce a handover on same synthetic scenario, manual baseline vs ResQ Bharat | Report both times; do not claim real-world response-time improvement |

## 18. Test Strategy

- **Unit tests:** schema validation, rule engine, distance helper, state transition guards, duplicate matching and idempotency.
- **Contract tests:** Gemini output valid/invalid cases, missing fields, malformed JSON, timeout, rate limit and unexpected model output.
- **Scenario tests:** multilingual road accident, fire, flood, conflicting reports, uncertain location, repeated/duplicate report and image that does not prove a reported fact.
- **Security tests:** ensure API key absent from client bundle; reject oversized/unsupported files; escape user text; ensure evidence cannot instruct agents to bypass rules; inspect logs for leaked raw sensitive content.
- **UI tests:** explicit simulation labels, visible uncertainty, source IDs, keyboard focus and approval controls.
- **End-to-end test:** one scenario from report intake to approved simulated assignment and handover export.

## 19. Risks and Mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Aegis repository license unclear | A derivative may not be legally redistributable | Verify license on Day 1; get permission or build independently if rights are not granted |
| Model invents a location, injury count or certainty | Could make the handover misleading | Preserve raw source, require source-linked claims, unknown-by-default fields, schema validation and operator review |
| Broad multi-agent architecture consumes the six-day window | Core workflow may remain incomplete | Reuse existing modules; build one vertical slice first; use deterministic rules and only essential agent calls |
| Live Google Search or map services fail | Demo becomes unreliable or key-dependent | Seed deterministic fixtures; make web lookup optional and show source/freshness when used |
| Mock data looks like a real dispatch system | Risks misleading evaluators or users | Persistent simulation banner, fictional unit IDs and coordinates, no live dispatch endpoint, clear demo-only copy |
| Browser-exposed API key | Key theft/quota abuse | Server-only environment secret; audit bundle and deployment settings |
| Weak or interrupted connectivity | Work may be lost or repeated | Draft persistence, explicit pending/synced state, bounded retries and idempotency; no offline-AI claims |
| Conflicting reports merged incorrectly | Distinct emergencies could be conflated | Candidate-only matching, human confirmation, reversibility and audit log |
| Overstated impact claims | Synthetic performance may not transfer to real operations | Publish fixture methodology, sample size and limitations; report measured prototype metrics only |

## 20. Deployment, Environment and Repository Workflow

### Initial setup

```bash
git clone https://github.com/iamdanishm/aegis.git resq-bharat
cd resq-bharat
git checkout -b resq-bharat-mvp
npm install
```

Then follow the repository's current documented environment setup and start command. Do not paste API keys into source files or commit them. Create a local `.env.local` or the repository's expected server environment file with a server-only variable such as:

```bash
GEMINI_API_KEY=replace_with_your_own_key
```

The repository's README may evolve; confirm current supported Node version, package scripts, model names and API integration before implementation. Do not assume environment variable names in this PRD are a drop-in match for the checked-out code.

### Branch and publishing practice

- Keep the original Aegis remote as `upstream` only if licensing permits the intended reuse workflow; push to your own repository only after license review.
- Commit in small vertical slices: baseline, intake/schema, evidence fusion, rules/resources, human gate, tests/docs.
- Never commit `.env.local`, API keys, unredacted incident data or credentials.
- Add screenshots that show mock labels and contain only synthetic scenarios.
- Document all material reused from Aegis and honor its license and attribution conditions.

## 21. Definition of Done

ResQ Bharat MVP is ready for judging when:

- [ ] The app starts from documented clean-machine instructions.
- [ ] A Hindi/English report becomes a schema-validated incident while its original source is preserved.
- [ ] At least two reports and one optional photograph can be reviewed together with source-linked claims.
- [ ] Unknowns and conflicting data are visible and not silently guessed.
- [ ] Candidate duplicates require operator confirmation.
- [ ] One incident can propose at least two service categories.
- [ ] Resource availability and distance are clearly labelled simulated.
- [ ] An assignment cannot be created without a server-enforced approval event.
- [ ] Audit timeline and handover report show evidence, uncertainty and the final operator decision.
- [ ] API/network failure preserves the draft and does not imply AI completion.
- [ ] Tests cover state guards, schema failures and core scenarios.
- [ ] No secrets or real emergency personal data are present in the repository.
- [ ] README clearly states the integration boundary: ResQ Bharat enhances the concept of ERSS-112 as a prototype, but has no live ERSS or agency integration.
- [ ] Repository licensing/permissions have been reviewed before publishing a derivative.

## 22. Sources and Reference Material

1. **Aegis — Autonomous Multi-Agent Crisis Command, official public repository.** Architecture summary, repository layout, simulation-first approach and setup instructions: https://github.com/iamdanishm/aegis
2. **Aegis — Devpost project page.** Agent roles, multimodal crisis-command concept and human-approval safeguard: https://devpost.com/software/aegis-autonomous-multi-agent-crisis-command
3. **Ministry of Home Affairs, Government of India — ERSS.** ERSS-112 as a unified emergency response system and its intake/dispatcher workflow: https://www.mha.gov.in/en/commoncontent/emergency-response-support-system-erss
4. **112 India — Features.** Official overview of current 112 capabilities, including multi-channel signals, GIS and dispatch-related functionality: https://112.gov.in/features
5. **Google AI for Developers — Gemini structured outputs.** Schema-constrained output for extracting structured data from unstructured input: https://ai.google.dev/gemini-api/docs/structured-output

**Source-grounded product positioning:** Since ERSS-112 already supports multiple channels and service coordination, ResQ Bharat's hackathon claim should focus on the prototype's evidence-linked multilingual fusion, uncertainty presentation and structured human handover—not on inventing a national emergency number or claiming no such system exists.

---

**Final product statement:** ResQ Bharat is a simulation-first, human-in-the-loop emergency intelligence prototype that fuses fragmented multilingual incident evidence into a structured, auditable, multi-service handover for a dispatcher workflow inspired by—and designed in principle to complement—India's existing ERSS-112 ecosystem. It is not connected to live emergency operations.
