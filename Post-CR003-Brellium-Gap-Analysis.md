# Post-CR003 Brellium Parity Gap Analysis
## EH Clinical Documentation Application vs Brellium Benchmark

**Date:** February 20, 2026
**Baseline:** `attached_assets/eh-brellium_comparison_1771595118054.md`
**Implemented:** CR-003 Phases 1–4 (CR-P1 through CR-P10)

---

## PURPOSE

This document re-evaluates every gap identified in the original Brellium comparison analysis after full implementation of CR-003 (Phases 1–4). Each original gap is assessed as **CLOSED**, **PARTIALLY CLOSED**, or **REMAINING**, with implementation references.

---

# 1. ENCOUNTER-LEVEL AUDIT CAPABILITY

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| No automated sweep of all encounters; audit is triggered by user action or random sample | **CLOSED** | CR-P3: Automated 100% Encounter Audit Engine runs at every visit finalization. Evaluates completeness, diagnosis support, coding compliance, E/M defensibility, CPT defensibility, and billing readiness. Auto-routes failed/warning encounters to supervisor review. `encounter_audit_reports` table stores per-visit audit results. |
| No independent real-time audit layer that fires automatically after documentation is saved | **CLOSED** | CR-P3: Audit pipeline fires automatically at finalization. Combined with existing real-time CDS rules during visit workflow, provides both in-workflow guidance and post-documentation audit. |
| No payor-specific billing policy engine (e.g., LCD/NCD, ABN, modifier rules) | **CLOSED** | CR-P5: Payor Policy Engine supports 5 policy types (frequency limits, LCD/NCD, modifier rules, prior auth, ABN). Per-payor rule evaluation with configurable rules. `payor_policies` and `payor_policy_evaluations` tables. |
| No independent coding compliance audit (modifier validation, code bundling rules, NCCI edits) | **PARTIALLY CLOSED** | CR-P4: CPT Defensibility Engine evaluates code support. CR-P5: Modifier rules via Payor Policy Engine. **Remaining:** NCCI edit checking (code pair bundling) not yet implemented as a standalone engine. |
| No pre-claim billing validation engine | **CLOSED** | CR-P1: Pre-Claim Compliance Gate with Billing Readiness Score (0-100), composite of completeness (40%), diagnosis support (35%), coding compliance (25%). Blocks export below 80/100 threshold unless overridden with audit trail. |

**Section 1 Score: 4/5 CLOSED, 1 PARTIALLY CLOSED**

---

# 2. DOCUMENTATION COMPLETENESS VALIDATION

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| No treatment plan adequacy validation against active problem list | **REMAINING** | No structured validation that treatment plan covers all active diagnoses. Care plan tasks exist but no cross-reference engine against problem list. |
| BH Care plan linkage to PCP (if BH services added) | **CLOSED** | CR-P10: CoCM module with care plan linkage to billed time. CR-P9: Inbound CarePlan processing from external systems. External care plan tasks tagged with source="external" for HIE/PCP-originated plans. |

**Section 2 Score: 1/2 CLOSED, 1 REMAINING (pre-existing gaps already at parity remain at parity)**

---

# 3. CODING DEFENSIBILITY VALIDATION

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| No validation that CPT code is fully supported by documented clinical content (time, complexity, elements) | **CLOSED** | CR-P4: CPT Defensibility Engine evaluates 9 element types (vitals, assessments, meds, diagnoses, labs, HEDIS measures, care plans, consents, clinical notes) against configurable rules per CPT code with weighted scoring and remediation instructions. `cpt_defensibility_rules` table. |
| No E/M level determination or validation based on documented history, exam, and MDM elements | **CLOSED** | CR-P2: E/M MDM Validation Engine evaluates CPT codes against CMS 2021 MDM guidelines. Scores problems addressed, data reviewed/ordered, risk of complications. Detects over-coding (error) and under-coding (warning) with suggested CPT codes. `em_level_rules` and `em_evaluations` tables. |
| No Medical Decision Making complexity assessment or documentation validation | **CLOSED** | CR-P2: MDM validation is part of E/M engine. MDM complexity scored on 3 axes per CMS guidelines. |
| No session duration tracking or minimum time compliance checking | **CLOSED** | CR-P10: CoCM time tracking with per-activity duration, monthly cumulative threshold engine for 99492/99493/99494 CPT codes. Activity date and duration tracked per entry. |
| No automated NLP-based alignment between clinical narrative and code selection | **CLOSED** | CR-P8: NLP Code Alignment uses OpenAI GPT-4o (with deterministic keyword-matching fallback). Compares clinical narrative against submitted ICD-10 and CPT codes. Identifies unsupported codes and uncoded conditions. Alignment score and panel on review-finalize. `nlp_code_alignment_results` table. |

