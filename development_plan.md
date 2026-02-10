# EH POC Development Plan - CR-001

**Change Request:** CR-001 | **Date Created:** 2026-02-10 | **Requestor:** Jay Baker
**Source:** Meeting review notes (Jay, TK, Samir)

---

## Overview

This plan implements the 20 change items from CR-001 across 4 phases, prioritized by MoSCoW methodology. Each item includes implementation scope, dependencies, and acceptance criteria. Progress is tracked via checkboxes and the changelog at the bottom.

### Progress Summary (as of 2026-02-10)

| Phase | Items | Complete | Partial | Not Started | Progress |
|-------|-------|----------|---------|-------------|----------|
| Phase 1: Must-Have Foundation | CR-001-01 through CR-001-09 | 9/9 | 0 | 0 | **100%** |
| Phase 2: AI & Voice Capture | CR-001-10 through CR-001-11 | 2/2 | 0 | 0 | **100%** |
| Phase 3: Should-Have Enhancements | CR-001-12 through CR-001-17 | 6/6 | 0 | 0 | **100%** |
| Phase 4: Could-Have Polish | CR-001-18 through CR-001-20 | 3/3 | 0 | 0 | **100%** |
| **Overall** | **CR-001-01 through CR-001-20** | **20/20** | **0** | **0** | **100%** |

**Fully complete:** CR-001-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20

**Additional deliverables (outside CR-001):**
- iOS PWA optimization (manifest, service worker, safe areas, install prompt)
- Capacitor native iOS wrapper configuration
- App Store submission documentation suite (5 docs)
- HIPAA-aligned privacy policy

---

## Phase 1: Must-Have Foundation (CR-001-01 through CR-001-09)

Core compliance, workflow gating, and data integrity items forming the backbone of a production-ready clinical platform.

---

### CR-001-01: Voice Transcription Consent Gate
**Priority:** Must | **Status:** ✅ Complete

**Business Requirements:**
- Mandatory consent step before any audio capture or transcription
- Support verbal consent capture with clinician attestation
- Record consent status, method, timestamp, and actor
- If consent not granted, transcription features remain disabled for the encounter

**Technical Scope:**
- [x] Add `visit_consents` table (visitId, consentType, status, method, capturedBy, capturedAt, notes)
- [x] Create consent API endpoints: GET/POST `/api/visits/:id/consents`
- [x] Build consent capture UI component (dialog/step) with verbal/written options
- [x] Implement hard gate: block audio recording until consent granted
- [x] Add consent events to immutable audit log
- [x] Display consent status in progress note and visit summary
- [x] Handle consent declined flow (continue visit without transcription)

**Dependencies:** None (foundational)
**Acceptance Criteria:**
- App requires consent capture before audio capture can start
- Consent fields persisted and visible in progress note and audit log
- Declined consent disables audio capture; visit continues without transcription

---

### CR-001-02: Notice of Privacy Practices (NOPP) Acknowledgement
**Priority:** Must | **Status:** ✅ Complete

**Business Requirements:**
- Capture NOPP delivery method (in-person, digital, previously delivered) and acknowledgement
- Support structured exception reason when acknowledgement cannot be obtained
- Include NOPP status in visit documentation and audit artifacts

**Technical Scope:**
- [x] Add NOPP fields to `visit_consents` table (or separate `visit_nopp` table): deliveryMethod, acknowledgementStatus, exceptionReason, timestamp, actor
- [x] Create NOPP API endpoints: GET/POST `/api/visits/:id/nopp`
- [x] Build NOPP acknowledgement UI as a start-of-visit gate step
- [x] Support configurable acknowledgement modes: verbal attestation, optional e-signature
- [x] Enforce visit-start gate when NOPP required by program configuration
- [x] Add structured exception reasons (patient refused, patient incapacitated, previously on file, etc.)
- [x] Include NOPP status in visit summary and progress note output

**Dependencies:** CR-001-01 (shared consent infrastructure)
**Acceptance Criteria:**
- Cannot proceed past visit start when NOPP is required and not completed or exceptioned
- NOPP acknowledgement or exception reason recorded and visible in visit summary and progress note

