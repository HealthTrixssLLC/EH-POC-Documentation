# EH POC Development Plan - CR-001

**Change Request:** CR-001 | **Date Created:** 2026-02-10 | **Requestor:** Jay Baker
**Source:** Meeting review notes (Jay, TK, Samir)

---

## Overview

This plan implements the 20 change items from CR-001 across 4 phases, prioritized by MoSCoW methodology. Each item includes implementation scope, dependencies, and acceptance criteria. Progress is tracked via checkboxes and the changelog at the bottom.

---

## Phase 1: Must-Have Foundation (CR-001-01 through CR-001-09)

Core compliance, workflow gating, and data integrity items forming the backbone of a production-ready clinical platform.

---

### CR-001-01: Voice Transcription Consent Gate
**Priority:** Must | **Status:** Not Started

**Business Requirements:**
- Mandatory consent step before any audio capture or transcription
- Support verbal consent capture with clinician attestation
- Record consent status, method, timestamp, and actor
- If consent not granted, transcription features remain disabled for the encounter

**Technical Scope:**
- [ ] Add `visit_consents` table (visitId, consentType, status, method, capturedBy, capturedAt, notes)
- [ ] Create consent API endpoints: GET/POST `/api/visits/:id/consents`
- [ ] Build consent capture UI component (dialog/step) with verbal/written options
- [ ] Implement hard gate: block audio recording until consent granted
- [ ] Add consent events to immutable audit log
- [ ] Display consent status in progress note and visit summary
- [ ] Handle consent declined flow (continue visit without transcription)

**Dependencies:** None (foundational)
**Acceptance Criteria:**
- App requires consent capture before audio capture can start
- Consent fields persisted and visible in progress note and audit log
- Declined consent disables audio capture; visit continues without transcription

---

### CR-001-02: Notice of Privacy Practices (NOPP) Acknowledgement
**Priority:** Must | **Status:** Not Started

**Business Requirements:**
- Capture NOPP delivery method (in-person, digital, previously delivered) and acknowledgement
- Support structured exception reason when acknowledgement cannot be obtained
- Include NOPP status in visit documentation and audit artifacts

**Technical Scope:**
- [ ] Add NOPP fields to `visit_consents` table (or separate `visit_nopp` table): deliveryMethod, acknowledgementStatus, exceptionReason, timestamp, actor
- [ ] Create NOPP API endpoints: GET/POST `/api/visits/:id/nopp`
- [ ] Build NOPP acknowledgement UI as a start-of-visit gate step
- [ ] Support configurable acknowledgement modes: verbal attestation, optional e-signature
- [ ] Enforce visit-start gate when NOPP required by program configuration
- [ ] Add structured exception reasons (patient refused, patient incapacitated, previously on file, etc.)
- [ ] Include NOPP status in visit summary and progress note output

**Dependencies:** CR-001-01 (shared consent infrastructure)
**Acceptance Criteria:**
- Cannot proceed past visit start when NOPP is required and not completed or exceptioned
- NOPP acknowledgement or exception reason recorded and visible in visit summary and progress note

---

### CR-001-03: Remove Driver's License Capture from Baseline Intake
**Priority:** Must | **Status:** Not Started

**Business Requirements:**
- Baseline MA/ACA visit workflow does not require driver's license capture
- If a client requires identity verification, allow enabling via program configuration

**Technical Scope:**
- [ ] Add configuration flag (program/client level) to show/hide identity capture step
- [ ] Default identity verification step to hidden/optional in standard workflows
- [ ] Update intake dashboard to conditionally render identity verification based on config
- [ ] Ensure removal does not break existing flows or data models
- [ ] Preserve existing identity verification page for when config enables it

**Dependencies:** CR-001-15 (program packages, but can be implemented with simple config flag first)
**Acceptance Criteria:**
- Default workflows have no driver's license step
- When configuration is enabled, the step appears and is required per configured rule

---

### CR-001-04: Structured Documentation Enforcement
**Priority:** Must | **Status:** Not Started

**Business Requirements:**
- Define required structured sections for each program package
- Limit free text to optional supplemental notes, not required to complete visit
- Structured capture feeds progress note generator and coding outputs

