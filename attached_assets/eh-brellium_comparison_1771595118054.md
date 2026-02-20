# Clinical Documentation Audit Platform Comparison Analysis
## Brellium Benchmark vs HT/EH Clinical Documentation Application

---

## PURPOSE

This document evaluates the HT/EH Clinical Documentation Application against the
AI-powered clinical audit capabilities of Brellium.

Brellium automatically audits 100% of clinical documentation for quality,
coding, and billing compliance to proactively identify documentation gaps
prior to claim submission.

This comparison is intended to identify documentation integrity gaps that may:

- Reduce CPT defensibility
- Invalidate Dx documentation
- Cause CoCM billing failure
- Create post-payment audit risk
- Trigger CMS recoupment
- Reduce RAF defensibility downstream (HT Risk Engine impact)

---

# 1. ENCOUNTER-LEVEL AUDIT CAPABILITY

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Audits 100% of encounters | YES | PARTIAL - Completeness engine runs per-visit on demand; human audit queue uses random sampling, not automatic 100% coverage | YES - No automated sweep of all encounters; audit is triggered by user action or random sample |
| Real-time documentation audit | YES | PARTIAL - Completeness engine and CDS rules evaluate in real-time during visit workflow, but this is guidance, not a post-encounter audit | YES - No independent real-time audit layer that fires automatically after documentation is saved |
| Payor requirement validation | YES | PARTIAL - Plan-specific completeness rules exist (MA vs ACA plan packs), but rules are structural (consent, vitals, assessments) not payor-specific billing policy rules | YES - No payor-specific billing policy engine (e.g., LCD/NCD, ABN, modifier rules) |
| Clinical completeness scoring | YES | YES - Completeness engine scores each visit as % of required components passed; adjudication summary provides overallScore | NO |
| Coding compliance validation | YES | PARTIAL - Auto-coding generates CPT/ICD-10 from visit data; diagnosis support scoring validates evidence for each ICD-10 code | YES - No independent coding compliance audit (modifier validation, code bundling rules, NCCI edits) |
| Billing support validation | YES | NO - No explicit billing validation or claim-readiness check prior to submission | YES - No pre-claim billing validation engine |

---

# 2. DOCUMENTATION COMPLETENESS VALIDATION

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Missing assessment detection | YES | YES - Completeness engine detects incomplete assessments via checklist status; finalization gating blocks sign-off if assessments are missing | NO |
| Treatment plan validation | YES | PARTIAL - Care plan tasks exist with status tracking, but no structured validation that the treatment plan is clinically adequate or linked to all active diagnoses | YES - No treatment plan adequacy validation against active problem list |
| Medication documentation audit | YES | YES - Medication reconciliation module tracks review status; completeness engine flags if med recon is not completed | NO |
| BH Care plan linkage to PCP | YES | NO - Application is in-home NP visit focused, not behavioral health CoCM; no BH care plan or PCP linkage workflow | YES - Not applicable to current use case but represents a gap if BH services are added |
| Outcome measure presence (PHQ-9 etc.) | YES | YES - PHQ-2, PHQ-9, PRAPARE tracked with conditional logic (PHQ-9 triggered by PHQ-2 score); completeness engine validates presence | NO |
| Required clinical activity detection | YES | YES - Completeness rules by component type (consent, vitals, medication, assessment, measure, previsit_data) with per-plan configuration | NO |

---

# 3. CODING DEFENSIBILITY VALIDATION

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| CPT support validation | YES | PARTIAL - Auto-coding generates CPT codes linked to visit type and clinical activities; CPT-II codes generated for HEDIS measures | YES - No validation that CPT code is fully supported by documented clinical content (time, complexity, elements) |
| ICD-10 documentation support | YES | YES - Diagnosis support scoring evaluates each ICD-10 against required evidence items (vitals, assessments, medications, labs) with supported/partial/unsupported status | NO |
| E/M level validation | YES | NO - No E/M level determination or validation based on documented history, exam, and MDM elements | YES - Critical gap for E/M visit types |
| MDM validation | YES | NO - No Medical Decision Making complexity assessment or documentation validation | YES - Critical gap for E/M defensibility |
| Session minimum compliance detection | YES | NO - No session duration tracking or minimum time compliance checking | YES - No time-based compliance for any CPT category |
| Documentation → Code alignment check | YES | PARTIAL - MEAT documentation generated per diagnosis; unverified codes flagged; but no automated cross-check between narrative documentation and submitted codes | YES - No automated NLP-based alignment between clinical narrative and code selection |