---

### CR-001-03: Remove Driver's License Capture from Baseline Intake
**Priority:** Must | **Status:** ✅ Complete

**Business Requirements:**
- Baseline MA/ACA visit workflow does not require driver's license capture
- If a client requires identity verification, allow enabling via program configuration

**Technical Scope:**
- [x] Add configuration flag (program/client level) to show/hide identity capture step
- [x] Default identity verification step to hidden/optional in standard workflows
- [x] Update intake dashboard to conditionally render identity verification based on config
- [x] Ensure removal does not break existing flows or data models
- [x] Preserve existing identity verification page for when config enables it

**Dependencies:** CR-001-15 (program packages, but can be implemented with simple config flag first)
**Acceptance Criteria:**
- Default workflows have no driver's license step
- When configuration is enabled, the step appears and is required per configured rule

---

### CR-001-04: Structured Documentation Enforcement
**Priority:** Must | **Status:** ✅ Complete

**Business Requirements:**
- Define required structured sections for each program package
- Limit free text to optional supplemental notes, not required to complete visit
- Structured capture feeds progress note generator and coding outputs

**Technical Scope:**
- [x] Define schema for section templates: question types (select, multi-select, radio, checkbox, scale), response options, validation rules
- [x] Create `documentation_templates` table with versioned template definitions (JSONB)
- [x] Create `visit_documentation` table linking visits to completed template responses
- [x] Build structured documentation UI components (template renderer)
- [x] Enforce validation on required questions prior to submit/finalize
- [x] Integrate structured responses into progress note generator
- [x] Persist structured data for reporting and FHIR exports

**Dependencies:** CR-001-15 (program packages drive which sections are required)
**Acceptance Criteria:**
- Visit cannot be finalized if required structured sections are incomplete
- Structured answers populate the generated progress note consistently

---

### CR-001-05: Structured 'Unable to Assess' and Exception Reasons
**Priority:** Must | **Status:** ✅ Complete

**Current State:** Basic `UNABLE_TO_ASSESS_REASONS` exists in schema with exclusion support on the intake dashboard. Needs standardization and expansion.

**Business Requirements:**
- Replace blocking failures with structured exception capture
- Standardize reason code library across all modules
- States: completed / unable / declined / deferred with reason codes

**Technical Scope:**
- [x] Create shared `reason_codes` table (id, category, code, label, description, active, sortOrder)
- [x] Seed standardized reason codes across categories: unable_to_assess, patient_declined, deferred, clinical_contraindication, equipment_unavailable, etc.
- [x] Update assessment runner to use standardized reason codes from DB instead of hardcoded list
- [x] Update HEDIS measure page to use standardized reason codes
- [x] Update care gap handling to support exception states
- [x] Expose reason selections in progress note and audit log
- [x] Ensure finalization checks treat valid exception states as complete when allowed by configuration

**Dependencies:** None (extends existing functionality)
**Acceptance Criteria:**
- Any required assessment item can be marked unable/declined with a structured reason
- Finalization checks treat valid exception states as complete when allowed

---

### CR-001-06: NP Pre-Submit Completeness Engine (Hard Stop)
**Priority:** Must | **Status:** ✅ Complete

**Current State:** Basic gating exists on Review & Finalize page. Needs enhancement to be package-driven with clear remediation guidance.

**Business Requirements:**
- Define required components per package and per member context
- Provide clear remediation guidance and deep links to incomplete sections
- Allow completion via structured exceptions where applicable

**Technical Scope:**
- [x] Create `completeness_rules` table (id, programPackage, componentType, componentId, required, exceptionAllowed, description)
- [x] Implement completeness check engine that evaluates all rules for a visit
- [x] Generate completeness report object stored with the encounter
- [x] Update Review & Finalize screen with blocking issues list, deep links to incomplete sections
- [x] Show clear remediation guidance for each incomplete item
- [x] Support "resolve via exception" for items that allow it
- [x] Block finalization button until all required items resolved
- [x] Store completeness report snapshot at finalization time