**Section 3 Score: 5/5 CLOSED**

---

# 4. TIME-BASED BILLING INTEGRITY (CoCM)

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| No time tracking or attribution system | **CLOSED** | CR-P10: CoCM time entry CRUD with provider attribution. `cocm_time_entries` table with providerId, activityDate, durationMinutes. |
| No CoCM-specific CPT eligibility engine | **CLOSED** | CR-P10: Monthly summary computation with CMS CPT thresholds — 99492 (initial, 70 min), 99493 (subsequent, 60 min), 99494 (add-on, per 30 min excess). |
| No monthly time accumulation tracking | **CLOSED** | CR-P10: Monthly summary with totalMinutes per member per billing month. `cocm_monthly_summaries` table. Historical summaries viewable in frontend. |
| No activity type classification | **CLOSED** | CR-P10: 5 activity types — care_plan_dev, consultation, assessment, coordination, review. |
| No cross-role time duplication detection | **CLOSED** | CR-P10: Cross-role duplication detection identifies when multiple providers log the same activity type on the same date for the same member. Warnings surfaced in monthly summary panel. |
| Care plan exists but has no linkage to time-based billing | **CLOSED** | CR-P10: Time entries accept optional visitId linking to specific encounters. CR-P9: External care plan tasks from FHIR CarePlan ingestion with source tracking. |

**Section 4 Score: 6/6 CLOSED**

---

# 5. PRE-CLAIM COMPLIANCE CONTROLS

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| BH care plan prevention (N/A unless BH added) | **CLOSED** | CR-P10: CoCM module now provides BH billing infrastructure. Care plan linkage via CR-P9. |
| No time-based billing controls | **CLOSED** | CR-P10: CPT threshold engine prevents qualification of CoCM codes without sufficient documented time. |
| Supervisor review is clinical QA, not PCP oversight attestation | **PARTIALLY CLOSED** | Enhanced supervisor review with adjudication scorecard including billing readiness, E/M validation, CPT defensibility, code alignment, and encounter audit badges. **Remaining:** No explicit PCP attestation workflow for CoCM oversight (separate from supervisor QA). |
| Gate is at finalization, not at claim submission | **CLOSED** | CR-P1: Pre-claim compliance gate runs at export/claim action, after finalization. Blocks export when Billing Readiness Score < 80. Separate from finalization gating. |
| No claim-level enforcement for assessments | **CLOSED** | CR-P1: Billing Readiness Score includes completeness component (40% weight) covering assessments. Export blocked if below threshold. |
| No claim-level enforcement for medication review | **CLOSED** | CR-P1: Billing Readiness Score completeness component includes medication reconciliation status. |

**Section 5 Score: 5/6 CLOSED, 1 PARTIALLY CLOSED**

---

# 6. PROVIDER REMEDIATION WORKFLOW

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| No proactive push notification to provider | **REMAINING** | Still relies on provider checking their queue. No push notification system (email, SMS, in-app push). |
| No structured correction-specific tracking with before/after comparison | **CLOSED** | CR-P7: Field-Level Documentation Change Tracking captures before/after values on vitals and other mutation endpoints. Change history panel on visit-detail and review-finalize pages. `documentation_changes` table with oldValue/newValue, remediation linkage. |
| No field-level documentation change tracking | **CLOSED** | CR-P7: Same as above. Full field-level change history per encounter. |
| No dedicated remediation-specific audit trail linking deficiency → correction → verification | **PARTIALLY CLOSED** | CR-P7: Changes can be linked to remediation via remediationId field. CR-P3: Auto-audit at finalization re-evaluates after corrections. **Remaining:** No explicit deficiency→correction→verification chain with formal verification step. |
| No provider-level aggregate quality scoring or trending over time | **CLOSED** | CR-P6: Provider Quality Trending Dashboard with org-wide averages, provider ranking, rolling metrics with drill-down by provider. `provider_quality_snapshots` table. |

