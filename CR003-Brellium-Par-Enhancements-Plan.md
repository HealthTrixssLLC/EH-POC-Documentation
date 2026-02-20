# CR-003: Brellium Parity Enhancements - Documentation Audit & Billing Compliance

## Implementation Plan

**System:** Easy Health Point of Care Application
**Requestor:** Jay Baker
**Date:** February 20, 2026
**Status:** Planning - Pending Review
**Source:** Brellium Comparison Analysis (`attached_assets/eh-brellium_comparison_1771595118054.md`)

---

## Executive Summary

This change request addresses 10 capability gaps identified in the Brellium comparison analysis. The gaps span pre-claim compliance, coding defensibility, automated audit coverage, payor policy enforcement, provider quality management, documentation change tracking, NLP-based code alignment, FHIR ingestion parity, and conditional CoCM billing support.

The plan is organized into 4 priority phases. Phases 1-2 address critical and high-risk gaps. Phases 3-4 address medium and low-priority enhancements.

---

## Implementation Phases Overview

| Phase | Priority | Change Requests | Risk Level | Target |
|-------|----------|----------------|------------|--------|
| Phase 1 | P1 - Critical | CR-P1 (Pre-Claim Gate), CR-P2 (E/M + MDM) | CRITICAL | Claim integrity, CPT audit defense |
| Phase 2 | P2 - High | CR-P3 (100% Audit), CR-P4 (CPT Scoring), CR-P5 (Payor Policy) | HIGH | Audit coverage, CPT exposure, payor denials |
| Phase 3 | P3 - Medium | CR-P6 (Provider Trending), CR-P7 (Change Tracking), CR-P8 (NLP Alignment) | MEDIUM | Quality management, audit trail, coding accuracy |
| Phase 4 | P4 - Low/Conditional | CR-P9 (FHIR Parity), CR-P10 (CoCM Module) | LOW | Interoperability, future BH billing |

---

## Dependencies & Existing Assets

### Existing Assets That Will Be Extended

| Existing Asset | Location | How It Will Be Extended |
|---|---|---|
| Completeness engine | `server/routes.ts:1072-1230` | Extended with billing readiness evaluation and pre-claim gate logic |
| Adjudication summary endpoint | `server/routes.ts:2082-2273` | Extended with E/M defensibility, CPT defensibility, and billing readiness scores |
| Auto-coding engine | `server/routes.ts:2500-2600` | Extended with CPT defensibility rules and E/M level validation |
| Diagnosis support scoring | `server/routes.ts:2160-2192` | Extended with RAF/HCC mapping validation |
| Quality flags system | `server/routes.ts:2194-2250` | Extended with E/M mismatch, CPT defensibility, and payor policy flags |
| Audit events table | `shared/schema.ts:278-295` | Extended with new event types for pre-claim gate, automated audit, and change tracking |
| Review sign-off system | `server/routes.ts:2046-2058` | Extended with additional scores (E/M, CPT, billing readiness) |
| Finalization gating | `server/routes.ts:1890-1955` | Extended with E/M validation and billing readiness checks |
| FHIR inbound Bundle handler | `server/routes.ts:3700+` | Extended with CarePlan and PractitionerRole resource processors |
| Completeness rules table | `shared/schema.ts:535-549` | Extended with new component types for payor-specific rules |

### Cross-CR Dependencies

| CR | Depends On | Reason |
|-----|-----------|--------|
| CR-P5 | CR-P1 | Payor policy rules evaluated as part of pre-claim gate |
| CR-P4 | CR-P2 | CPT defensibility scoring includes E/M defensibility as a sub-score |
| CR-P3 | CR-P1, CR-P2, CR-P4 | Automated audit runs all validation engines |
| CR-P8 | CR-P3 | NLP alignment results feed into automated audit scoring |

---

# PHASE 1: CRITICAL - Claim Integrity & CPT Audit Defense

---

## CR-P1: Pre-Claim Compliance Gate

### 1.1 Problem Statement

Finalization gating prevents visit sign-off but does not prevent claim submission. A finalized visit with documentation gaps can still be exported as a FHIR bundle or claim file, sending incomplete documentation to the payor.

### 1.2 Data Model Changes

#### New Table: `billing_readiness_evaluations`

```
Purpose: Store billing readiness evaluation results per visit for audit trail.

Columns:
  id                varchar PK (gen_random_uuid)
  visitId           varchar NOT NULL (FK to visits)
  evaluatedAt       text NOT NULL (ISO timestamp)
  evaluatedBy       text NOT NULL default "system"
  overallScore      integer NOT NULL (0-100)
  completenessScore integer NOT NULL (0-100)
  diagnosisSupportScore integer NOT NULL (0-100)
  codingComplianceScore integer NOT NULL (0-100)
  gateResult        text NOT NULL ("pass" | "fail" | "override")
  failReasons       jsonb (array of { category, description, severity })
  overrideReason    text (if gateResult = "override")
  overrideBy        text (userId who overrode)
```