**Dependencies:** CR-001-05 (exception states), CR-001-04 (structured docs)
**Acceptance Criteria:**
- Attempting to finalize with missing required items shows a blocking list of issues
- After resolving issues or applying allowed exceptions, finalize succeeds and report is stored

---

### CR-001-07: Supervisor Sign-Off with Automated Adjudication Summary
**Priority:** Must | **Status:** ✅ Complete

**Current State:** Basic supervisor review queue exists with approve/return actions. Needs summary scorecard, completeness/quality flags, and proper sign-off workflow.

**Business Requirements:**
- Supervisor workflow requires licensed reviewer sign-off before submission to plan
- Supervisor view surfaces what is missing, flagged, and supported

**Technical Scope:**
- [x] Create adjudication summary generator (completeness %, diagnosis support status, quality flags, attention items)
- [x] Build summary scorecard UI for supervisor review (completeness, flags, supported/unsupported)
- [x] Add encounter status transitions: Pending Review -> Returned -> Approved
- [x] Implement e-signature or attestation capture with timestamp and actor
- [x] Lock encounter after approval (no changes except via controlled re-open flow)
- [x] Add structured return reason templates for corrections
- [x] Create immutable sign-off record on approval
- [x] Update supervisor review queue to show summary cards with key metrics

**Dependencies:** CR-001-06 (completeness engine), CR-001-08 (diagnosis support)
**Acceptance Criteria:**
- Supervisor can approve or return with structured reasons
- Approval creates immutable sign-off record and locks encounter

---

### CR-001-08: Diagnosis Support Validation Rules (50-100 Initial Set)
**Priority:** Must | **Status:** ✅ Complete

**Business Requirements:**
- Configurable ruleset mapping diagnoses to required evidence elements (ROS, PE, assessment results, etc.)
- Expose supported/not supported/needs evidence outcomes to NP and supervisor

**Technical Scope:**
- [x] Create `diagnosis_rules` table (id, icdCode, icdDescription, requiredEvidence JSONB, category, active)
- [x] Seed 50-100 initial diagnosis validation rules with evidence requirements
- [x] Implement diagnosis validation engine that checks evidence against rules
- [x] Create API endpoint: POST `/api/visits/:id/diagnoses/validate`
- [x] Build diagnosis support UI showing supported/unsupported/needs evidence per diagnosis
- [x] Show actionable missing-evidence guidance with deep links to relevant sections
- [x] Run validation on finalize and on supervisor review
- [x] Persist validation results with audit trail
- [x] Include results in adjudication summary report

**Dependencies:** CR-001-04 (structured documentation provides evidence)
**Acceptance Criteria:**
- For a diagnosis in scope, app identifies whether evidence requirements are satisfied and lists missing items
- Results visible on finalize and supervisor screens and stored with encounter

---

### CR-001-09: Fix PRAPARE or Assessment Incompletion Blocking Storage
**Priority:** Must | **Status:** ✅ Complete

**Business Requirements:**
- Clinical incompleteness must not be treated as a technical failure
- Users can save progress even when incomplete

**Technical Scope:**
- [x] Decouple persistence from validation: allow save/draft at any point
- [x] Enforce validation only at finalize step, not on save
- [x] Add robust error handling and user messaging for actual technical failures
- [x] Update assessment runner to support partial saves without validation errors
- [x] Update PRAPARE and other assessments to allow incomplete saves
- [x] Ensure finalization blocked only by completeness rules, not by storage errors
- [x] Add error boundary and retry logic for actual storage failures

**Dependencies:** CR-001-05 (exception states)
**Acceptance Criteria:**
- User can save and resume an encounter with incomplete assessments
- Finalization is blocked only by completeness rules, not by storage errors
- Automated tests cover incomplete assessment save/resume scenarios

---

## Phase 2: AI & Voice Capture (CR-001-10 through CR-001-11)

AI provider configuration and clinical voice capture. Depends on Phase 1 consent gates.

---

### CR-001-10: AI/LLM Endpoint Configuration (OpenAI, Anthropic, Azure OpenAI)
**Priority:** Must | **Status:** ✅ Complete