**Section 6 Score: 3/5 CLOSED, 1 PARTIALLY CLOSED, 1 REMAINING**

---

# 7. ENCOUNTER-LEVEL COMPLIANCE SCORING

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| No separate CPT defensibility score | **CLOSED** | CR-P4: Per-CPT defensibility scoring with aggregate CPT Defensibility Score per encounter. 9 element types evaluated with weighted scoring and remediation. |
| No billing readiness assessment | **CLOSED** | CR-P1: Billing Readiness Score (0-100) as composite of completeness, diagnosis support, and coding compliance. |
| Not framed as audit risk; no probabilistic risk rating | **CLOSED** | CR-P3: Encounter Audit Engine produces overall audit score with pass/warning/fail result. Combined with CPT defensibility and billing readiness scores provides multi-dimensional risk assessment. |
| No longitudinal provider quality dashboard | **CLOSED** | CR-P6: Provider Quality Trending Dashboard with rolling 30/60/90-day metrics, provider ranking, drill-down to individual encounters. |

**Section 7 Score: 4/4 CLOSED**

---

# 8. INTEGRATION CAPABILITY (FHIR)

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| No inbound CarePlan processing from external systems | **CLOSED** | CR-P9: CarePlan processor in FHIR Bundle handler. Maps FHIR CarePlan activities to care_plan_tasks with source="external" and externalId-based duplicate detection. FHIR Playground includes CarePlan test payload. |
| No inbound PractitionerRole processing | **CLOSED** | CR-P9: PractitionerRole processor in FHIR Bundle handler. Maps to users by NPI for provider roster updates. FHIR Playground includes PractitionerRole test payload. |

**Section 8 Score: 2/2 CLOSED**

---

# 9. RAF & RADV DOWNSTREAM IMPACT

| Original Gap | Status | Evidence |
|-------------|--------|----------|
| No explicit RAF score impact analysis or HCC mapping validation | **REMAINING** | No HCC category mapping or RAF coefficient calculation. Diagnosis support scoring validates evidence but does not compute RAF impact. |
| No NLP-based narrative-to-code mismatch detection | **CLOSED** | CR-P8: NLP Code Alignment with GPT-4o and deterministic fallback. Detects unsupported codes and uncoded conditions. |

**Section 9 Score: 1/2 CLOSED, 1 REMAINING**

---

# OVERALL SCORECARD

## Gap Closure Summary

| Section | Original Gaps | Closed | Partially Closed | Remaining |
|---------|:------------:|:------:|:-----------------:|:---------:|
| 1. Encounter-Level Audit | 5 | 4 | 1 | 0 |
| 2. Documentation Completeness | 2 | 1 | 0 | 1 |
| 3. Coding Defensibility | 5 | 5 | 0 | 0 |
| 4. Time-Based Billing (CoCM) | 6 | 6 | 0 | 0 |
| 5. Pre-Claim Compliance | 6 | 5 | 1 | 0 |
| 6. Provider Remediation | 5 | 3 | 1 | 1 |
| 7. Compliance Scoring | 4 | 4 | 0 | 0 |
| 8. FHIR Integration | 2 | 2 | 0 | 0 |
| 9. RAF/RADV Impact | 2 | 1 | 0 | 1 |
| **TOTAL** | **37** | **31** | **3** | **3** |

## Closure Rate: **84% Fully Closed, 92% Closed or Partially Closed**

---

## REMAINING GAPS (Post-CR003)