---

# 4. TIME-BASED BILLING INTEGRITY (CoCM)

Relevant CPT Codes:

- 99492
- 99493
- 99494

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Time attribution validation | YES | NO - No time tracking or attribution system | YES - Full gap; not applicable to current in-home visit model but needed if CoCM is added |
| CPT eligibility validation | YES | NO - No CoCM-specific CPT eligibility engine | YES - Full gap |
| Monthly cumulative threshold tracking | YES | NO - No monthly time accumulation tracking | YES - Full gap |
| Activity type classification | YES | NO - No activity classification for time-based billing | YES - Full gap |
| Cross-role duplication detection | YES | NO - No cross-role time duplication detection | YES - Full gap |
| Care plan linkage to billed time | YES | NO - Care plan exists but has no linkage to time-based billing | YES - Full gap |

**Note:** Section 4 is entirely outside EH's current scope (in-home NP visits). These capabilities become relevant only if CoCM/behavioral health billing is added.

---

# 5. PRE-CLAIM COMPLIANCE CONTROLS

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Prevent billing with missing BH care plan | YES | NO - Not applicable to current in-home visit model | YES - N/A unless BH services added |
| Prevent billing with insufficient time | YES | NO - No time-based billing controls | YES - No session duration validation |
| Prevent billing without PCP oversight | YES | NO - Supervisor review exists but is not PCP oversight in the CoCM sense | YES - Supervisor review is clinical QA, not PCP oversight attestation |
| Prevent billing without outcome measure | YES | PARTIAL - Finalization gating blocks visit sign-off if required measures are incomplete, but this is a documentation gate, not a billing gate | YES - Gate is at finalization, not at claim submission; no claim-level hold |
| Prevent billing without assessment | YES | PARTIAL - Same as above; finalization gating prevents sign-off without required assessments | YES - Same gap; no claim-level enforcement |
| Prevent billing without medication review | YES | PARTIAL - Completeness engine flags missing med recon; finalization gating can block | YES - Same gap; no claim-level enforcement |

---

# 6. PROVIDER REMEDIATION WORKFLOW

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Provider notification of deficiencies | YES | PARTIAL - Supervisor return with structured return reasons notifies NP of deficiencies; completeness engine shows gaps in-workflow | YES - No proactive push notification to provider; relies on provider checking their queue |
| Required remediation instructions | YES | YES - Completeness engine provides remediation links (e.g., "Navigate to Vitals & Exam to record vital signs") with specific navigation paths | NO |
| Correction tracking | YES | PARTIAL - Supervisor review queue includes rework tracking; visit status changes tracked | YES - No structured correction-specific tracking with before/after comparison |
| Documentation change history | YES | PARTIAL - Audit events log key actions (finalized, exported, reviewed) but not field-level change history | YES - No field-level documentation change tracking |
| Timestamped remediation audit trail | YES | PARTIAL - Audit events are timestamped; review sign-offs are timestamped | YES - No dedicated remediation-specific audit trail linking deficiency → correction → verification |
| Provider documentation quality scoring | YES | PARTIAL - Per-visit completeness score and diagnosis support score exist; adjudication summary provides overall score | YES - No provider-level aggregate quality scoring or trending over time |

---

# 7. ENCOUNTER-LEVEL COMPLIANCE SCORING

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Encounter Compliance Score | YES | YES - overallScore computed as average of completeness and diagnosis support scores; drives recommendation (approve/review/return) | NO |
| Documentation Completeness Score | YES | YES - completenessScore based on plan-specific rules with pass/fail/exception per component | NO |
| CPT Defensibility Score | YES | NO - No separate CPT defensibility score; auto-coding generates codes but does not score their defensibility | YES - Need per-CPT defensibility scoring based on documented elements |
| Billing Readiness Score | YES | NO - No billing readiness assessment | YES - No composite score indicating claim submission readiness |
| Audit Risk Rating | YES | PARTIAL - Adjudication recommendation (approve/review/return) based on score thresholds and quality flags serves a similar purpose | YES - Not framed as audit risk; no probabilistic risk rating |
| Provider Quality Trend Tracking | YES | NO - Per-visit scores exist but no provider-level aggregation, trending, or benchmarking | YES - No longitudinal provider quality dashboard |