#### Column Addition: `visits` table

```
  billingReadinessScore   integer (0-100, set at pre-claim evaluation)
  billingGateResult       text ("pass" | "fail" | "override" | null)
  billingGateEvaluatedAt  text (ISO timestamp)
```

### 1.3 Backend Implementation

- [ ] Create `billing_readiness_evaluations` table in `shared/schema.ts`
- [ ] Add billing readiness columns to `visits` table
- [ ] Add storage interface methods: `createBillingReadinessEvaluation()`, `getBillingReadinessEvaluations(visitId)`
- [ ] Create `POST /api/visits/:id/billing-readiness` endpoint that evaluates:
  - Completeness score (existing engine)
  - Diagnosis support score (existing engine)
  - Coding compliance score (new: unverified codes, unsupported diagnoses, missing MEAT)
  - Composite billing readiness score = weighted average
- [ ] Create `GET /api/visits/:id/billing-readiness` endpoint to retrieve latest evaluation
- [ ] Modify `POST /api/visits/:id/export` to enforce billing readiness gate:
  - Block export when billingReadinessScore < configurable threshold (default: 80)
  - Allow override with reason and userId logging
  - Log gate pass/fail/override as audit event
- [ ] Add configurable threshold to admin settings (system_config or similar)
- [ ] Add audit event types: `billing_gate_pass`, `billing_gate_fail`, `billing_gate_override`

### 1.4 Frontend Implementation

- [ ] Add Billing Readiness panel to review-finalize page showing composite score breakdown
- [ ] Add visual gate indicator (pass/fail) on visit detail page
- [ ] Add override dialog with reason capture when billing gate fails
- [ ] Show billing readiness score on supervisor review queue
- [ ] Add billing gate status to dashboard visit list

### 1.5 Validation & Testing

- [ ] Verify export is blocked when score < threshold
- [ ] Verify override flow captures reason and logs audit event
- [ ] Verify score computation matches expected values for test visits
- [ ] Verify billing readiness evaluation is logged in audit trail

---

## CR-P2: E/M Level and MDM Validation Engine

### 2.1 Problem Statement

CPT codes for E/M visits (99345, 99350, 99387, etc.) are auto-assigned by visit type without validating that the documented history, exam, and Medical Decision Making (MDM) elements support the selected E/M level. E/M coding is the #1 audit target for CMS and commercial payors.

### 2.2 Data Model Changes

#### New Table: `em_level_rules`

```
Purpose: Define E/M level requirements per CPT code based on 2021 CMS guidelines.

Columns:
  id              varchar PK (gen_random_uuid)
  cptCode         text NOT NULL (e.g., "99345", "99350")
  levelLabel      text NOT NULL (e.g., "High Complexity")
  mdmLevel        text NOT NULL ("straightforward" | "low" | "moderate" | "high")
  minProblems     integer NOT NULL (number/complexity of problems addressed)
  minDataPoints   integer NOT NULL (data reviewed/ordered)
  riskLevel       text NOT NULL ("minimal" | "low" | "moderate" | "high")
  description     text
  active          boolean NOT NULL default true
```

#### New Table: `em_evaluations`

```
Purpose: Store E/M level evaluation results per visit.

Columns:
  id                  varchar PK (gen_random_uuid)
  visitId             varchar NOT NULL (FK to visits)
  assignedCpt         text NOT NULL (the auto-assigned CPT code)
  evaluatedMdmLevel   text NOT NULL (calculated MDM level)
  problemsScore       integer (0-100)
  dataScore           integer (0-100)
  riskScore           integer (0-100)
  overallMdmScore     integer (0-100)
  levelMatch          text NOT NULL ("match" | "over_coded" | "under_coded")
  suggestedCpt        text (recommended CPT if mismatch)
  evaluationDetails   jsonb (breakdown of elements counted)
  evaluatedAt         text NOT NULL (ISO timestamp)
```

### 2.3 Backend Implementation

- [ ] Create `em_level_rules` table in `shared/schema.ts` with seed data for home visit E/M codes (99341-99345, 99347-99350) and preventive codes (99381-99397)
- [ ] Create `em_evaluations` table in `shared/schema.ts`
- [ ] Add storage interface methods: `getEmLevelRule(cptCode)`, `createEmEvaluation()`, `getEmEvaluationByVisit(visitId)`
- [ ] Implement MDM scoring engine in `server/routes.ts`:
  - **Problems addressed:** Count active diagnoses, acute/chronic classification, severity
  - **Data reviewed/ordered:** Count labs ordered, imaging, medication changes, external records (HIE data)
  - **Risk of complications:** Evaluate prescription drug management, surgical decisions, hospitalization risk
- [ ] Create `GET /api/visits/:id/em-evaluation` endpoint that:
  - Identifies the assigned E/M CPT code from visit codes
  - Runs MDM scoring against documented elements
  - Compares calculated MDM level against E/M level rules
  - Returns match/over-coded/under-coded with suggested CPT