**Technical Scope:**
- [ ] Define schema for section templates: question types (select, multi-select, radio, checkbox, scale), response options, validation rules
- [ ] Create `documentation_templates` table with versioned template definitions (JSONB)
- [ ] Create `visit_documentation` table linking visits to completed template responses
- [ ] Build structured documentation UI components (template renderer)
- [ ] Enforce validation on required questions prior to submit/finalize
- [ ] Integrate structured responses into progress note generator
- [ ] Persist structured data for reporting and FHIR exports

**Dependencies:** CR-001-15 (program packages drive which sections are required)
**Acceptance Criteria:**
- Visit cannot be finalized if required structured sections are incomplete
- Structured answers populate the generated progress note consistently

---

### CR-001-05: Structured 'Unable to Assess' and Exception Reasons
**Priority:** Must | **Status:** Partially Implemented

**Current State:** Basic `UNABLE_TO_ASSESS_REASONS` exists in schema with exclusion support on the intake dashboard. Needs standardization and expansion.

**Business Requirements:**
- Replace blocking failures with structured exception capture
- Standardize reason code library across all modules
- States: completed / unable / declined / deferred with reason codes

**Technical Scope:**
- [ ] Create shared `reason_codes` table (id, category, code, label, description, active, sortOrder)
- [ ] Seed standardized reason codes across categories: unable_to_assess, patient_declined, deferred, clinical_contraindication, equipment_unavailable, etc.
- [ ] Update assessment runner to use standardized reason codes from DB instead of hardcoded list
- [ ] Update HEDIS measure page to use standardized reason codes
- [ ] Update care gap handling to support exception states
- [ ] Expose reason selections in progress note and audit log
- [ ] Ensure finalization checks treat valid exception states as complete when allowed by configuration

**Dependencies:** None (extends existing functionality)
**Acceptance Criteria:**
- Any required assessment item can be marked unable/declined with a structured reason
- Finalization checks treat valid exception states as complete when allowed

---

### CR-001-06: NP Pre-Submit Completeness Engine (Hard Stop)
**Priority:** Must | **Status:** Partially Implemented

**Current State:** Basic gating exists on Review & Finalize page. Needs enhancement to be package-driven with clear remediation guidance.

**Business Requirements:**
- Define required components per package and per member context
- Provide clear remediation guidance and deep links to incomplete sections
- Allow completion via structured exceptions where applicable

**Technical Scope:**
- [ ] Create `completeness_rules` table (id, programPackage, componentType, componentId, required, exceptionAllowed, description)
- [ ] Implement completeness check engine that evaluates all rules for a visit
- [ ] Generate completeness report object stored with the encounter
- [ ] Update Review & Finalize screen with blocking issues list, deep links to incomplete sections
- [ ] Show clear remediation guidance for each incomplete item
- [ ] Support "resolve via exception" for items that allow it
- [ ] Block finalization button until all required items resolved
- [ ] Store completeness report snapshot at finalization time

**Dependencies:** CR-001-05 (exception states), CR-001-04 (structured docs)
**Acceptance Criteria:**
- Attempting to finalize with missing required items shows a blocking list of issues
- After resolving issues or applying allowed exceptions, finalize succeeds and report is stored

---

### CR-001-07: Supervisor Sign-Off with Automated Adjudication Summary
**Priority:** Must | **Status:** Partially Implemented

**Current State:** Basic supervisor review queue exists with approve/return actions. Needs summary scorecard, completeness/quality flags, and proper sign-off workflow.

**Business Requirements:**
- Supervisor workflow requires licensed reviewer sign-off before submission to plan
- Supervisor view surfaces what is missing, flagged, and supported

**Technical Scope:**
- [ ] Create adjudication summary generator (completeness %, diagnosis support status, quality flags, attention items)
- [ ] Build summary scorecard UI for supervisor review (completeness, flags, supported/unsupported)
- [ ] Add encounter status transitions: Pending Review -> Returned -> Approved
- [ ] Implement e-signature or attestation capture with timestamp and actor
- [ ] Lock encounter after approval (no changes except via controlled re-open flow)
- [ ] Add structured return reason templates for corrections
- [ ] Create immutable sign-off record on approval
- [ ] Update supervisor review queue to show summary cards with key metrics