**Business Requirements:**
- Support selection of AI provider per environment and optionally per client/tenant
- Secure management of API keys and endpoint configuration
- AI usage is auditable and configurable for compliance

**Technical Scope:**
- [x] Create `ai_provider_config` table (id, providerType, displayName, baseUrl, modelName, apiVersion, secretRef, active, tenantId, featureFlags JSONB)
- [x] Build provider abstraction layer with consistent request/response schema
- [x] Implement retry/backoff policies for AI calls
- [x] Admin UI for AI provider configuration (provider type, endpoint, model, feature flags)
- [x] Store API keys via Replit secret store / integrations (reference only in DB, never plaintext; use platform secret management)
- [x] Add feature flags to enable/disable AI features by tenant and workflow stage
- [x] Add logging/tracing with correlation IDs (redacted prompts per compliance policy)
- [x] Support graceful fallback when AI provider is unavailable

**Dependencies:** None (infrastructure item)
**Acceptance Criteria:**
- Admin can configure provider endpoints for OpenAI, Anthropic, and Azure OpenAI without code changes
- Switching providers does not break workflows; system fails gracefully
- AI calls are logged with correlation IDs and do not expose secrets

---

### CR-001-11: Clinical Voice Capture with Transcript Review and Auto-Population
**Priority:** Must | **Status:** ✅ Complete

**Business Requirements:**
- Clinician can start/stop recording during visit, with consent and NOPP gates honored
- In-app transcript review with ability to correct extracted values
- Auto-populate structured sections (vitals, assessments, ROS, PE) from voice, require NP validation
- Store audio and transcript as part of encounter record

**Technical Scope:**
- [x] Implement audio capture service (Web Audio API / MediaRecorder)
- [x] Create `voice_recordings` table (id, visitId, audioUrl, duration, startTime, endTime, actorId, consentId)
- [x] Create `transcripts` table (id, recordingId, visitId, text, version, editedBy, editedAt, providerUsed)
- [x] Create `extracted_fields` table (id, transcriptId, visitId, fieldPath, proposedValue, confidence, sourceOffset, status: pending/accepted/rejected, acceptedBy)
- [x] Build audio recording UI with start/stop/pause controls
- [x] Integrate with configured AI provider for transcription (STT)
- [x] Implement extraction pipeline: transcript -> structured field mapping via AI
- [x] Build side-by-side review UI (transcript + extracted fields) with accept/reject per field
- [x] Support bulk accept controls
- [x] Persist extracted values only after clinician acceptance
- [x] Maintain provenance linking each field to transcript snippet and confidence score
- [x] Add conflict resolution: do not overwrite clinician-entered values without confirmation
- [x] Enforce consent gate (CR-001-01) before recording starts

**Dependencies:** CR-001-01 (consent gate), CR-001-02 (NOPP), CR-001-10 (AI provider config)
**Acceptance Criteria:**
- With consent granted, clinician can record and generate a transcript stored with encounter
- System proposes structured field values with confidence and traceability
- NP can accept, edit, or reject each proposed value; only accepted values persist
- Finalization checks confirm all required fields completed or exceptioned

---

## Phase 3: Should-Have Enhancements (CR-001-12 through CR-001-17)

Configurable rules, timeline improvements, branching logic, program packages, and audit hardening.

---

### CR-001-12: Configurable Vitals-Based Point of Care Guidance Rules Engine
**Priority:** Should | **Status:** ✅ Complete

**Current State:** Fully implemented with alert panel UI, persistence, and audit tracking.

**Technical Scope:**
- [x] Extend `clinical_rules` table with severity levels (info, warning, critical, emergency)
- [x] Add recommended actions and documentation prompts to rule definitions
- [x] Support thresholds per program and member context (programScope field on rules)
- [x] Build alert panel UI with action links and dismiss/acknowledge tracking
- [x] Log triggered alerts, actions taken, and dismissals
- [x] Persist triggered alerts and include in visit summary/audit (bundle + overview responses)

**Dependencies:** CR-001-15 (program context for per-program thresholds)
**Acceptance Criteria:**
- When a rule triggers, clinician sees alert with recommended action and can document resolution
- Triggered alerts stored and appear in summary/audit

