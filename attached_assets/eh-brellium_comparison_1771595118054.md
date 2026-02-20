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
| Audits 100% of encounters | YES |  |  |
| Real-time documentation audit | YES |  |  |
| Payor requirement validation | YES |  |  |
| Clinical completeness scoring | YES |  |  |
| Coding compliance validation | YES |  |  |
| Billing support validation | YES |  |  |

---

# 2. DOCUMENTATION COMPLETENESS VALIDATION

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Missing assessment detection | YES |  |  |
| Treatment plan validation | YES |  |  |
| Medication documentation audit | YES |  |  |
| BH Care plan linkage to PCP | YES |  |  |
| Outcome measure presence (PHQ-9 etc.) | YES |  |  |
| Required clinical activity detection | YES |  |  |

---

# 3. CODING DEFENSIBILITY VALIDATION

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| CPT support validation | YES |  |  |
| ICD-10 documentation support | YES |  |  |
| E/M level validation | YES |  |  |
| MDM validation | YES |  |  |
| Session minimum compliance detection | YES |  |  |
| Documentation → Code alignment check | YES |  |  |

---

# 4. TIME-BASED BILLING INTEGRITY (CoCM)

Relevant CPT Codes:

- 99492
- 99493
- 99494

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Time attribution validation | YES |  |  |
| CPT eligibility validation | YES |  |  |
| Monthly cumulative threshold tracking | YES |  |  |
| Activity type classification | YES |  |  |
| Cross-role duplication detection | YES |  |  |
| Care plan linkage to billed time | YES |  |  |

---

# 5. PRE-CLAIM COMPLIANCE CONTROLS

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Prevent billing with missing BH care plan | YES |  |  |
| Prevent billing with insufficient time | YES |  |  |
| Prevent billing without PCP oversight | YES |  |  |
| Prevent billing without outcome measure | YES |  |  |
| Prevent billing without assessment | YES |  |  |
| Prevent billing without medication review | YES |  |  |

---

# 6. PROVIDER REMEDIATION WORKFLOW

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Provider notification of deficiencies | YES |  |  |
| Required remediation instructions | YES |  |  |
| Correction tracking | YES |  |  |
| Documentation change history | YES |  |  |
| Timestamped remediation audit trail | YES |  |  |
| Provider documentation quality scoring | YES |  |  |

---

# 7. ENCOUNTER-LEVEL COMPLIANCE SCORING

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Encounter Compliance Score | YES |  |  |
| Documentation Completeness Score | YES |  |  |
| CPT Defensibility Score | YES |  |  |
| Billing Readiness Score | YES |  |  |
| Audit Risk Rating | YES |  |  |
| Provider Quality Trend Tracking | YES |  |  |

---

# 8. INTEGRATION CAPABILITY (FHIR)

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Encounter ingestion | YES |  |  |
| Condition ingestion | YES |  |  |
| Procedure ingestion | YES |  |  |
| CarePlan ingestion | YES |  |  |
| Observation ingestion | YES |  |  |
| MedicationStatement ingestion | YES |  |  |
| PractitionerRole ingestion | YES |  |  |

---

# 9. RAF & RADV DOWNSTREAM IMPACT

| Capability | Brellium | HT/EH Clinical Documentation | Gap Identified |
|-----------|----------|------------------------------|---------------|
| Dx documentation support validation | YES |  |  |
| RAF defensibility support | YES |  |  |
| RADV survivability improvement | YES |  |  |
| Clinical evidence sufficiency detection | YES |  |  |
| Unsupported diagnosis detection | YES |  |  |
| Coding documentation mismatch detection | YES |  |  |

---

# STRATEGIC INTERPRETATION

Brellium protects:

Documentation → Claim Integrity

Health Trixss protects:

Claim → Payment Integrity

HT/EH Clinical Documentation must protect:

Encounter → Documentation Integrity