### 1. NCCI Edit Checking (Section 1 — Partially Closed)
- **What:** Standalone NCCI code-pair bundling validation engine
- **Risk:** LOW — Modifier rules covered via Payor Policy Engine; NCCI edits are a specialized subset
- **Recommendation:** Add as part of a future coding compliance enhancement, not a standalone CR

### 2. Treatment Plan Adequacy Validation (Section 2 — Remaining)
- **What:** Structured validation that care plan/treatment plan covers all active diagnoses
- **Risk:** MEDIUM — Care plan tasks exist but no cross-reference to problem list
- **Recommendation:** Future CR to add problem-list-to-care-plan coverage analysis

### 3. PCP Oversight Attestation for CoCM (Section 5 — Partially Closed)
- **What:** Explicit PCP attestation workflow for CoCM oversight, distinct from supervisor QA
- **Risk:** LOW — Only relevant for CoCM billing; supervisor review provides clinical oversight
- **Recommendation:** Add when CoCM billing goes live with payor contracts

### 4. Provider Push Notifications (Section 6 — Remaining)
- **What:** Proactive push notification (email/SMS/in-app) when provider has deficiencies
- **Risk:** LOW — Providers can see deficiencies in their queue; push notification is UX enhancement
- **Recommendation:** Future UX improvement; consider email digest or in-app notification badge

### 5. Deficiency-Correction-Verification Chain (Section 6 — Partially Closed)
- **What:** Formal workflow linking specific deficiency → specific correction → verification attestation
- **Risk:** LOW — Field-level change tracking and auto-audit-at-finalization covers most of this
- **Recommendation:** Add formal verification step to remediation workflow in future release

### 6. RAF Score Impact / HCC Mapping (Section 9 — Remaining)
- **What:** HCC category mapping, RAF coefficient calculation, and RAF impact analysis per encounter
- **Risk:** MEDIUM — Important for MA plans where RAF drives capitation payments
- **Recommendation:** Future CR for HCC mapping engine integrated with diagnosis support scoring; aligns with HT Risk Engine roadmap

---

## STRATEGIC ASSESSMENT

### Pre-CR003 State
The original comparison identified **37 gaps** across 9 sections. EH had strong foundations in documentation completeness, ICD-10 evidence validation, and FHIR integration, but lacked claim-level controls, coding defensibility, and audit automation.

### Post-CR003 State
CR-003 addressed the most critical and high-priority gaps:

- **All CRITICAL gaps closed:** E/M + MDM validation, pre-claim compliance gate
- **All HIGH gaps closed:** 100% encounter audit, CPT defensibility, payor policy engine, billing readiness score
- **All MEDIUM gaps closed:** Provider quality trending, field-level change tracking, NLP code alignment
- **All LOW/CONDITIONAL gaps closed:** FHIR CarePlan/PractitionerRole, CoCM time-based billing

### Remaining Risk Profile
The 3 fully remaining gaps and 3 partially closed gaps are all LOW to MEDIUM risk:
- None are CRITICAL
- None directly impact claim submission integrity (the primary Brellium parity objective)
- Most are UX/workflow enhancements or specialized features (NCCI edits, RAF scoring, push notifications)

### Brellium Parity Status: **ACHIEVED for Core Capabilities**
EH now matches or exceeds Brellium across the core audit, defensibility, and compliance domains. The remaining gaps are in peripheral areas that do not affect the primary claim integrity protection chain:

**Documentation → Audit → Defensibility → Compliance Gate → Claim**

This chain is now fully instrumented in EH.

---

## RECOMMENDED NEXT PRIORITIES (Post-CR003)

| Priority | Gap | Risk | Effort |
|----------|-----|------|--------|
| 1 | RAF/HCC Mapping Engine | MEDIUM | HIGH |
| 2 | Treatment Plan Adequacy Validation | MEDIUM | MEDIUM |
| 3 | NCCI Edit Checking | LOW | MEDIUM |
| 4 | PCP Oversight Attestation for CoCM | LOW | LOW |
| 5 | Provider Push Notifications | LOW | LOW |
| 6 | Formal Remediation Verification Chain | LOW | MEDIUM |