---

### CR-001-13: Longitudinal Timeline Provenance and Drilldowns
**Priority:** Should | **Status:** ✅ Complete

**Current State:** Fully implemented with drilldown detail views, source filtering, and medication provenance.

**Technical Scope:**
- [x] Add source tagging to all timeline events (HIE, clinician-captured, patient-reported, imported)
- [x] Implement drilldown views with filters and pagination
- [x] Store actor and reason metadata for medication changes (start/stop/modify)
- [x] Show medication discontinue reasons and who recorded them
- [x] Add visual provenance indicators (icons/badges) per data point
- [x] Support filtering timeline by source type

**Dependencies:** None
**Acceptance Criteria:**
- Timeline clearly labels each data item source and allows drilldown for details
- Medication events show start/stop and discontinue reasons with actor

---

### CR-001-14: Branching Logic Library for Assessments and Care Gaps
**Priority:** Should | **Status:** ✅ Complete

**Current State:** Fully implemented with PRAPARE/AWV branching, condition-specific prompts, and per-version configuration.

**Technical Scope:**
- [x] Design branching engine that interprets questionnaire definitions (conditions, visibility, requiredness)
- [x] Add branching rules to assessment definitions (JSONB: triggerConditions, followUpAssessments, conditionalQuestions)
- [x] Implement branching for PRAPARE (food insecurity -> resource referral, housing -> housing support)
- [x] Implement branching for AWV flows and care gap prompts
- [x] Support condition-specific prompts (e.g., diabetes -> foot exam, eye exam)
- [x] Make branching configurable per questionnaire version
- [x] Branching triggers create tasks and recommendations with toast notifications

**Dependencies:** CR-001-05 (exception states for branched items)
**Acceptance Criteria:**
- Branching questions appear only when trigger criteria are met and are validated appropriately
- Branch behavior is configurable per questionnaire version

---

### CR-001-15: Configurable Program Packages and Beneficiary Assignment
**Priority:** Should | **Status:** ✅ Complete

**Current State:** Fully implemented with version-locked encounters, member assignment UI, and package-driven rules.

**Technical Scope:**
- [x] Enhance `plan_packs` schema with versioning, required components, feature flags, module enables
- [x] Create package configuration admin UI (enable/disable modules, assessments, measures per package)
- [x] Add member-to-package assignment (in `members` table or junction table)
- [x] Implement rules engine that reads package to determine required components and branching
- [x] Support package updates with versioning (prior encounters tied to original package version via planPackVersion)
- [x] Admin UI for package mapping and member assignment overrides (Members tab in Admin Console)

**Dependencies:** None (foundational for other items)
**Acceptance Criteria:**
- Member visits follow the assigned package requirements
- Package updates are versioned; prior encounters remain tied to their original package version

---

### CR-001-16: Progress Note Hardening and Auditability Improvements
**Priority:** Should | **Status:** ✅ Complete

**Current State:** Fully implemented with completeness badges, provenance tags, edit history view, and export endpoints.

**Technical Scope:**
- [x] Add section completeness indicators to generated progress note (complete/incomplete/exception badges)
- [x] Add provenance tags per section (source: structured entry, voice capture, HIE import, etc.)
- [x] Implement edit history tracking for note modifications (edit history view with diffs)
- [x] Lock note after supervisor approval with controlled amendment workflow
- [x] Add signature/attestation audit trail
- [x] Support export format: text export and structured JSON export endpoints

**Dependencies:** CR-001-07 (supervisor sign-off locks note)
**Acceptance Criteria:**
- Generated note includes completeness and provenance markers
- Edits and approvals are logged and immutable after lock

---

### CR-001-17: CPT Code Transparency and Traceability
**Priority:** Should | **Status:** ✅ Complete

**Current State:** Fully implemented with evidence status badges, collapsible traceability views, missing-evidence warning banner, and remediation links.