**Dependencies:** CR-001-06 (completeness engine), CR-001-08 (diagnosis support)
**Acceptance Criteria:**
- Supervisor can approve or return with structured reasons
- Approval creates immutable sign-off record and locks encounter

---

### CR-001-08: Diagnosis Support Validation Rules (50-100 Initial Set)
**Priority:** Must | **Status:** Not Started

**Business Requirements:**
- Configurable ruleset mapping diagnoses to required evidence elements (ROS, PE, assessment results, etc.)
- Expose supported/not supported/needs evidence outcomes to NP and supervisor

**Technical Scope:**
- [ ] Create `diagnosis_rules` table (id, icdCode, icdDescription, requiredEvidence JSONB, category, active)
- [ ] Seed 50-100 initial diagnosis validation rules with evidence requirements
- [ ] Implement diagnosis validation engine that checks evidence against rules
- [ ] Create API endpoint: POST `/api/visits/:id/diagnoses/validate`
- [ ] Build diagnosis support UI showing supported/unsupported/needs evidence per diagnosis
- [ ] Show actionable missing-evidence guidance with deep links to relevant sections
- [ ] Run validation on finalize and on supervisor review
- [ ] Persist validation results with audit trail
- [ ] Include results in adjudication summary report

**Dependencies:** CR-001-04 (structured documentation provides evidence)
**Acceptance Criteria:**
- For a diagnosis in scope, app identifies whether evidence requirements are satisfied and lists missing items
- Results visible on finalize and supervisor screens and stored with encounter

---

### CR-001-09: Fix PRAPARE or Assessment Incompletion Blocking Storage
**Priority:** Must | **Status:** Not Started

**Business Requirements:**
- Clinical incompleteness must not be treated as a technical failure
- Users can save progress even when incomplete

**Technical Scope:**
- [ ] Decouple persistence from validation: allow save/draft at any point
- [ ] Enforce validation only at finalize step, not on save
- [ ] Add robust error handling and user messaging for actual technical failures
- [ ] Update assessment runner to support partial saves without validation errors
- [ ] Update PRAPARE and other assessments to allow incomplete saves
- [ ] Ensure finalization blocked only by completeness rules, not by storage errors
- [ ] Add error boundary and retry logic for actual storage failures

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
**Priority:** Must | **Status:** Not Started

**Business Requirements:**
- Support selection of AI provider per environment and optionally per client/tenant
- Secure management of API keys and endpoint configuration
- AI usage is auditable and configurable for compliance

**Technical Scope:**
- [ ] Create `ai_provider_config` table (id, providerType, displayName, baseUrl, modelName, apiVersion, secretRef, active, tenantId, featureFlags JSONB)
- [ ] Build provider abstraction layer with consistent request/response schema
- [ ] Implement retry/backoff policies for AI calls
- [ ] Admin UI for AI provider configuration (provider type, endpoint, model, feature flags)
- [ ] Store API keys via Replit secret store / integrations (reference only in DB, never plaintext; use platform secret management)
- [ ] Add feature flags to enable/disable AI features by tenant and workflow stage
- [ ] Add logging/tracing with correlation IDs (redacted prompts per compliance policy)
- [ ] Support graceful fallback when AI provider is unavailable

**Dependencies:** None (infrastructure item)
**Acceptance Criteria:**
- Admin can configure provider endpoints for OpenAI, Anthropic, and Azure OpenAI without code changes
- Switching providers does not break workflows; system fails gracefully
- AI calls are logged with correlation IDs and do not expose secrets

---

### CR-001-11: Clinical Voice Capture with Transcript Review and Auto-Population
**Priority:** Must | **Status:** Not Started

**Business Requirements:**
- Clinician can start/stop recording during visit, with consent and NOPP gates honored
- In-app transcript review with ability to correct extracted values
- Auto-populate structured sections (vitals, assessments, ROS, PE) from voice, require NP validation
- Store audio and transcript as part of encounter record