- [ ] Create `POST /api/visits/:id/em-evaluation` to trigger and store evaluation
- [ ] Add E/M Defensibility Score to adjudication summary endpoint
- [ ] Add E/M mismatch as a quality flag (severity: "error" for over-coding, "warning" for under-coding)
- [ ] Extend finalization gating to warn on E/M mismatch (soft gate with override)
- [ ] Seed `em_level_rules` with CMS 2021 E/M guideline requirements

### 2.4 Frontend Implementation

- [ ] Add E/M Validation panel to review-finalize page showing:
  - Assigned E/M level vs. calculated MDM level
  - Problem/data/risk score breakdown
  - Match indicator (green check / red warning)
  - Suggested CPT if mismatch detected
- [ ] Add E/M defensibility score to adjudication scorecard on supervisor review
- [ ] Show E/M mismatch warnings on intake dashboard (CDS alerts panel)
- [ ] Add E/M override dialog if NP disagrees with calculated level

### 2.5 Validation & Testing

- [ ] Verify MDM scoring correctly classifies test cases across all 4 MDM levels
- [ ] Verify over-coding detection for visits with high E/M code but low documentation
- [ ] Verify under-coding detection for visits with rich documentation but low E/M code
- [ ] Verify E/M evaluation is included in adjudication summary
- [ ] Verify finalization gating warns on E/M mismatch

---

# PHASE 2: HIGH - Audit Coverage & Coding Exposure

---

## CR-P3: Automated 100% Encounter Audit Engine

### 3.1 Problem Statement

Current audit coverage depends on human random sampling via the audit queue. Not all encounters receive systematic quality review. Brellium audits 100% of encounters automatically.

### 3.2 Data Model Changes

#### New Table: `encounter_audit_reports`

```
Purpose: Store automated audit results for every finalized encounter.

Columns:
  id                      varchar PK (gen_random_uuid)
  visitId                 varchar NOT NULL (FK to visits)
  auditedAt               text NOT NULL (ISO timestamp)
  completenessScore       integer NOT NULL (0-100)
  diagnosisSupportScore   integer NOT NULL (0-100)
  codingComplianceScore   integer NOT NULL (0-100)
  emDefensibilityScore    integer (0-100, null if not E/M visit)
  cptDefensibilityScore   integer (0-100)
  billingReadinessScore   integer NOT NULL (0-100)
  overallAuditScore       integer NOT NULL (0-100)
  auditResult             text NOT NULL ("pass" | "warning" | "fail")
  qualityFlags            jsonb (array of flags)
  flagCount               integer NOT NULL default 0
  autoRoutedToReview      boolean NOT NULL default false
  dimensions              jsonb (detailed breakdown per audit dimension)
```

### 3.3 Backend Implementation

- [ ] Create `encounter_audit_reports` table in `shared/schema.ts`
- [ ] Add storage interface methods: `createEncounterAuditReport()`, `getEncounterAuditReport(visitId)`, `getEncounterAuditReports(filters)`
- [ ] Implement automated audit pipeline function `runEncounterAudit(visitId)`:
  - Execute completeness engine evaluation
  - Execute diagnosis support scoring
  - Execute coding compliance checks (unverified codes, unsupported diagnoses)
  - Execute E/M evaluation (from CR-P2, if applicable)
  - Execute CPT defensibility scoring (from CR-P4)
  - Compute billing readiness composite
  - Generate quality flags
  - Compute overall audit score as weighted average
  - Determine audit result: pass (>= 80), warning (60-79), fail (< 60)
  - Auto-route to supervisor review if result = "fail" or "warning"
- [ ] Trigger automated audit at visit finalization (`POST /api/visits/:id/finalize`)
- [ ] Create `GET /api/audit/reports` endpoint with filters (date range, score range, result, provider)
- [ ] Create `GET /api/audit/reports/:visitId` endpoint for single visit audit report
- [ ] Create `GET /api/audit/dashboard` endpoint returning aggregate metrics:
  - Total encounters audited
  - % pass / warning / fail
  - Average scores by dimension
  - Trend data (daily/weekly/monthly)
  - Top quality flag categories
- [ ] Add audit event type: `automated_audit_completed`, `automated_audit_routed_to_review`

### 3.4 Frontend Implementation

- [ ] Add Audit Dashboard page (or section within existing admin/compliance pages) showing:
  - Aggregate audit metrics (pass/warning/fail distribution)
  - Score trend charts (30/60/90 day)
  - Quality flag frequency breakdown
  - Filterable encounter audit list
- [ ] Add audit score badge to visit list and visit detail pages
- [ ] Add audit report view per encounter with dimension breakdown
- [ ] Auto-route indicators on supervisor review queue for audit-flagged encounters

### 3.5 Validation & Testing