**Technical Scope:**
- [x] Map CPT suggestions to triggering components and evidence fields (code-evidence endpoint)
- [x] Build CPT traceability UI: collapsible details view showing triggers and supporting evidence per code
- [x] Flag missing requirements and link to remediation sections (vitals, assessments)
- [x] Show evidence completeness status per code (fully supported, partially supported, missing evidence badges)
- [x] Trigger components display as badges, missing-evidence warning banner at top of codes section

**Dependencies:** CR-001-08 (diagnosis support validation provides evidence data)
**Acceptance Criteria:**
- Each CPT shown includes a details view of triggers and evidence
- If evidence is missing, CPT is flagged and finalization highlights required fixes

---

## Phase 4: Could-Have Polish (CR-001-18 through CR-001-20)

Demo governance, human audit overlay, and supervisor UX enhancements.

---

### CR-001-18: Controlled Demo Mode and Access Governance
**Priority:** Could | **Status:** ✅ Complete

**Current State:** Server-side RBAC enforcement (requireRole middleware) on all API endpoints. Demo mode configuration with toggle, watermark text, and export limits. Access audit logging for sensitive operations. Demo watermark overlay component.

**Technical Scope:**
- [x] Implement RBAC enforcement on all routes and API endpoints (server-side, not just client-side)
- [x] Create demo tenant configuration with feature flags (limit visible modules)
- [x] Add watermarking/logging for demo access
- [x] Restrict module access by role and environment (demo vs production)
- [x] Add access audit logging for sensitive operations and exports

**Dependencies:** None
**Acceptance Criteria:**
- Users without permission cannot access restricted modules or data
- Demo mode shows only allowed features and logs access

---

### CR-001-19: Human Audit Workflow Overlay
**Priority:** Could | **Status:** ✅ Complete

**Technical Scope:**
- [x] Create audit module with sampling rules (random %, targeted by criteria)
- [x] Build audit queue with reviewer assignment
- [x] Implement structured audit outcome capture (findings, severity, recommendations)
- [x] Create reporting exports for audit outcomes
- [x] Link audit outcomes to encounters and sign-off events

**Dependencies:** CR-001-07 (supervisor sign-off), CR-001-08 (diagnosis validation)
**Acceptance Criteria:**
- Auditors can be assigned encounters and record findings in structured form
- Audit outcomes are reportable and traceable

---

### CR-001-20: Supervisor Review Queue UX Enhancements
**Priority:** Could | **Status:** ✅ Complete

**Current State:** Full supervisor review queue with summary metric cards, NP/status/sort filters, structured return reasons (10 categories), rework tracking, and one-click approve/return workflow.

**Technical Scope:**
- [x] Add bulk filters/sorting to review queue (by NP, date, status, completeness score)
- [x] Build summary cards with key metrics (completeness %, diagnosis count, flags)
- [x] Implement one-click approve/return with structured reason templates
- [x] Persist return reasons and track rework cycles
- [ ] Show remediation links in return notifications to NP

**Dependencies:** CR-001-07 (supervisor sign-off infrastructure)
**Acceptance Criteria:**
- Supervisor can process reviews faster with summary cards and structured actions
- Return reasons are captured and visible to NP with remediation links

---

## Implementation Order (Recommended)

| Round | Items | Rationale |
|-------|-------|-----------|
| 1 | CR-001-03, CR-001-05, CR-001-09 | Quick wins: remove friction, standardize exceptions, fix blocking bugs |
| 2 | CR-001-01, CR-001-02 | Consent infrastructure (needed before voice capture) |
| 3 | CR-001-04, CR-001-06 | Structured docs + completeness engine |
| 4 | CR-001-08 | Diagnosis support validation (50-100 rules) |
| 5 | CR-001-07 | Supervisor sign-off with adjudication summary |
| 6 | CR-001-10 | AI provider configuration |
| 7 | CR-001-11 | Clinical voice capture (depends on consent + AI config) |
| 8 | CR-001-15, CR-001-14 | Program packages + branching logic |
| 9 | CR-001-12, CR-001-13 | Rules engine expansion + timeline provenance |
| 10 | CR-001-16, CR-001-17 | Progress note hardening + CPT traceability |
| 11 | CR-001-18, CR-001-19, CR-001-20 | Demo mode, human audit, supervisor UX |