**Technical Scope:**
- [ ] Implement audio capture service (Web Audio API / MediaRecorder)
- [ ] Create `voice_recordings` table (id, visitId, audioUrl, duration, startTime, endTime, actorId, consentId)
- [ ] Create `transcripts` table (id, recordingId, visitId, text, version, editedBy, editedAt, providerUsed)
- [ ] Create `extracted_fields` table (id, transcriptId, visitId, fieldPath, proposedValue, confidence, sourceOffset, status: pending/accepted/rejected, acceptedBy)
- [ ] Build audio recording UI with start/stop/pause controls
- [ ] Integrate with configured AI provider for transcription (STT)
- [ ] Implement extraction pipeline: transcript -> structured field mapping via AI
- [ ] Build side-by-side review UI (transcript + extracted fields) with accept/reject per field
- [ ] Support bulk accept controls
- [ ] Persist extracted values only after clinician acceptance
- [ ] Maintain provenance linking each field to transcript snippet and confidence score
- [ ] Add conflict resolution: do not overwrite clinician-entered values without confirmation
- [ ] Enforce consent gate (CR-001-01) before recording starts

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
**Priority:** Should | **Status:** Partially Implemented

**Current State:** Basic CDS rules exist (8 seeded rules for BP, O2, BMI, etc.). Needs expansion to configurable engine with severity and recommended actions.

**Technical Scope:**
- [ ] Extend `clinical_rules` table with severity levels (info, warning, critical, emergency)
- [ ] Add recommended actions and documentation prompts to rule definitions
- [ ] Support thresholds per program and member context
- [ ] Build alert panel UI with action links and dismiss/acknowledge tracking
- [ ] Log triggered alerts, actions taken, and dismissals
- [ ] Persist triggered alerts and include in visit summary/audit

**Dependencies:** CR-001-15 (program context for per-program thresholds)
**Acceptance Criteria:**
- When a rule triggers, clinician sees alert with recommended action and can document resolution
- Triggered alerts stored and appear in summary/audit

---

### CR-001-13: Longitudinal Timeline Provenance and Drilldowns
**Priority:** Should | **Status:** Partially Implemented

**Current State:** Clinical timeline exists with vitals/labs/Rx history and Practice vs HIE source indicators. Needs drilldowns and richer provenance.

**Technical Scope:**
- [ ] Add source tagging to all timeline events (HIE, clinician-captured, patient-reported, imported)
- [ ] Implement drilldown views with filters and pagination
- [ ] Store actor and reason metadata for medication changes (start/stop/modify)
- [ ] Show medication discontinue reasons and who recorded them
- [ ] Add visual provenance indicators (icons/badges) per data point
- [ ] Support filtering timeline by source type

**Dependencies:** None
**Acceptance Criteria:**
- Timeline clearly labels each data item source and allows drilldown for details
- Medication events show start/stop and discontinue reasons with actor

---

### CR-001-14: Branching Logic Library for Assessments and Care Gaps
**Priority:** Should | **Status:** Partially Implemented

**Current State:** PHQ-2 -> PHQ-9 branching exists. Needs generalization to all assessments.

**Technical Scope:**
- [ ] Design branching engine that interprets questionnaire definitions (conditions, visibility, requiredness)
- [ ] Add branching rules to assessment definitions (JSONB: triggerConditions, followUpAssessments, conditionalQuestions)
- [ ] Implement branching for PRAPARE (food insecurity -> resource referral, housing -> housing support)
- [ ] Implement branching for AWV flows and care gap prompts
- [ ] Support condition-specific prompts (e.g., diabetes -> foot exam, eye exam)
- [ ] Make branching configurable per questionnaire version
- [ ] Add tests for common branching patterns

**Dependencies:** CR-001-05 (exception states for branched items)
**Acceptance Criteria:**
- Branching questions appear only when trigger criteria are met and are validated appropriately
- Branch behavior is configurable per questionnaire version

---

### CR-001-15: Configurable Program Packages and Beneficiary Assignment
**Priority:** Should | **Status:** Partially Implemented

**Current State:** `plan_packs` table exists with basic package definitions. Needs full configuration UI and member assignment.

**Technical Scope:**
- [ ] Enhance `plan_packs` schema with versioning, required components, feature flags, module enables
- [ ] Create package configuration admin UI (enable/disable modules, assessments, measures per package)
- [ ] Add member-to-package assignment (in `members` table or junction table)
- [ ] Implement rules engine that reads package to determine required components and branching
- [ ] Support package updates with versioning (prior encounters tied to original package version)
- [ ] Admin UI for package mapping and member assignment overrides