- [ ] Verify audit runs automatically at finalization for every visit
- [ ] Verify audit results are stored and retrievable
- [ ] Verify auto-routing to supervisor review for failed/warning visits
- [ ] Verify dashboard metrics compute correctly
- [ ] Verify audit trail captures automated audit events

---

## CR-P4: CPT Defensibility Scoring

### 4.1 Problem Statement

Auto-coding generates CPT codes but does not evaluate whether each code is adequately supported by documented clinical elements, time, or complexity. Cannot quantify CPT-specific audit risk per encounter.

### 4.2 Data Model Changes

#### New Table: `cpt_defensibility_rules`

```
Purpose: Define documentation requirements per CPT code category.

Columns:
  id                varchar PK (gen_random_uuid)
  cptCode           text NOT NULL
  category          text NOT NULL ("em" | "preventive" | "assessment" | "procedure" | "hedis")
  label             text NOT NULL
  requiredElements  jsonb NOT NULL (array of { elementType, description, weight })
  minDocScore       integer NOT NULL default 70 (minimum score to be considered defensible)
  active            boolean NOT NULL default true
```

### 4.3 Backend Implementation

- [ ] Create `cpt_defensibility_rules` table in `shared/schema.ts`
- [ ] Add storage interface methods: `getCptDefensibilityRule(cptCode)`, `getAllCptDefensibilityRules()`, `createCptDefensibilityRule()`
- [ ] Implement CPT defensibility evaluation function `evaluateCptDefensibility(visitId)`:
  - For each CPT code on the visit, look up defensibility rules
  - Evaluate required elements against documented data (vitals, assessments, meds, diagnoses, measures)
  - Compute per-CPT defensibility score based on element weights
  - Compute aggregate CPT Defensibility Score for the encounter
  - Flag under-documented CPTs with specific remediation instructions
- [ ] Create `GET /api/visits/:id/cpt-defensibility` endpoint
- [ ] Add CPT defensibility score to adjudication summary
- [ ] Include CPT defensibility in automated audit pipeline (CR-P3)
- [ ] Seed defensibility rules for common home visit CPT codes (99345, 99350, 99387, 96127, 96160, 83036, etc.)

### 4.4 Frontend Implementation

- [ ] Add CPT Defensibility panel to review-finalize page showing per-CPT scores
- [ ] Color-code CPT codes by defensibility (green >= 80, yellow 60-79, red < 60)
- [ ] Show remediation instructions for under-documented CPTs
- [ ] Add CPT defensibility score to adjudication scorecard on supervisor review

### 4.5 Validation & Testing

- [ ] Verify per-CPT scoring matches expected values for test scenarios
- [ ] Verify aggregate score computation
- [ ] Verify remediation instructions display for under-documented CPTs
- [ ] Verify CPT defensibility appears in adjudication summary

---

## CR-P5: Payor-Specific Billing Policy Engine

### 5.1 Problem Statement

Completeness rules are plan-level (MA vs ACA) but do not enforce payor-specific billing policies such as LCD/NCD requirements, modifier rules, ABN requirements, or frequency limits. This creates payor-specific denial risk.

### 5.2 Data Model Changes

#### New Table: `payor_policies`

```
Purpose: Define payor-specific billing policy rules.

Columns:
  id              varchar PK (gen_random_uuid)
  payorId         text NOT NULL (mapped to insurancePlan or plan pack)
  policyType      text NOT NULL ("lcd" | "ncd" | "modifier" | "frequency" | "prior_auth" | "abn")
  cptCodes        text[] (applicable CPT codes)
  icdCodes        text[] (applicable ICD-10 codes, if any)
  ruleDefinition  jsonb NOT NULL (policy-specific rule parameters)
  description     text NOT NULL
  effectiveDate   text
  expirationDate  text
  active          boolean NOT NULL default true
```

#### New Table: `payor_policy_evaluations`

```
Purpose: Store payor policy evaluation results per visit.

Columns:
  id              varchar PK (gen_random_uuid)
  visitId         varchar NOT NULL (FK to visits)
  payorId         text NOT NULL
  evaluatedAt     text NOT NULL (ISO timestamp)
  results         jsonb NOT NULL (array of { policyId, policyType, result, description })
  passCount       integer NOT NULL
  failCount       integer NOT NULL
  warningCount    integer NOT NULL
```

### 5.3 Backend Implementation

- [ ] Create `payor_policies` table in `shared/schema.ts`
- [ ] Create `payor_policy_evaluations` table in `shared/schema.ts`
- [ ] Add storage interface methods: `getPayorPolicies(payorId)`, `createPayorPolicy()`, `createPayorPolicyEvaluation()`, `getPayorPolicyEvaluation(visitId)`
- [ ] Implement payor policy evaluation function `evaluatePayorPolicies(visitId)`:
  - Identify patient's payor from member record
  - Retrieve applicable policies for that payor
  - Evaluate each policy against visit data:
    - **Frequency limits:** Check visit/procedure frequency within time window
    - **LCD/NCD:** Validate medical necessity criteria for specific CPT+ICD combinations
    - **Modifier rules:** Validate required modifiers are present
    - **Prior auth:** Flag procedures requiring prior authorization
    - **ABN:** Flag when ABN is required for non-covered services
  - Return pass/fail/warning per policy