---

# 8. INTEGRATION CAPABILITY (FHIR)

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Encounter ingestion | YES | YES - FHIR R4 Encounter resource in comprehensive bundles; inbound bundle import with Encounter processing | NO |
| Condition ingestion | YES | YES - FHIR R4 Condition resources; HIE PrevisitContext ingestion with suspected condition workflow | NO |
| Procedure ingestion | YES | YES - FHIR R4 Procedure resources in bundles; inbound Procedure import with duplicate detection | NO |
| CarePlan ingestion | YES | PARTIAL - CarePlan resources generated in outbound FHIR bundles; inbound CarePlan ingestion not implemented | YES - No inbound CarePlan processing from external systems |
| Observation ingestion | YES | YES - FHIR R4 Observation resources for vitals, labs, assessments; HIE inbound Observation import | NO |
| MedicationStatement ingestion | YES | YES - FHIR R4 MedicationStatement; HIE inbound MedicationStatement import with duplicate detection | NO |
| PractitionerRole ingestion | YES | PARTIAL - PractitionerRole included in outbound bundles; no inbound PractitionerRole ingestion | YES - No inbound PractitionerRole processing |

---

# 9. RAF & RADV DOWNSTREAM IMPACT

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Dx documentation support validation | YES | YES - Diagnosis support scoring evaluates each ICD-10 against required evidence items with supported/partial/unsupported status | NO |
| RAF defensibility support | YES | PARTIAL - MEAT/TAMPER compliant progress notes support RAF documentation; diagnosis evidence validation strengthens defensibility | YES - No explicit RAF score impact analysis or HCC mapping validation |
| RADV survivability improvement | YES | YES - RADV-oriented progress note structure with MEAT documentation per diagnosis, coding summary with ICD/CPT linkage, provider attestation block | NO |
| Clinical evidence sufficiency detection | YES | YES - Evidence items per diagnosis rule with met/unmet status; quality flags for missing vitals, incomplete assessments, unverified codes | NO |
| Unsupported diagnosis detection | YES | YES - Diagnosis support scoring identifies "unsupported" diagnoses where no required evidence items are met | NO |
| Coding documentation mismatch detection | YES | PARTIAL - Unverified codes flagged; quality flags raised for documentation gaps; but no automated NLP cross-reference between narrative and codes | YES - No NLP-based narrative-to-code mismatch detection |

---

# STRATEGIC INTERPRETATION

Brellium protects:

Documentation → Claim Integrity

Health Trixss protects:

Claim → Payment Integrity

HT/EH Clinical Documentation must protect:

Encounter → Documentation Integrity

---

# GAP SUMMARY

## Strengths (Parity or Near-Parity with Brellium)

| Area | EH Capability |
|------|---------------|
| Documentation Completeness Scoring | Plan-specific completeness engine with per-component pass/fail/exception |
| ICD-10 Evidence Validation | Diagnosis support scoring with required evidence items per code |
| RADV Documentation | MEAT/TAMPER compliant progress notes with attestation |
| Outcome Measure Tracking | PHQ-2/PHQ-9/PRAPARE with conditional logic |
| FHIR Integration | Bidirectional FHIR R4 with 12 endpoints, 11 resource types |
| Remediation Instructions | Specific navigation links to fix each completeness gap |
| Encounter Compliance Score | Composite scoring with adjudication recommendation |

## Critical Gaps

| Gap | Risk Level | Impact |
|-----|-----------|--------|
| No E/M level or MDM validation | CRITICAL | CPT defensibility failure for E/M visits; audit vulnerability |
| No pre-claim billing gate | CRITICAL | Incomplete documentation can reach claim submission |
| No automated 100% encounter audit | HIGH | Relies on human sampling; gaps may go undetected |
| No payor-specific billing policy engine | HIGH | Payor denials due to LCD/NCD/modifier non-compliance |
| No CPT defensibility scoring | HIGH | Cannot quantify CPT audit risk per encounter |
| No provider quality trending | MEDIUM | Cannot identify consistently underperforming providers |
| No field-level change tracking | MEDIUM | Remediation cannot be verified at granular level |
| No time-based billing (CoCM) | LOW (currently) | Full gap but outside current scope; becomes critical if BH added |
| No NLP narrative-to-code alignment | MEDIUM | Coding mismatches detectable only by manual review |
| No billing readiness score | HIGH | No composite claim-readiness indicator |