**Dependencies:** None (foundational for other items)
**Acceptance Criteria:**
- Member visits follow the assigned package requirements
- Package updates are versioned; prior encounters remain tied to their original package version

---

### CR-001-16: Progress Note Hardening and Auditability Improvements
**Priority:** Should | **Status:** Partially Implemented

**Current State:** Progress note exists with MEAT/TAMPER compliance, copy-to-clipboard. Needs completeness indicators, provenance, and edit/signature audit trail.

**Technical Scope:**
- [ ] Add section completeness indicators to generated progress note (complete/incomplete/exception badges)
- [ ] Add provenance tags per section (source: structured entry, voice capture, HIE import, etc.)
- [ ] Implement edit history tracking for note modifications
- [ ] Lock note after supervisor approval with controlled amendment workflow
- [ ] Add signature/attestation audit trail
- [ ] Support export format: PDF and structured data export

**Dependencies:** CR-001-07 (supervisor sign-off locks note)
**Acceptance Criteria:**
- Generated note includes completeness and provenance markers
- Edits and approvals are logged and immutable after lock

---

### CR-001-17: CPT Code Transparency and Traceability
**Priority:** Should | **Status:** Partially Implemented

**Current State:** Auto-coding exists with CPT/HCPCS/ICD-10 generation visible on Review & Finalize. Needs evidence mapping and traceability.

**Technical Scope:**
- [ ] Map CPT suggestions to triggering components and evidence fields (store in `visit_codes` JSONB)
- [ ] Build CPT traceability UI: details view showing triggers and supporting evidence per code
- [ ] Flag missing requirements and link to remediation sections
- [ ] Show evidence completeness status per code (fully supported, partially supported, missing evidence)
- [ ] Store evidence mapping with encounter for audit purposes

**Dependencies:** CR-001-08 (diagnosis support validation provides evidence data)
**Acceptance Criteria:**
- Each CPT shown includes a details view of triggers and evidence
- If evidence is missing, CPT is flagged and finalization highlights required fixes

---

## Phase 4: Could-Have Polish (CR-001-18 through CR-001-20)

Demo governance, human audit overlay, and supervisor UX enhancements.

---

### CR-001-18: Controlled Demo Mode and Access Governance
**Priority:** Could | **Status:** Partially Implemented

**Current State:** Basic RBAC exists with 5 roles. Demo management page exists. Needs deeper access controls and demo mode features.

**Technical Scope:**
- [ ] Implement RBAC enforcement on all routes and API endpoints (server-side, not just client-side)
- [ ] Create demo tenant configuration with feature flags (limit visible modules)
- [ ] Add watermarking/logging for demo access
- [ ] Restrict module access by role and environment (demo vs production)
- [ ] Add access audit logging for sensitive operations and exports

**Dependencies:** None
**Acceptance Criteria:**
- Users without permission cannot access restricted modules or data
- Demo mode shows only allowed features and logs access

---

### CR-001-19: Human Audit Workflow Overlay
**Priority:** Could | **Status:** Not Started

**Technical Scope:**
- [ ] Create audit module with sampling rules (random %, targeted by criteria)
- [ ] Build audit queue with reviewer assignment
- [ ] Implement structured audit outcome capture (findings, severity, recommendations)
- [ ] Create reporting exports for audit outcomes
- [ ] Link audit outcomes to encounters and sign-off events

**Dependencies:** CR-001-07 (supervisor sign-off), CR-001-08 (diagnosis validation)
**Acceptance Criteria:**
- Auditors can be assigned encounters and record findings in structured form
- Audit outcomes are reportable and traceable

---

### CR-001-20: Supervisor Review Queue UX Enhancements
**Priority:** Could | **Status:** Partially Implemented

**Current State:** Basic supervisor review queue with approve/return actions exists. Needs summary-first review, bulk actions, and structured return reasons.

**Technical Scope:**
- [ ] Add bulk filters/sorting to review queue (by NP, date, status, completeness score)
- [ ] Build summary cards with key metrics (completeness %, diagnosis count, flags)
- [ ] Implement one-click approve/return with structured reason templates
- [ ] Persist return reasons and track rework cycles
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
| | | |