- [ ] Create `GET /api/visits/:id/payor-compliance` endpoint
- [ ] Integrate payor policy evaluation into pre-claim compliance gate (CR-P1)
- [ ] Provide payor-specific denial risk warnings as quality flags
- [ ] Create admin endpoint to manage payor policies: `GET/POST/PUT /api/admin/payor-policies`
- [ ] Seed initial payor policies for common MA and ACA plan requirements

### 5.4 Frontend Implementation

- [ ] Add Payor Compliance panel to review-finalize page showing policy evaluation results
- [ ] Show denial risk warnings during documentation on intake dashboard
- [ ] Add payor policy management UI in admin console
- [ ] Include payor compliance status on supervisor review queue

### 5.5 Validation & Testing

- [ ] Verify frequency limit detection blocks repeat services within window
- [ ] Verify LCD/NCD rules flag medical necessity gaps
- [ ] Verify payor policy results integrate with pre-claim gate
- [ ] Verify admin can create and modify payor policies

---

# PHASE 3: MEDIUM - Quality Management & Audit Trail

---

## CR-P6: Provider Quality Trending Dashboard

### 6.1 Problem Statement

Per-visit completeness and diagnosis support scores exist but there is no longitudinal view of provider documentation quality. Cannot identify consistently underperforming providers or measure improvement after training.

### 6.2 Data Model Changes

#### New Table: `provider_quality_snapshots`

```
Purpose: Store periodic provider-level aggregate quality metrics.

Columns:
  id                      varchar PK (gen_random_uuid)
  providerId              varchar NOT NULL (FK to users)
  periodStart             text NOT NULL (ISO date)
  periodEnd               text NOT NULL (ISO date)
  encounterCount          integer NOT NULL
  avgCompletenessScore    real NOT NULL
  avgDiagnosisSupportScore real NOT NULL
  avgCodingComplianceScore real
  avgOverallScore         real NOT NULL
  flagCount               integer NOT NULL default 0
  topFlags                jsonb (top 5 most frequent flag types)
  computedAt              text NOT NULL (ISO timestamp)
```

### 6.3 Backend Implementation

- [ ] Create `provider_quality_snapshots` table in `shared/schema.ts`
- [ ] Add storage interface methods: `createProviderQualitySnapshot()`, `getProviderQualitySnapshots(providerId, dateRange)`
- [ ] Create `GET /api/providers/:id/quality` endpoint returning:
  - Rolling 30/60/90-day aggregate scores
  - Encounter count per period
  - Quality flag breakdown
  - Trend data points for charting
- [ ] Create `GET /api/providers/quality-summary` endpoint returning:
  - All providers ranked by overall quality score
  - Providers below threshold flagged
  - Organization average for benchmarking
- [ ] Implement snapshot computation triggered on a schedule or after each finalized visit
- [ ] Create `GET /api/providers/:id/quality/export` endpoint for compliance committee reports

### 6.4 Frontend Implementation

- [ ] Add Provider Quality Dashboard page accessible to compliance and admin roles
- [ ] Display provider quality trend charts (line chart, 30/60/90-day windows)
- [ ] Show provider ranking table with color-coded performance indicators
- [ ] Support drill-down from provider to individual encounter audit reports
- [ ] Add export button for compliance committee reports

### 6.5 Validation & Testing

- [ ] Verify aggregate scores compute correctly from encounter data
- [ ] Verify provider ranking sorts correctly
- [ ] Verify trend charts display accurate historical data
- [ ] Verify drill-down navigation works from provider to encounter

---

## CR-P7: Field-Level Documentation Change Tracking

### 7.1 Problem Statement

Audit events log high-level actions (visit finalized, review submitted) but not field-level changes. When a supervisor returns a visit for remediation, there is no granular record of what the provider changed, making it impossible to verify corrections at audit.

### 7.2 Data Model Changes

#### New Table: `documentation_changes`

```
Purpose: Track field-level changes to clinical documentation.

Columns:
  id              varchar PK (gen_random_uuid)
  visitId         varchar NOT NULL (FK to visits)
  entityType      text NOT NULL ("vitals" | "assessment" | "diagnosis" | "medication" | "care_plan" | "measure" | "consent")
  entityId        varchar (FK to the specific record, if applicable)
  fieldName       text NOT NULL
  previousValue   text
  newValue        text
  changedBy       text NOT NULL (userId)
  changedAt       text NOT NULL (ISO timestamp)
  changeReason    text (free text or linked to remediation request)
  remediationId   varchar (FK to review sign-off that triggered the return, if applicable)
```

### 7.3 Backend Implementation