---

# 10. RECOMMENDED IMPROVEMENTS (CHANGE REQUEST FEED)

The following improvements are prioritized by risk level and ordered for implementation. Each item is scoped as a potential change request (CR).

## CR-P1: Pre-Claim Compliance Gate (CRITICAL)

**Problem:** Finalization gating prevents visit sign-off but does not prevent claim submission. A claim could be submitted for a visit that passed finalization but still has billing compliance gaps.

**Scope:**
- Add a claim-readiness evaluation layer that runs after finalization and before any export/claim action
- Enforce hard stops for: missing required assessments, missing vitals, missing med recon, unverified ICD-10 codes, unsupported diagnoses
- Generate a Billing Readiness Score (0-100) as a composite of completeness, diagnosis support, and coding compliance
- Block FHIR export or claim file generation when score is below configurable threshold
- Log all gate pass/fail decisions in the audit trail

**Impact:** Prevents claims with documentation gaps from reaching payor, reducing denial and recoupment risk.

---

## CR-P2: E/M Level and MDM Validation Engine (CRITICAL)

**Problem:** No evaluation of E/M level appropriateness or MDM complexity. CPT codes for E/M visits (99345, 99350, etc.) are auto-assigned by visit type without validating that documented history, exam, and MDM elements support the selected level.

**Scope:**
- Implement MDM complexity scoring based on 2021 E/M guidelines (number/complexity of problems, data reviewed, risk of complications)
- Cross-reference documented elements (diagnoses, medications, lab orders, referrals) against MDM requirements for the assigned E/M level
- Flag E/M level mismatches (over-coding or under-coding) as quality flags
- Add E/M Defensibility Score to the adjudication summary
- Include E/M validation in finalization gating

**Impact:** Directly addresses the #1 audit target for CMS and commercial payors.

---

## CR-P3: Automated 100% Encounter Audit Engine (HIGH)

**Problem:** Current audit coverage depends on human random sampling in the audit queue. Not all encounters receive systematic quality review.

**Scope:**
- Implement an automated audit pipeline that evaluates every encounter at finalization
- Run completeness, diagnosis support, coding compliance, and quality flag checks automatically
- Generate an Encounter Audit Report per visit with pass/fail/warning for each audit dimension
- Route encounters below threshold scores to the supervisor review queue automatically
- Provide dashboard metrics: % of encounters audited, average scores, trend lines

**Impact:** Moves from sample-based to 100% audit coverage, matching Brellium's core value proposition.

---

## CR-P4: CPT Defensibility Scoring (HIGH)

**Problem:** Auto-coding generates CPT codes but does not evaluate whether each code is adequately supported by documented clinical elements, time, or complexity.

**Scope:**
- Define defensibility rules per CPT code category (E/M, preventive, assessment, procedure)
- Evaluate each generated CPT against its specific documentation requirements
- Produce a per-CPT defensibility score and an aggregate CPT Defensibility Score per encounter
- Flag under-documented CPT codes with specific remediation instructions
- Include in adjudication summary alongside existing completeness and diagnosis support scores

**Impact:** Reduces CPT-specific audit exposure; provides actionable feedback to providers.

---

## CR-P5: Payor-Specific Billing Policy Engine (HIGH)

**Problem:** Completeness rules are plan-level (MA vs ACA) but do not enforce payor-specific billing policies (LCD, NCD, modifier rules, ABN requirements, frequency limits).

**Scope:**
- Build a configurable payor policy rule engine with rule types: frequency limits, prior auth requirements, modifier requirements, LCD/NCD medical necessity criteria
- Map payor policies to plan packs so rules activate based on patient's insurance
- Evaluate payor rules as part of pre-claim compliance gate (CR-P1)
- Provide payor-specific denial risk warnings during documentation