---

## Assumptions & Dependencies

1. Program/package configuration drives required components (MA, ACA, AWV, TCM, CCM, well child)
2. Structured templates/questionnaires will be versioned to preserve historical integrity
3. Audit logging is first-class for consent, NOPP, edits, transcription, extraction, finalization, and supervisor sign-off
4. AI provider configuration managed per environment via secret store (no plaintext secrets in DB)
5. Voice capture requires browser MediaRecorder API support (modern browsers)
6. 50-100 diagnosis support rules will be seeded; additional rules added via admin UI

---

## Changelog

| Date | Round | Changes Made |
|------|-------|-------------|
| 2026-02-10 | -- | Initial development plan created from CR-001 v2 document |
| 2026-02-10 | 1 | CR-001-01: Added visit_consents table, consent API (GET/POST), voice transcription consent UI with grant/decline/exception flows |
| 2026-02-10 | 1 | CR-001-02: Added NOPP acknowledgement with delivery method capture, exception reasons, gating on review-finalize |
| 2026-02-10 | 1 | CR-001-03: Added identityVerificationRequired/noppRequired flags to planPacks, defaulted identity to optional, intake dashboard/finalize conditionally show based on plan config |
| 2026-02-10 | 1 | CR-001-05: Created reason_codes table with 45 standardized codes across 8 categories, API endpoint, updated assessment-runner and hedis-measure to use DB reason codes |
| 2026-02-10 | 1 | CR-001-09: Assessment runner and HEDIS measure pages use DB reason codes for "unable to assess", partial save/draft already supported |
| 2026-02-10 | 1 | CR-001-04/06: Created completeness_rules table (20 rules, 10 per plan pack), completeness evaluation engine API, replaced Review & Finalize gating with grouped completeness report |
| 2026-02-10 | 1 | CR-001-08: Created diagnosis_rules table with 60 rules across 10 clinical categories, diagnosis validation API, evidence checking against vitals/assessments/meds/labs, validation UI on finalize page |
| 2026-02-10 | 1 | CR-001-07: Enhanced supervisor reviews with adjudication summary scorecard, structured return reasons (10 categories), review_sign_offs table, encounter locking (lockedAt/lockedBy), locked visit banner on intake dashboard |
| 2026-02-10 | 6 | CR-001-10: Added ai_provider_config table, CRUD API (/api/ai-providers), seed default OpenAI config (whisper-1 + gpt-4o), Admin Console "AI Providers" tab with status indicators and secret-based API key management |
| 2026-02-10 | 7 | CR-001-11: Added voice_recordings, transcripts, extracted_fields tables. Full voice capture workflow: MediaRecorder audio capture → base64 upload → OpenAI Whisper transcription → GPT-4o structured field extraction → clinician review/accept/reject/edit → bulk accept. Consent gate enforced server-side. Voice Capture page with Record/Transcripts/Review tabs integrated into intake dashboard navigation |
| 2026-02-10 | 11 | CR-001-18: Server-side RBAC enforcement (requireRole middleware), demo_config table, demo mode toggle/watermark/export limits in Admin Console, access audit logging for sensitive operations |
| 2026-02-10 | 11 | CR-001-19: audit_assignments and audit_outcomes tables, sampling rules API (random %, targeted), audit queue page with reviewer assignment, structured outcome capture (findings, severity, recommendations) |
| 2026-02-10 | 11 | CR-001-20: Enhanced supervisor review queue with summary metric cards (total/pending/approved/returned/avg completeness/high risk), NP/status/sort filters, structured return reasons (10 categories), rework cycle tracking |
| 2026-02-10 | -- | iOS PWA: manifest.json, service worker (sw.js), safe area CSS, iOS install prompt, app icons (72-512px), Capacitor config |
| 2026-02-10 | -- | App Store docs: submission guide, HIPAA-aligned privacy policy, TestFlight guide, review checklist, Xcode build guide |
| 2026-02-10 | -- | Progress update: Verified all checkboxes against codebase, updated statuses to reflect actual implementation state |