- [ ] Create `documentation_changes` table in `shared/schema.ts`
- [ ] Add storage interface methods: `createDocumentationChange()`, `getDocumentationChanges(visitId)`, `getDocumentationChangesByEntity(entityType, entityId)`
- [ ] Implement change tracking middleware for key mutation endpoints:
  - `PUT /api/visits/:id/vitals` - capture before/after for each vital sign field
  - `POST /api/visits/:id/assessments/:instrumentId` - capture assessment response changes
  - `PUT /api/visits/:id/codes/:codeId` - capture code verification/removal changes
  - `PUT /api/visits/:id/med-recon/:medId` - capture medication status changes
  - `POST /api/visits/:id/care-plan-tasks` - capture care plan additions/modifications
- [ ] Create `GET /api/visits/:id/change-history` endpoint returning chronological change log
- [ ] Link changes to remediation requests when visit is in "returned" status
- [ ] Add audit event type: `documentation_field_changed`

### 7.4 Frontend Implementation

- [ ] Add Documentation Change History panel to visit detail page
- [ ] Display chronological change log with before/after values
- [ ] Highlight changes made after supervisor return (remediation-linked changes)
- [ ] Add change history view to supervisor review for remediation verification
- [ ] Color-code changes by type (remediation vs. routine)

### 7.5 Validation & Testing

- [ ] Verify changes are captured for each tracked endpoint
- [ ] Verify before/after values are accurate
- [ ] Verify remediation linkage when visit is in returned status
- [ ] Verify change history displays correctly on visit detail and supervisor review

---

## CR-P8: NLP-Based Documentation-to-Code Alignment

### 8.1 Problem Statement

Coding alignment relies on structured data matching (diagnosis rules, evidence items). There is no analysis of whether the clinical narrative in progress notes actually supports the submitted codes, or whether documented conditions lack corresponding codes.

### 8.2 Data Model Changes

#### New Table: `nlp_code_alignment_results`

```
Purpose: Store NLP analysis results comparing narrative documentation to submitted codes.

Columns:
  id                  varchar PK (gen_random_uuid)
  visitId             varchar NOT NULL (FK to visits)
  analyzedAt          text NOT NULL (ISO timestamp)
  codesWithoutSupport jsonb (array of { code, codeType, description, confidence })
  conditionsWithoutCodes jsonb (array of { condition, suggestedCode, confidence })
  alignmentScore      integer NOT NULL (0-100)
  analysisDetails     jsonb (full NLP analysis output)
  modelUsed           text NOT NULL (e.g., "gpt-4o")
```

### 8.3 Backend Implementation

- [ ] Create `nlp_code_alignment_results` table in `shared/schema.ts`
- [ ] Add storage interface methods: `createNlpCodeAlignmentResult()`, `getNlpCodeAlignmentResult(visitId)`
- [ ] Implement NLP alignment analysis function `analyzeCodeAlignment(visitId)`:
  - Retrieve the full progress note text for the visit
  - Retrieve all submitted ICD-10 and CPT codes
  - Send to LLM (OpenAI GPT-4o) with a structured prompt:
    - "Given this clinical progress note and these submitted codes, identify: (1) codes that lack narrative support, (2) conditions discussed but not coded"
  - Parse structured response into codesWithoutSupport and conditionsWithoutCodes
  - Compute alignment score
- [ ] Create `POST /api/visits/:id/code-alignment` endpoint to trigger analysis
- [ ] Create `GET /api/visits/:id/code-alignment` endpoint to retrieve results
- [ ] Add code alignment results as quality flags in automated audit (CR-P3)
- [ ] Add code alignment score to adjudication summary

### 8.4 Frontend Implementation

- [ ] Add Code Alignment panel to review-finalize page showing:
  - Codes without narrative support (with confidence level)
  - Conditions discussed but not coded (with suggested codes)
  - Overall alignment score
- [ ] Add "Run Code Alignment" action button on supervisor review page
- [ ] Show alignment warnings on intake dashboard after finalization

### 8.5 Validation & Testing

- [ ] Verify NLP analysis identifies known code-narrative mismatches in test data
- [ ] Verify structured response parsing handles edge cases
- [ ] Verify alignment score computation
- [ ] Verify results display correctly on review and supervisor pages

---

# PHASE 4: LOW / CONDITIONAL

---

## CR-P9: Inbound FHIR CarePlan and PractitionerRole Processing

### 9.1 Problem Statement

Outbound FHIR bundles include CarePlan and PractitionerRole resources, but inbound processing from external systems does not handle these resource types, creating a gap in bidirectional FHIR parity.

### 9.2 Backend Implementation

- [ ] Extend inbound FHIR Bundle handler (`server/routes.ts:3700+`) with CarePlan resource processor:
  - Map FHIR CarePlan activities to EH care plan tasks
  - Handle duplicate detection (matching by activity description and date)
  - Set `source = "external"` on imported care plan tasks