**Impact:** Reduces payor-specific denials; supports multiple payor contracts with tailored compliance.

---

## CR-P6: Provider Quality Trending Dashboard (MEDIUM)

**Problem:** Per-visit scores exist but no longitudinal view of provider documentation quality. Cannot identify consistently underperforming providers or measure improvement after training.

**Scope:**
- Aggregate completeness, diagnosis support, and quality flag data per provider over time
- Calculate rolling 30/60/90-day provider quality scores
- Identify providers below threshold with automatic flagging
- Provide benchmarking: provider vs. organization average
- Support drill-down from provider trend to individual encounters
- Export provider quality reports for compliance committee review

**Impact:** Enables proactive quality management; supports compliance program requirements.

---

## CR-P7: Field-Level Documentation Change Tracking (MEDIUM)

**Problem:** Audit events log high-level actions (visit finalized, review submitted) but not field-level changes. Remediation corrections cannot be verified at a granular level.

**Scope:**
- Implement field-level change tracking for clinical documentation fields (vitals, assessments, diagnoses, medications, care plan)
- Store before/after values with timestamp, user, and reason
- Link changes to remediation requests from supervisor returns
- Provide a documentation change history view per encounter
- Support compliance review of amendment patterns

**Impact:** Creates a defensible audit trail showing exactly what was changed, when, and why.

---

## CR-P8: NLP-Based Documentation-to-Code Alignment (MEDIUM)

**Problem:** Coding alignment relies on structured data matching (diagnosis rules, evidence items). No analysis of whether the clinical narrative in progress notes actually supports the submitted codes.

**Scope:**
- Implement NLP analysis of progress note text against submitted ICD-10 and CPT codes
- Detect codes that lack narrative support (code present, no clinical discussion)
- Detect documented conditions that lack corresponding codes (clinical discussion present, no code)
- Flag narrative-code mismatches as quality flags with specific remediation
- Use as an additional input to the audit risk rating

**Impact:** Catches coding errors that structured-data validation cannot detect; mirrors Brellium's AI-powered audit approach.

---

## CR-P9: Inbound FHIR CarePlan and PractitionerRole Processing (LOW)

**Problem:** Outbound FHIR includes CarePlan and PractitionerRole resources, but inbound processing from external systems does not handle these resource types.

**Scope:**
- Add inbound FHIR CarePlan ingestion with mapping to EH care plan tasks
- Add inbound PractitionerRole ingestion for provider registry updates
- Include duplicate detection consistent with existing inbound resource patterns

**Impact:** Completes bidirectional FHIR parity; supports care coordination with external systems.

---

## CR-P10: CoCM Time-Based Billing Module (CONDITIONAL)

**Problem:** No time tracking, attribution, or CoCM-specific billing support. Full gap across all Section 4 capabilities.

**Scope (if BH/CoCM services are added):**
- Implement per-activity time tracking with provider attribution
- Build monthly cumulative time threshold engine for 99492/99493/99494
- Classify activities by type (care plan development, consultation, assessment)
- Detect cross-role time duplication
- Link care plan activities to billed time
- Enforce CoCM-specific pre-claim compliance rules

**Impact:** Required only if behavioral health CoCM billing is added to the platform. Currently N/A.

---

# IMPLEMENTATION PRIORITY MATRIX

| Priority | CR | Effort | Risk Reduced |
|----------|-----|--------|-------------|
| P1 | CR-P1: Pre-Claim Compliance Gate | Medium | Claim denial, recoupment |
| P1 | CR-P2: E/M + MDM Validation | High | CPT audit failure |
| P2 | CR-P3: 100% Encounter Audit | High | Undetected documentation gaps |
| P2 | CR-P4: CPT Defensibility Scoring | Medium | CPT-specific audit exposure |
| P2 | CR-P5: Payor Policy Engine | High | Payor-specific denials |
| P3 | CR-P6: Provider Quality Trending | Medium | Provider quality management |
| P3 | CR-P7: Field-Level Change Tracking | Medium | Remediation verification |
| P3 | CR-P8: NLP Code Alignment | High | Coding mismatches |
| P4 | CR-P9: Inbound FHIR Parity | Low | Interoperability completeness |
| P4 | CR-P10: CoCM Module | High | CoCM billing (conditional) |