- [ ] Extend inbound FHIR Bundle handler with PractitionerRole resource processor:
  - Map FHIR PractitionerRole to EH user/provider records
  - Handle duplicate detection (matching by NPI or identifier)
  - Log ingestion results
- [ ] Add FHIR Playground test payloads for CarePlan and PractitionerRole ingestion
- [ ] Add audit event types: `fhir_careplan_ingested`, `fhir_practitionerrole_ingested`

### 9.3 Frontend Implementation

- [ ] Update FHIR Playground to include CarePlan and PractitionerRole in test bundle options
- [ ] Show ingested care plan tasks with external source badge on care plan page

### 9.4 Validation & Testing

- [ ] Verify CarePlan ingestion creates care plan tasks correctly
- [ ] Verify PractitionerRole ingestion maps to provider records
- [ ] Verify duplicate detection prevents re-import
- [ ] Verify FHIR Playground test payloads work end-to-end

---

## CR-P10: CoCM Time-Based Billing Module (CONDITIONAL)

**Note:** This CR is conditional on the addition of behavioral health / CoCM services to the EH platform. Implementation should only proceed if that business decision is made.

### 10.1 Problem Statement

No time tracking, attribution, or CoCM-specific billing support exists. This is a full gap across all Brellium Section 4 capabilities (time attribution, CPT eligibility for 99492/99493/99494, monthly cumulative thresholds, activity type classification, cross-role duplication detection, and care plan linkage to billed time).

### 10.2 Data Model Changes (Conditional)

#### New Table: `cocm_time_entries`

```
Purpose: Track time spent on CoCM activities by provider.

Columns:
  id              varchar PK (gen_random_uuid)
  visitId         varchar (FK to visits, optional for non-visit activities)
  memberId        varchar NOT NULL (FK to members)
  providerId      varchar NOT NULL (FK to users)
  activityType    text NOT NULL ("care_plan_dev" | "consultation" | "assessment" | "coordination" | "review")
  durationMinutes integer NOT NULL
  activityDate    text NOT NULL (ISO date)
  notes           text
  createdAt       text NOT NULL (ISO timestamp)
```

#### New Table: `cocm_monthly_summaries`

```
Purpose: Track monthly cumulative time for CoCM billing thresholds.

Columns:
  id                  varchar PK (gen_random_uuid)
  memberId            varchar NOT NULL (FK to members)
  billingMonth        text NOT NULL (YYYY-MM)
  totalMinutes        integer NOT NULL
  qualifyingCpt       text ("99492" | "99493" | "99494" | "none")
  providerBreakdown   jsonb (time per provider)
  duplicationsDetected jsonb (cross-role overlap details)
  evaluatedAt         text NOT NULL (ISO timestamp)
```

### 10.3 Backend Implementation (Conditional)

- [ ] Create `cocm_time_entries` table in `shared/schema.ts`
- [ ] Create `cocm_monthly_summaries` table in `shared/schema.ts`
- [ ] Add storage interface methods for time entry CRUD and monthly summary computation
- [ ] Implement time entry endpoints: `POST /api/cocm/time-entries`, `GET /api/cocm/time-entries?memberId=&month=`
- [ ] Implement monthly summary computation:
  - Aggregate time entries by member and month
  - Apply CoCM CPT thresholds (99492: initial 70 min, 99493: subsequent 60 min, 99494: each additional 30 min)
  - Detect cross-role time duplication (same member, overlapping time periods, different providers)
  - Link care plan tasks to billed time
- [ ] Create `GET /api/cocm/monthly-summary?memberId=&month=` endpoint
- [ ] Integrate with pre-claim compliance gate (CR-P1) for CoCM-specific rules

### 10.4 Frontend Implementation (Conditional)

- [ ] Add CoCM Time Tracking page with time entry form
- [ ] Add Monthly Summary dashboard showing cumulative time, qualifying CPT, and threshold progress
- [ ] Show cross-role duplication warnings
- [ ] Add CoCM billing status to care coordination page

### 10.5 Validation & Testing (Conditional)

- [ ] Verify time entry CRUD operations
- [ ] Verify monthly threshold computation for 99492/99493/99494
- [ ] Verify cross-role duplication detection
- [ ] Verify care plan linkage to billed time

---

# IMPLEMENTATION SUMMARY

## Status Tracker

### Phase 1 - Critical (CR-P1, CR-P2)

- [ ] CR-P1: Pre-Claim Compliance Gate
  - [ ] Data model (billing_readiness_evaluations table, visits columns)
  - [ ] Storage interface methods
  - [ ] Billing readiness evaluation endpoint
  - [ ] Export gate enforcement
  - [ ] Override flow with audit logging
  - [ ] Frontend: billing readiness panel, gate indicator, override dialog
  - [ ] Testing & validation

- [ ] CR-P2: E/M Level and MDM Validation Engine
  - [ ] Data model (em_level_rules, em_evaluations tables)
  - [ ] Storage interface methods
  - [ ] MDM scoring engine
  - [ ] E/M evaluation endpoint
  - [ ] Adjudication summary integration
  - [ ] Finalization gating integration
  - [ ] Seed data for home visit E/M codes
  - [ ] Frontend: E/M validation panel, scorecard, CDS alerts
  - [ ] Testing & validation

### Phase 2 - High (CR-P3, CR-P4, CR-P5)

- [ ] CR-P3: Automated 100% Encounter Audit Engine
  - [ ] Data model (encounter_audit_reports table)
  - [ ] Storage interface methods
  - [ ] Automated audit pipeline function
  - [ ] Finalization trigger
  - [ ] Auto-routing to supervisor review
  - [ ] Dashboard metrics endpoint
  - [ ] Frontend: audit dashboard, score badges, report view
  - [ ] Testing & validation

- [ ] CR-P4: CPT Defensibility Scoring
  - [ ] Data model (cpt_defensibility_rules table)
  - [ ] Storage interface methods
  - [ ] CPT defensibility evaluation function
  - [ ] Defensibility endpoint
  - [ ] Adjudication summary integration
  - [ ] Seed data for common CPT codes
  - [ ] Frontend: CPT defensibility panel, color-coded scores
  - [ ] Testing & validation

- [ ] CR-P5: Payor-Specific Billing Policy Engine
  - [ ] Data model (payor_policies, payor_policy_evaluations tables)
  - [ ] Storage interface methods
  - [ ] Payor policy evaluation function
  - [ ] Payor compliance endpoint
  - [ ] Pre-claim gate integration (CR-P1)
  - [ ] Admin management endpoints
  - [ ] Seed data for common MA/ACA policies
  - [ ] Frontend: payor compliance panel, admin UI, denial risk warnings
  - [ ] Testing & validation

### Phase 3 - Medium (CR-P6, CR-P7, CR-P8)

- [ ] CR-P6: Provider Quality Trending Dashboard
  - [ ] Data model (provider_quality_snapshots table)
  - [ ] Storage interface methods
  - [ ] Provider quality endpoints
  - [ ] Snapshot computation logic
  - [ ] Export for compliance committee
  - [ ] Frontend: quality dashboard, trend charts, provider ranking
  - [ ] Testing & validation

- [ ] CR-P7: Field-Level Documentation Change Tracking
  - [ ] Data model (documentation_changes table)
  - [ ] Storage interface methods
  - [ ] Change tracking middleware for mutation endpoints
  - [ ] Change history endpoint
  - [ ] Remediation linkage
  - [ ] Frontend: change history panel, remediation verification
  - [ ] Testing & validation

- [ ] CR-P8: NLP-Based Documentation-to-Code Alignment
  - [ ] Data model (nlp_code_alignment_results table)
  - [ ] Storage interface methods
  - [ ] NLP alignment analysis function (OpenAI integration)
  - [ ] Code alignment endpoints
  - [ ] Automated audit integration (CR-P3)
  - [ ] Frontend: code alignment panel, action button, warnings
  - [ ] Testing & validation

### Phase 4 - Low/Conditional (CR-P9, CR-P10)

- [ ] CR-P9: Inbound FHIR CarePlan and PractitionerRole Processing
  - [ ] CarePlan resource processor
  - [ ] PractitionerRole resource processor
  - [ ] Duplicate detection
  - [ ] FHIR Playground test payloads
  - [ ] Frontend: external source badges, playground updates
  - [ ] Testing & validation

- [ ] CR-P10: CoCM Time-Based Billing Module (Conditional)
  - [ ] Data model (cocm_time_entries, cocm_monthly_summaries tables)
  - [ ] Storage interface methods
  - [ ] Time entry endpoints
  - [ ] Monthly summary computation with CPT thresholds
  - [ ] Cross-role duplication detection
  - [ ] Pre-claim gate integration (CR-P1)
  - [ ] Frontend: time tracking page, monthly summary, duplication warnings
  - [ ] Testing & validation

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| E/M scoring logic complexity | Start with home visit E/M codes only (99341-99350); expand to other categories in subsequent releases |
| NLP code alignment accuracy | Use confidence thresholds; flag results as advisory, not blocking; allow provider override |
| Payor policy maintenance burden | Start with top 5 payor contracts; provide admin UI for policy management; consider external policy feed integration |
| Performance impact of 100% audit | Run audit asynchronously at finalization; index audit report tables; paginate dashboard queries |
| CoCM module scope creep | Gate implementation behind business decision; keep conditional until BH services confirmed |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Pre-claim gate coverage | 100% of exports pass through billing readiness evaluation |
| E/M mismatch detection rate | Detect over/under-coding in >= 90% of test scenarios |
| Automated audit coverage | 100% of finalized encounters receive automated audit report |
| CPT defensibility scoring | All auto-generated CPT codes evaluated against defensibility rules |
| Provider quality visibility | Rolling quality scores available for all active providers |
| Documentation change tracking | All clinical field mutations captured with before/after values |
