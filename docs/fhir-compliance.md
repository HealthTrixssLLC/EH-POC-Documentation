# Easy Health FHIR R4 Compliance & Interoperability Guide

**Version:** 1.0  
**Last Updated:** 2026-02-18  
**Audience:** Engineering team, integration partners, compliance reviewers

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [FHIR R4 Resource Model](#2-fhir-r4-resource-model)
3. [Terminology Bindings](#3-terminology-bindings)
4. [Comprehensive Bundle Composition](#4-comprehensive-bundle-composition)
5. [Inbound FHIR Processing](#5-inbound-fhir-processing)
6. [FHIR Validation Rules](#6-fhir-validation-rules)
7. [Developer Testing Guide](#7-developer-testing-guide)
8. [Interoperability Roadmap](#8-interoperability-roadmap)

---

## 1. Executive Summary

### Why FHIR R4 Matters for Easy Health

Easy Health is an in-home Nurse Practitioner (NP) visit platform serving Medicare Advantage and ACA health plan populations. We use FHIR R4 as our interoperability standard for three critical reasons:

**Regulatory Compliance**
- **CMS Interoperability & Patient Access Rule (CMS-9115-F):** Requires payers to make patient data available via standardized APIs. Easy Health's FHIR layer enables MA plans to meet this requirement by exporting structured clinical data from in-home visits.
- **21st Century Cures Act / ONC Information Blocking Rule:** Prohibits information blocking and mandates USCDI data exchange. Our FHIR bundle includes all USCDI v1 data classes (patient demographics, encounters, conditions, vitals, medications, allergies, clinical notes).
- **HEDIS / NCQA Digital Quality Measures:** CMS and NCQA are migrating quality measures to FHIR-based electronic clinical quality measures (eCQMs). Our Observation resources for HEDIS measures position us for this transition.
- **TEFCA (Trusted Exchange Framework and Common Agreement):** The national framework for health information exchange mandates FHIR R4 as the standard. Our HIE ingestion pipeline via `POST /api/fhir/PrevisitContext` is TEFCA-ready.

**Business Value**
- **Payer Data Exchange:** Export comprehensive visit bundles (80+ FHIR resources) containing demographics, vitals, diagnoses, medications, assessments, HEDIS measures, consents, and care coordination tasks directly to MA/ACA plan systems.
- **HIE Pre-Visit Intelligence:** Ingest patient clinical history (conditions, labs, vitals, medications) from Health Information Exchanges before the NP arrives at the patient's home, enabling targeted care gap closure.
- **EMR Integration:** Import and export patients and encounters with external EMR systems using standard FHIR Patient and Encounter resources.
- **Audit & RADV Readiness:** Every FHIR operation creates an audit trail. Exported bundles contain provenance tags linking data to its source system.

### Our FHIR Maturity Level

| Capability | Status | Notes |
|---|---|---|
| FHIR R4 JSON resource generation | Production | 11 resource types |
| Comprehensive visit export bundle | Production | 80+ entries per visit |
| Inbound Patient/Encounter import | Production | Upsert by member ID |
| HIE PrevisitContext ingestion | Production | MedicationStatement, Condition, Observation, Procedure |
| FHIR searchset bundles | Production | Patient, Observation, Condition |
| US Core Profile conformance | Partial | Patient, Encounter, Observation largely conformant |
| Bulk FHIR export | Not started | On roadmap |
| SMART on FHIR authorization | Not started | On roadmap |
| Subscription / webhook notifications | Not started | On roadmap |

---

## 2. FHIR R4 Resource Model

Easy Health produces 11 distinct FHIR R4 resource types. This section documents each one with its business purpose, field mapping, annotated JSON example, and conformance notes.

---

### 2.1 Patient

**Why We Use It:** The Patient resource represents members enrolled in Medicare Advantage or ACA health plans who receive in-home NP visits. It carries demographics, contact information, and the member identifier used for payer reporting.

**Easy Health → FHIR Mapping**

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `members.id` | Internal UUID |
| `identifier[0].system` | — | Always `urn:easy-health:member-id` |
| `identifier[0].value` | `members.memberId` | External member ID (e.g., `MEM-001`) |
| `name[0].family` | `members.lastName` | |
| `name[0].given[0]` | `members.firstName` | |
| `name[0].use` | — | Always `official` |
| `birthDate` | `members.dob` | YYYY-MM-DD format |
| `gender` | `members.gender` | Falls back to `unknown` if null |
| `telecom[0]` (phone) | `members.phone` | `system: phone`, `use: home` |
| `telecom[1]` (email) | `members.email` | `system: email` |
| `address[0].line[0]` | `members.address` | |
| `address[0].city` | `members.city` | |
| `address[0].state` | `members.state` | |
| `address[0].postalCode` | `members.zip` | |
| `address[0].use` | — | Always `home` |
| `generalPractitioner[0].display` | `members.pcp` | Display name only |

**Example**

```json
{
  "resourceType": "Patient",
  "id": "83df54a8-f086-45be-b8cc-07a7062b35e1",
  "identifier": [
    {
      "system": "urn:easy-health:member-id",
      "value": "MEM-001"
    }
  ],
  "name": [
    {
      "family": "Martinez",
      "given": ["Dorothy"],
      "use": "official"
    }
  ],
  "birthDate": "1945-03-15",
  "gender": "Female",
  "telecom": [
    { "system": "phone", "value": "(555) 234-5678", "use": "home" },
    { "system": "email", "value": "dorothy.m@email.com" }
  ],
  "address": [
    {
      "use": "home",
      "line": ["123 Oak Lane"],
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62701"
    }
  ],
  "generalPractitioner": [
    { "display": "Dr. James Wilson" }
  ]
}
```

**Conformance Notes**
- `identifier` with system `urn:easy-health:member-id` is required for payer matching. Auto-generated as `FHIR-{timestamp}` if not provided during import.
- `name` array with at least one entry is required (enforced on import).
- `gender` uses FHIR value set (`male`, `female`, `other`, `unknown`). Our database stores free-text gender; mapping normalizes to `unknown` if unrecognized.
- US Core Patient profile requires `identifier`, `name`, `gender` — we satisfy these requirements.

---

### 2.2 Encounter

**Why We Use It:** Represents an in-home clinical visit (Annual Wellness Visit, follow-up, initial visit). The Encounter links the patient, practitioner, visit date, and clinical context.

**Easy Health → FHIR Mapping**

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `visits.id` | Visit UUID |
| `status` | `visits.status` | See status mapping below |
| `class.system` | — | `http://terminology.hl7.org/CodeSystem/v3-ActCode` |
| `class.code` | — | Always `HH` (home health) |
| `class.display` | — | `home health` |
| `type[0].coding[0].system` | — | `urn:easy-health:visit-type` |
| `type[0].coding[0].code` | `visits.visitType` | e.g., `annual_wellness` |
| `subject.reference` | `visits.memberId` | `Patient/{memberId}` |
| `period.start` | `visits.scheduledDate` | YYYY-MM-DD |
| `period.end` | `visits.finalizedAt` | Only if finalized |
| `participant[0].individual.reference` | `visits.npUserId` | `Practitioner/{npUserId}` |

**Encounter Status Mapping**

| Visit Status (Easy Health) | FHIR Encounter.status |
|---|---|
| `finalized`, `exported` | `finished` |
| `in_progress` | `in-progress` |
| All other statuses (`scheduled`, `ready_for_review`, `approved`, etc.) | `planned` |

**Example**

```json
{
  "resourceType": "Encounter",
  "id": "0d8a67ff-1216-4d58-9185-838eff151398",
  "status": "planned",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "HH",
    "display": "home health"
  },
  "type": [
    {
      "coding": [
        {
          "system": "urn:easy-health:visit-type",
          "code": "annual_wellness",
          "display": "annual wellness"
        }
      ]
    }
  ],
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "period": {
    "start": "2026-02-10"
  },
  "participant": [
    {
      "individual": {
        "reference": "Practitioner/245baab3-112a-40fd-bba2-7adb7663a167"
      }
    }
  ]
}
```

**Conformance Notes**
- `class` is always `HH` (home health) since all Easy Health visits are in-home.
- `type` uses a custom code system (`urn:easy-health:visit-type`). Valid codes: `annual_wellness`, `initial`, `follow_up`.
- US Core Encounter profile requires `identifier`, `status`, `class`, `type`, `subject` — we satisfy `status`, `class`, `type`, and `subject`. Adding a formal encounter identifier is a future enhancement.

---

### 2.3 Appointment

**Why We Use It:** Represents the scheduled time slot for an in-home visit. While Encounter captures the clinical event, Appointment captures the logistics (time, location, participants, travel notes).

**Easy Health → FHIR Mapping**

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `appt-{visits.id}` | Prefixed visit UUID |
| `status` | `visits.status` | `fulfilled` / `booked` / `arrived` |
| `serviceType[0].coding[0].code` | `visits.visitType` | |
| `start` | `scheduledDate + scheduledTime` | ISO 8601 datetime |
| `participant[0].actor` | Patient reference | `Patient/{memberId}` |
| `participant[1].actor` | Practitioner reference | `Practitioner/{npUserId}` (if assigned) |
| `comment` | `visits.travelNotes` | If present |

**Appointment Status Mapping**

| Visit Status (Easy Health) | FHIR Appointment.status |
|---|---|
| `finalized` | `fulfilled` |
| `scheduled` | `booked` |
| All other active statuses | `arrived` |

**Example**

```json
{
  "resourceType": "Appointment",
  "id": "appt-0d8a67ff-1216-4d58-9185-838eff151398",
  "status": "booked",
  "serviceType": [
    {
      "coding": [
        {
          "system": "urn:easy-health:visit-type",
          "code": "annual_wellness",
          "display": "annual wellness"
        }
      ]
    }
  ],
  "start": "2026-02-10T09:30:00",
  "participant": [
    {
      "actor": {
        "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1",
        "display": "Dorothy Martinez"
      },
      "status": "accepted"
    },
    {
      "actor": {
        "reference": "Practitioner/245baab3-112a-40fd-bba2-7adb7663a167"
      },
      "status": "accepted"
    }
  ],
  "comment": "Ring doorbell twice. Patient lives on 2nd floor, no elevator."
}
```

**Conformance Notes**
- `start` is composed by combining `scheduledDate` and `scheduledTime`. If no time is specified, defaults to `T00:00:00`.
- Time strings in `scheduledTime` may be in 12-hour format (e.g., `9:30 AM`) and are converted to ISO format.

---

### 2.4 Coverage

**Why We Use It:** Documents the member's insurance plan (Medicare Advantage or ACA). Critical for payer reporting and understanding which plan pack governs the visit requirements.

**Easy Health → FHIR Mapping**

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `coverage-{members.id}` | Prefixed member UUID |
| `status` | — | Always `active` |
| `type.coding[0].system` | — | `urn:easy-health:plan-type` |
| `type.coding[0].code` | `members.insurancePlan` | `MA` or `ACA` based on prefix |
| `type.coding[0].display` | — | `Medicare Advantage` or `ACA` |
| `subscriber.reference` | — | `Patient/{memberId}` |
| `beneficiary.reference` | — | `Patient/{memberId}` |
| `payor[0].display` | `members.insurancePlan` | e.g., `MA-PLAN-001` |

**Example**

```json
{
  "resourceType": "Coverage",
  "id": "coverage-83df54a8-f086-45be-b8cc-07a7062b35e1",
  "status": "active",
  "type": {
    "coding": [
      {
        "system": "urn:easy-health:plan-type",
        "code": "MA",
        "display": "Medicare Advantage"
      }
    ]
  },
  "subscriber": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "beneficiary": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "payor": [
    { "display": "MA-PLAN-001" }
  ]
}
```

**Conformance Notes**
- Coverage is only emitted if `members.insurancePlan` is non-null.
- Plan type detection is prefix-based: values starting with `MA` map to `Medicare Advantage`; all others map to `ACA`.
- `subscriber` and `beneficiary` both reference the same Patient (member is their own subscriber in our model).

---

### 2.5 Condition

**Why We Use It:** Represents diagnoses and problem list items. Conditions come from two sources: (1) ICD-10 coded diagnoses documented during the visit, and (2) historical conditions from the member's problem list. HIE-sourced conditions flow through the suspected conditions pipeline before being confirmed as visit codes.

**Source A: ICD-10 Visit Codes** (`visit_codes` table)

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `visit_codes.id` | |
| `clinicalStatus.coding[0].code` | — | Always `active` |
| `code.coding[0].system` | — | `http://hl7.org/fhir/sid/icd-10-cm` |
| `code.coding[0].code` | `visit_codes.code` | e.g., `E11.9` |
| `code.coding[0].display` | `visit_codes.description` | |
| `subject.reference` | — | `Patient/{memberId}` |
| `encounter.reference` | — | `Encounter/{visitId}` |

**Source B: Member Problem List** (`members.conditions` array)

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | — | Generated as `problem-{memberId}-{index}` |
| `meta.source` | — | `patient-history` |
| `clinicalStatus.coding[0].code` | — | Always `active` |
| `category[0].coding[0].code` | — | `problem-list-item` |
| `code.text` | Condition string | Free text, e.g., `Type 2 Diabetes` |
| `subject.reference` | — | `Patient/{memberId}` |

**Example (Visit Code)**

```json
{
  "resourceType": "Condition",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "clinicalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
        "code": "active"
      }
    ]
  },
  "code": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/sid/icd-10-cm",
        "code": "E11.9",
        "display": "Type 2 diabetes mellitus without complications"
      }
    ]
  },
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "encounter": {
    "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398"
  }
}
```

**Example (Problem List)**

```json
{
  "resourceType": "Condition",
  "id": "problem-83df54a8-f086-45be-b8cc-07a7062b35e1-0",
  "meta": { "source": "patient-history" },
  "clinicalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
        "code": "active"
      }
    ]
  },
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/condition-category",
          "code": "problem-list-item",
          "display": "Problem List Item"
        }
      ]
    }
  ],
  "code": {
    "text": "Type 2 Diabetes"
  },
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  }
}
```

**Conformance Notes**
- Visit code Conditions include ICD-10 coding with system `http://hl7.org/fhir/sid/icd-10-cm`.
- Problem list Conditions use free-text `code.text` (no structured coding) and carry `meta.source: patient-history` for provenance.
- Conditions from `visit_codes` where `removedByNp = true` are excluded from the bundle.
- US Core Condition profile requires `clinicalStatus`, `code`, `subject` — we satisfy all three.

---

### 2.6 AllergyIntolerance

**Why We Use It:** Documents patient allergies for medication safety during med reconciliation and prescribing decisions.

**Easy Health → FHIR Mapping**

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | — | Generated as `allergy-{memberId}-{index}` |
| `clinicalStatus.coding[0].code` | — | Always `active` |
| `code.text` | Allergy string from `members.allergies` | Free text |
| `patient.reference` | — | `Patient/{memberId}` |

**Example**

```json
{
  "resourceType": "AllergyIntolerance",
  "id": "allergy-83df54a8-f086-45be-b8cc-07a7062b35e1-0",
  "clinicalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
        "code": "active"
      }
    ]
  },
  "code": {
    "text": "Penicillin"
  },
  "patient": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  }
}
```

**Conformance Notes**
- Allergies are stored as free-text strings in `members.allergies` array. No RxNorm or SNOMED coding is currently applied.
- Future enhancement: map known allergy names to RxNorm or SNOMED CT codes for better interoperability.
- US Core AllergyIntolerance profile requires `clinicalStatus`, `code`, `patient` — we satisfy all three.

---

### 2.7 Observation

Observations are the most complex resource type in Easy Health, spanning five distinct data categories:

#### 2.7.1 Current Visit Vitals (`vitals_records` table)

**Why We Use It:** Captures vital signs measured during the in-home visit. Each vital sign is a separate Observation resource with LOINC coding.

| Vital Sign | LOINC Code | Display | Unit | UCUM Code |
|---|---|---|---|---|
| Blood Pressure (panel) | `85354-9` | Blood pressure panel | mmHg | `mm[Hg]` |
| Systolic BP (component) | `8480-6` | Systolic BP | mmHg | `mm[Hg]` |
| Diastolic BP (component) | `8462-4` | Diastolic BP | mmHg | `mm[Hg]` |
| Heart Rate | `8867-4` | Heart rate | bpm | `/min` |
| Respiratory Rate | `9279-1` | Respiratory rate | breaths/min | `/min` |
| Body Temperature | `8310-5` | Body temperature | degF | `[degF]` |
| Oxygen Saturation | `2708-6` | Oxygen saturation | % | `%` |
| Body Weight | `29463-7` | Body weight | lbs | `[lb_av]` |
| Body Height | `8302-2` | Body height | in | `[in_i]` |
| BMI | `39156-5` | BMI | kg/m2 | `kg/m2` |

**Key Mapping Details:**
- Blood pressure is a panel observation (`85354-9`) with systolic and diastolic as `component` entries.
- Weight is stored in US pounds (lbs), height in total inches. BMI is calculated using: `(weight_lbs / height_in^2) * 703`.
- Category is always `vital-signs` with system `http://terminology.hl7.org/CodeSystem/observation-category`.
- Each vital gets a unique ID: `{vitals_record_id}-{suffix}` (e.g., `-bp`, `-hr`, `-temp`).

**Example (Blood Pressure Panel)**

```json
{
  "resourceType": "Observation",
  "id": "vitals-uuid-bp",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "vital-signs",
          "display": "Vital Signs"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "85354-9",
        "display": "Blood pressure panel"
      }
    ]
  },
  "encounter": {
    "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398"
  },
  "component": [
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8480-6",
            "display": "Systolic BP"
          }
        ]
      },
      "valueQuantity": {
        "value": 138,
        "unit": "mmHg",
        "system": "http://unitsofmeasure.org",
        "code": "mm[Hg]"
      }
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "8462-4",
            "display": "Diastolic BP"
          }
        ]
      },
      "valueQuantity": {
        "value": 82,
        "unit": "mmHg",
        "system": "http://unitsofmeasure.org",
        "code": "mm[Hg]"
      }
    }
  ]
}
```

#### 2.7.2 Historical Vitals (`vitals_history` table)

**Why We Use It:** Prior vital sign measurements from HIE or practice records. Provides trend data for the NP to assess changes.

- Uses the same LOINC codes as current visit vitals.
- Includes `meta.source` for provenance (`hie`, `practice`).
- Includes `effectiveDateTime` from `measureDate`.
- References `Patient/{memberId}` via `subject` (no encounter reference since these are historical).

#### 2.7.3 Lab Results (`lab_results` table)

**Why We Use It:** Laboratory test results from HIE or practice systems (HbA1c, lipid panels, CBC, metabolic panels, etc.).

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `lab_results.id` | |
| `meta.source` | `source` | `hie` or `practice` |
| `status` | — | Always `final` |
| `category[0].coding[0].code` | — | `laboratory` |
| `code.coding[0].system` | — | `http://loinc.org` |
| `code.coding[0].code` | `testCode` | LOINC code |
| `code.text` | `testName` | |
| `effectiveDateTime` | `collectedDate` | |
| `issued` | `resultDate` | |
| `valueQuantity.value` | `value` | |
| `valueQuantity.unit` | `unit` | |
| `referenceRange[0].low` | `referenceMin` | |
| `referenceRange[0].high` | `referenceMax` | |
| `interpretation[0].coding[0].code` | `status` | `A` (abnormal), `AA` (critical), `N` (normal) |
| `performer[0].display` | `orderingProvider` | |

**Example (HbA1c Lab)**

```json
{
  "resourceType": "Observation",
  "id": "lab-result-uuid-001",
  "meta": { "source": "hie" },
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "4548-4",
        "display": "HbA1c"
      }
    ],
    "text": "Hemoglobin A1c"
  },
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "effectiveDateTime": "2025-11-15",
  "issued": "2025-11-17",
  "valueQuantity": {
    "value": 7.2,
    "unit": "%"
  },
  "referenceRange": [
    {
      "low": { "value": 4.0, "unit": "%" },
      "high": { "value": 5.6, "unit": "%" }
    }
  ],
  "interpretation": [
    {
      "coding": [
        { "code": "A", "display": "high" }
      ]
    }
  ],
  "performer": [
    { "display": "Dr. Sarah Chen" }
  ]
}
```

#### 2.7.4 Assessment Scores (`assessment_responses` table)

**Why We Use It:** Standardized screening instruments (PHQ-2, PHQ-9, PRAPARE, Fall Risk, Cognitive) produce scored results that need to be exchanged with payers for quality measure documentation.

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `assessment_responses.id` | |
| `status` | `status` | `complete` → `final`, otherwise `preliminary` |
| `category[0].coding[0].code` | — | `survey` |
| `code.coding[0].system` | — | `urn:easy-health:instrument` |
| `code.coding[0].code` | `instrumentId` | e.g., `PHQ-2`, `PHQ-9`, `PRAPARE` |
| `valueInteger` | `computedScore` | Numeric score |
| `interpretation[0].text` | `interpretation` | e.g., `Moderate depression` |
| `encounter.reference` | — | `Encounter/{visitId}` |
| `subject.reference` | — | `Patient/{memberId}` |

**Example (PHQ-9)**

```json
{
  "resourceType": "Observation",
  "id": "assessment-uuid-phq9",
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "survey",
          "display": "Survey"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "urn:easy-health:instrument",
        "code": "PHQ-9",
        "display": "PHQ-9"
      }
    ]
  },
  "encounter": {
    "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398"
  },
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "valueInteger": 12,
  "interpretation": [
    {
      "text": "Moderate depression"
    }
  ]
}
```

#### 2.7.5 HEDIS Measure Results (`measure_results` table)

**Why We Use It:** Documents HEDIS quality measure outcomes (Breast Cancer Screening, Colorectal Cancer Screening, HbA1c Control, etc.) for payer quality reporting and Stars ratings.

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `measure-{measure_results.id}` | Prefixed |
| `meta.source` | `captureMethod` | `in_home_visit`, etc. |
| `status` | `status` | `complete` → `final`, otherwise `preliminary` |
| `category[0].coding[0].code` | — | `survey` |
| `code.coding[0].system` | — | `urn:easy-health:hedis-measure` |
| `code.coding[0].code` | `measureId` | e.g., `BCS`, `COL`, `A1C` |
| `effectiveDateTime` | `completedAt` | |
| `valueString` | `evidenceMetadata` | JSON-encoded evidence |
| `encounter.reference` | — | `Encounter/{visitId}` |
| `subject.reference` | — | `Patient/{memberId}` |

**Example (Colorectal Cancer Screening)**

```json
{
  "resourceType": "Observation",
  "id": "measure-result-uuid-col",
  "meta": { "source": "in_home_visit" },
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "survey",
          "display": "Survey"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "urn:easy-health:hedis-measure",
        "code": "COL",
        "display": "COL"
      }
    ],
    "text": "COL"
  },
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "encounter": {
    "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398"
  },
  "effectiveDateTime": "2026-02-10T14:30:00Z",
  "valueString": "{\"lastScreening\":\"2024-06-15\",\"method\":\"colonoscopy\",\"result\":\"normal\"}"
}
```

**Observation Conformance Notes (All Categories)**
- All observations include `status`, `code`, and either `valueQuantity`, `valueInteger`, or `valueString`.
- Vital signs observations use UCUM units via `http://unitsofmeasure.org`.
- US Core Vital Signs profiles require LOINC codes and UCUM units — our vitals conform.
- Assessment and HEDIS observations use custom code systems (`urn:easy-health:instrument` and `urn:easy-health:hedis-measure`). Future work: map to standard LOINC panel codes where available.

---

### 2.8 MedicationStatement

**Why We Use It:** Documents the patient's medication history and the reconciliation performed during the visit. Two distinct subtypes share the same FHIR resource type.

#### Source A: Medication History (`medication_history` table)

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `medication_history.id` | |
| `meta.source` | `source` | `hie`, `practice` |
| `status` | `status` | `active` → `active`, `discontinued` → `stopped`, else `completed` |
| `medicationCodeableConcept.text` | `medicationName` | |
| `medicationCodeableConcept.coding[0].display` | `genericName` | If available |
| `subject.reference` | — | `Patient/{memberId}` |
| `effectivePeriod.start` | `startDate` | |
| `effectivePeriod.end` | `endDate` | If discontinued |
| `dosage[0].text` | `dosage + frequency + route` | Combined string |
| `reasonCode[0].text` | `reason` | If available |
| `informationSource.display` | `prescriber` | |
| `category.coding[0].system` | — | `urn:easy-health:med-category` |
| `category.coding[0].code` | `category` | e.g., `cardiovascular`, `diabetes` |

#### Source B: Medication Reconciliation (`med_reconciliation` table)

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `recon-{med_reconciliation.id}` | Prefixed |
| `meta.source` | — | Always `visit-reconciliation` |
| `status` | `status` | `continued`/`new` → `active`, `discontinued` → `stopped` |
| `medicationCodeableConcept.text` | `medicationName` | |
| `subject.reference` | — | `Patient/{memberId}` |
| `context.reference` | — | `Encounter/{visitId}` |
| `dosage[0].text` | `dosage + frequency` | Combined string |
| `note[0].text` | `notes` | |

**Example (Medication History)**

```json
{
  "resourceType": "MedicationStatement",
  "id": "med-hist-uuid-001",
  "meta": { "source": "hie" },
  "status": "active",
  "medicationCodeableConcept": {
    "text": "Metformin 500mg",
    "coding": [
      { "display": "Metformin Hydrochloride" }
    ]
  },
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "effectivePeriod": {
    "start": "2023-06-01"
  },
  "dosage": [
    {
      "text": "500mg twice daily (oral)"
    }
  ],
  "reasonCode": [
    { "text": "Type 2 Diabetes management" }
  ],
  "informationSource": {
    "display": "Dr. James Wilson"
  },
  "category": {
    "coding": [
      {
        "system": "urn:easy-health:med-category",
        "code": "diabetes"
      }
    ]
  }
}
```

**Example (Reconciliation)**

```json
{
  "resourceType": "MedicationStatement",
  "id": "recon-medrec-uuid-001",
  "meta": { "source": "visit-reconciliation" },
  "status": "active",
  "medicationCodeableConcept": {
    "text": "Lisinopril 10mg"
  },
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "context": {
    "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398"
  },
  "dosage": [
    { "text": "10mg once daily" }
  ],
  "note": [
    { "text": "Patient reports compliance. No side effects." }
  ]
}
```

**Conformance Notes**
- Medications use free-text `medicationCodeableConcept.text`. RxNorm coding is a planned enhancement.
- Medication history carries provenance via `meta.source` (`hie` or `practice`).
- Reconciliation entries are always tagged with `meta.source: visit-reconciliation` and include an encounter context.

---

### 2.9 Consent

**Why We Use It:** Documents patient consent for Notice of Privacy Practices (NOPP) and voice transcription. NOPP consent is required for Medicare in-home visits. Voice transcription consent is required before any audio recording.

**Easy Health → FHIR Mapping**

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `visit_consents.id` | |
| `status` | `status` | `granted` → `active`, `declined` → `rejected`, else `proposed` |
| `scope.coding[0].system` | — | `http://terminology.hl7.org/CodeSystem/consentscope` |
| `scope.coding[0].code` | — | `patient-privacy` |
| `category[0].coding[0].system` | — | `urn:easy-health:consent-type` |
| `category[0].coding[0].code` | `consentType` | `nopp`, `voice_transcription` |
| `patient.reference` | — | `Patient/{memberId}` |
| `dateTime` | `capturedAt` | ISO datetime |
| `performer[0].display` | `capturedByName` | NP who witnessed |

**Example**

```json
{
  "resourceType": "Consent",
  "id": "consent-uuid-nopp",
  "status": "active",
  "scope": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/consentscope",
        "code": "patient-privacy"
      }
    ]
  },
  "category": [
    {
      "coding": [
        {
          "system": "urn:easy-health:consent-type",
          "code": "nopp",
          "display": "nopp"
        }
      ]
    }
  ],
  "patient": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "dateTime": "2026-02-10T09:35:00Z",
  "performer": [
    { "display": "Jennifer Adams, NP" }
  ]
}
```

**Conformance Notes**
- Consent types: `nopp` (Notice of Privacy Practices), `voice_transcription`.
- Consent statuses: `pending`, `granted`, `declined`, `exception`.
- Exception consents include `exceptionReason` (stored in Easy Health but not currently mapped to FHIR extension).
- Voice transcription consent must be `granted` before audio recording is permitted.

---

### 2.10 DocumentReference

**Why We Use It:** Contains the structured clinical progress note (SOAP format) generated for the visit. The note content is base64-encoded JSON within the attachment.

**Easy Health → FHIR Mapping**

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `clinical_notes.id` | |
| `status` | — | Always `current` |
| `type.coding[0].system` | — | `http://loinc.org` |
| `type.coding[0].code` | — | `11506-3` (Progress note) |
| `subject.reference` | — | `Patient/{memberId}` |
| `context.encounter[0].reference` | — | `Encounter/{visitId}` |
| `content[0].attachment.contentType` | — | `application/json` |
| `content[0].attachment.data` | Full clinical note object | Base64-encoded JSON |

**Example**

```json
{
  "resourceType": "DocumentReference",
  "id": "clinical-note-uuid-001",
  "status": "current",
  "type": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "11506-3",
        "display": "Progress note"
      }
    ]
  },
  "subject": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "context": {
    "encounter": [
      {
        "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398"
      }
    ]
  },
  "content": [
    {
      "attachment": {
        "contentType": "application/json",
        "data": "eyJjaGllZkNvbXBsYWludCI6IkFubnVhbCB3ZWxsbmVzcyB2aXNpdCIsLi4ufQ=="
      }
    }
  ]
}
```

**Conformance Notes**
- Only one DocumentReference is emitted per visit (the clinical progress note).
- The attachment data contains the full `clinical_notes` record as base64-encoded JSON, including `chiefComplaint`, `hpiNotes`, `rosNotes`, `examNotes`, `assessmentNotes`, `planNotes`, and `assessmentMeasuresSummary`.
- LOINC code `11506-3` = "Progress note" — the standard document type code.
- US Core DocumentReference profile requires `status`, `type`, `subject`, `content` — we satisfy all four.

---

### 2.11 Task

**Why We Use It:** Represents care coordination tasks generated during the visit (referrals, follow-up appointments, lab orders, specialist consultations). Tasks are assigned to care coordinators for post-visit execution.

**Easy Health → FHIR Mapping**

| FHIR Field | Easy Health Source | Notes |
|---|---|---|
| `id` | `care_plan_tasks.id` | |
| `status` | `status` | `completed` → `completed`, `in_progress` → `in-progress`, else `requested` |
| `description` | `title` | Task title |
| `for.reference` | — | `Patient/{memberId}` |
| `encounter.reference` | — | `Encounter/{visitId}` |
| `priority` | `priority` | `urgent` → `urgent`, `high` → `asap`, else `routine` |
| `note[0].text` | `description` | Detailed task description |

**Example**

```json
{
  "resourceType": "Task",
  "id": "task-uuid-001",
  "status": "requested",
  "description": "Schedule follow-up with endocrinologist",
  "for": {
    "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1"
  },
  "encounter": {
    "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398"
  },
  "priority": "asap",
  "note": [
    {
      "text": "Patient's HbA1c is 7.2%, up from 6.8% last quarter. Endocrinology referral recommended for medication adjustment."
    }
  ]
}
```

**Conformance Notes**
- Task priority mapping: `urgent` → `urgent`, `high` → `asap`, `medium`/`low` → `routine`.
- `assignedTo`, `dueDate`, and `outcome` fields from Easy Health are not currently mapped to FHIR Task fields. Future enhancement: map to `owner`, `restriction.period`, and `output`.

---

## 3. Terminology Bindings

### 3.1 Standard Code Systems

#### ICD-10-CM (Diagnoses)

| Property | Value |
|---|---|
| **System URI** | `http://hl7.org/fhir/sid/icd-10-cm` |
| **Used In** | Condition resources (visit codes) |
| **Lookup** | [ICD-10-CM Browser](https://www.icd10data.com/) or [CMS ICD-10-CM](https://www.cms.gov/medicare/coding-billing/icd-10-codes) |

**Codes Currently Used in Easy Health (examples from seed data):**

| Code | Display | Clinical Context |
|---|---|---|
| `E11.9` | Type 2 diabetes mellitus without complications | Chronic condition management |
| `I10` | Essential (primary) hypertension | Chronic condition management |
| `E78.5` | Hyperlipidemia, unspecified | Cardiovascular risk |
| `J44.1` | COPD with acute exacerbation | Respiratory management |
| `E03.9` | Hypothyroidism, unspecified | Thyroid management |
| `F32.1` | Major depressive disorder, single episode, moderate | Mental health screening |
| `M19.90` | Unspecified osteoarthritis, unspecified site | Musculoskeletal |
| `N18.3` | Chronic kidney disease, stage 3 | Renal management |

**Adding New ICD-10 Codes:**
1. Look up the code at [icd10data.com](https://www.icd10data.com/).
2. Add the code via the visit coding interface (automatically creates a `visit_codes` entry with `codeType: "ICD-10"`).
3. The FHIR bundle builder will automatically include the new code as a Condition resource.
4. Ensure the code is at the highest specificity level available (e.g., use `E11.65` not `E11`).

#### LOINC (Observations)

| Property | Value |
|---|---|
| **System URI** | `http://loinc.org` |
| **Used In** | Observation resources (vitals, labs), DocumentReference type |
| **Lookup** | [LOINC.org Search](https://loinc.org/search/) |

**Complete LOINC Code Table for Easy Health:**

| LOINC Code | Component | Category | Unit | UCUM | Context |
|---|---|---|---|---|---|
| `85354-9` | Blood pressure panel | vital-signs | — | — | Panel containing systolic + diastolic |
| `8480-6` | Systolic blood pressure | vital-signs | mmHg | `mm[Hg]` | BP component |
| `8462-4` | Diastolic blood pressure | vital-signs | mmHg | `mm[Hg]` | BP component |
| `8867-4` | Heart rate | vital-signs | bpm | `/min` | |
| `9279-1` | Respiratory rate | vital-signs | breaths/min | `/min` | |
| `8310-5` | Body temperature | vital-signs | degF | `[degF]` | |
| `2708-6` | Oxygen saturation | vital-signs | % | `%` | SpO2 |
| `29463-7` | Body weight | vital-signs | lbs | `[lb_av]` | |
| `8302-2` | Body height | vital-signs | in | `[in_i]` | Total inches |
| `39156-5` | Body mass index | vital-signs | kg/m2 | `kg/m2` | Calculated |
| `11506-3` | Progress note | document-type | — | — | DocumentReference.type |

**Lab-Specific LOINC Codes (from HIE ingestion):**

| LOINC Code | Test Name | Category |
|---|---|---|
| `4548-4` | Hemoglobin A1c | diabetes |
| `2345-7` | Glucose | metabolic |
| `2093-3` | Total Cholesterol | lipid |
| `2571-8` | Triglycerides | lipid |
| `2085-9` | HDL Cholesterol | lipid |
| `13457-7` | LDL Cholesterol (calculated) | lipid |
| `2160-0` | Creatinine | renal |
| `3094-0` | BUN | renal |
| `33914-3` | eGFR | renal |
| `718-7` | Hemoglobin | hematology |
| `3016-3` | TSH | thyroid |

**Adding New LOINC Codes:**
1. Search for the code at [loinc.org](https://loinc.org/search/).
2. For new vitals: Add the observation generation logic to `vitalsToFhirObservations()` in `server/routes.ts`.
3. For new lab types: Lab results from HIE ingestion automatically pick up the LOINC code from `testCode`. No code changes needed.
4. Always include the UCUM unit code from the [UCUM specification](https://ucum.org/ucum).

#### CPT / HCPCS (Procedures and Billing)

| Property | Value |
|---|---|
| **CPT System URI** | `http://www.ama-assn.org/go/cpt` |
| **HCPCS System URI** | `urn:oid:2.16.840.1.113883.6.285` |
| **Used In** | Visit codes (`visit_codes` table), HIE Procedure ingestion |
| **Lookup** | [AMA CPT Search](https://www.ama-assn.org/practice-management/cpt) |

**Codes Currently Used:**

| Code | Type | Description | Context |
|---|---|---|---|
| `99345` | CPT | Home visit, new patient, high complexity | In-home visit E/M |
| `99350` | CPT | Home visit, established patient, high complexity | In-home visit E/M |
| `G0438` | HCPCS | Annual wellness visit, initial | AWV first visit |
| `G0439` | HCPCS | Annual wellness visit, subsequent | AWV follow-up |
| `G0442` | HCPCS | Annual alcohol misuse screening | Behavioral screening |
| `G0444` | HCPCS | Annual depression screening | PHQ-2/PHQ-9 |
| `96127` | CPT | Brief emotional/behavioral assessment | Assessment administration |
| `99483` | CPT | Cognitive assessment and care planning | Cognitive screening |

#### RxNorm (Medications)

| Property | Value |
|---|---|
| **System URI** | `http://www.nlm.nih.gov/research/umls/rxnorm` |
| **Used In** | Not currently used in FHIR output (medications are free-text) |
| **Lookup** | [RxNav Browser](https://mor.nlm.nih.gov/RxNav/) |
| **Future** | Planned for MedicationStatement structured coding |

**Guidance:** When we add RxNorm support, medication names will be mapped to RxNorm CUIs using the NLM RxNorm API. This will enable medication interaction checking and formulary lookups.

#### SNOMED CT (Clinical Findings)

| Property | Value |
|---|---|
| **System URI** | `http://snomed.info/sct` |
| **Used In** | Not currently used in FHIR output |
| **Lookup** | [SNOMED CT Browser](https://browser.ihtsdotools.org/) |
| **Future** | Planned for AllergyIntolerance substance coding and Condition clinical findings |

### 3.2 HL7 Value Sets

| Value Set | System URI | Used In | Values We Use |
|---|---|---|---|
| Encounter Status | `http://hl7.org/fhir/encounter-status` | Encounter.status | `planned`, `in-progress`, `finished` |
| Encounter Class | `http://terminology.hl7.org/CodeSystem/v3-ActCode` | Encounter.class | `HH` (home health) |
| Condition Clinical Status | `http://terminology.hl7.org/CodeSystem/condition-clinical` | Condition.clinicalStatus | `active` |
| Condition Category | `http://terminology.hl7.org/CodeSystem/condition-category` | Condition.category | `problem-list-item` |
| AllergyIntolerance Clinical Status | `http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical` | AllergyIntolerance.clinicalStatus | `active` |
| Observation Category | `http://terminology.hl7.org/CodeSystem/observation-category` | Observation.category | `vital-signs`, `laboratory`, `survey` |
| Consent Scope | `http://terminology.hl7.org/CodeSystem/consentscope` | Consent.scope | `patient-privacy` |
| Consent Status | `http://hl7.org/fhir/consent-state-codes` | Consent.status | `active`, `rejected`, `proposed` |
| Task Status | `http://hl7.org/fhir/task-status` | Task.status | `requested`, `in-progress`, `completed` |
| Task Priority | `http://hl7.org/fhir/request-priority` | Task.priority | `routine`, `urgent`, `asap` |
| Appointment Status | `http://hl7.org/fhir/appointmentstatus` | Appointment.status | `booked`, `arrived`, `fulfilled` |
| Units of Measure | `http://unitsofmeasure.org` | Observation.valueQuantity | See LOINC table above |

### 3.3 Easy Health Custom Code Systems

| System URI | Description | Values |
|---|---|---|
| `urn:easy-health:member-id` | Member identifier | Format: `MEM-###` or `FHIR-{timestamp}` |
| `urn:easy-health:visit-type` | Visit type codes | `annual_wellness`, `initial`, `follow_up` |
| `urn:easy-health:instrument` | Assessment instruments | `PHQ-2`, `PHQ-9`, `PRAPARE`, `FALL-RISK`, `COGNITIVE`, `FUNCTIONAL` |
| `urn:easy-health:hedis-measure` | HEDIS measure IDs | `BCS`, `COL`, `A1C`, `CBP`, `OMW`, `SPC`, `CDC-EYE`, `KED`, `COA`, `DMS`, `ART`, `MRP`, `FMC` |
| `urn:easy-health:plan-type` | Insurance plan types | `MA` (Medicare Advantage), `ACA` |
| `urn:easy-health:med-category` | Medication categories | `cardiovascular`, `diabetes`, `respiratory`, `mental_health`, `pain`, `thyroid`, `anticoagulant`, `gastrointestinal`, `other` |
| `urn:easy-health:consent-type` | Consent types | `nopp`, `voice_transcription` |

---

## 4. Comprehensive Bundle Composition

### 4.1 Bundle Structure

When you call `GET /api/fhir/Bundle?visit={id}` or `POST /api/visits/{id}/export`, the system assembles a comprehensive FHIR document bundle. The bundle follows a specific assembly order:

```
Bundle (type: "document")
├── Patient                         (1)     ← members table
├── Encounter                       (1)     ← visits table
├── Appointment                     (1)     ← visits table
├── Coverage                        (0-1)   ← members.insurancePlan
├── Condition (problem list)        (0-N)   ← members.conditions[]
├── AllergyIntolerance              (0-N)   ← members.allergies[]
├── Observation (current vitals)    (0-8)   ← vitals_records table
├── Observation (historical vitals) (0-N)   ← vitals_history table
├── Observation (lab results)       (0-N)   ← lab_results table
├── MedicationStatement (history)   (0-N)   ← medication_history table
├── MedicationStatement (recon)     (0-N)   ← med_reconciliation table
├── Condition (ICD-10 codes)        (0-N)   ← visit_codes table
├── Observation (assessments)       (0-N)   ← assessment_responses table
├── Observation (HEDIS measures)    (0-N)   ← measure_results table
├── Consent                         (0-N)   ← visit_consents table
├── DocumentReference               (0-1)   ← clinical_notes table
└── Task                            (0-N)   ← care_plan_tasks table
```

### 4.2 Typical Entry Count Breakdown

For a fully completed Annual Wellness Visit with typical patient history:

| Resource Type | Typical Count | Source | Provenance |
|---|---|---|---|
| Patient | 1 | `members` | — |
| Encounter | 1 | `visits` | — |
| Appointment | 1 | `visits` | — |
| Coverage | 1 | `members.insurancePlan` | — |
| Condition (problem list) | 3-5 | `members.conditions[]` | `meta.source: patient-history` |
| AllergyIntolerance | 1-3 | `members.allergies[]` | — |
| Observation (current vitals) | 8 | `vitals_records` | Current visit |
| Observation (historical vitals) | 5-15 | `vitals_history` | `meta.source: hie` or `practice` |
| Observation (lab results) | 5-20 | `lab_results` | `meta.source: hie` or `practice` |
| MedicationStatement (history) | 3-10 | `medication_history` | `meta.source: hie` or `practice` |
| MedicationStatement (recon) | 3-8 | `med_reconciliation` | `meta.source: visit-reconciliation` |
| Condition (ICD-10 codes) | 2-5 | `visit_codes` | Visit-specific |
| Observation (assessments) | 3-6 | `assessment_responses` | — |
| Observation (HEDIS measures) | 5-13 | `measure_results` | `meta.source: {captureMethod}` |
| Consent | 2 | `visit_consents` | — |
| DocumentReference | 1 | `clinical_notes` | — |
| Task | 1-5 | `care_plan_tasks` | — |
| **Total** | **~60-100+** | | |

### 4.3 Data Flow: Easy Health Pages → FHIR Entries

| Easy Health Page / Form | FHIR Resources Generated |
|---|---|
| Patient Context / Demographics | Patient, Coverage |
| Visit Scheduling | Encounter, Appointment |
| Identity Verification & Consents | Consent (nopp, voice_transcription) |
| Vitals & Exam | Observation (vital-signs) x 8 |
| Assessment Runner (PHQ-2, PHQ-9, PRAPARE, etc.) | Observation (survey) per instrument |
| HEDIS Measure Collection | Observation (survey) per measure |
| Med Reconciliation | MedicationStatement (visit-reconciliation) per med |
| Diagnosis Coding | Condition (ICD-10) per code |
| Review & Finalize (progress note) | DocumentReference |
| Care Coordination (task creation) | Task per care plan task |
| Pre-Visit Summary (HIE data) | Observation (labs, vitals history), MedicationStatement (history), Condition (problem list) |

### 4.4 Bundle Metadata

```json
{
  "resourceType": "Bundle",
  "id": "export-{visitId}",
  "type": "document",
  "timestamp": "2026-02-10T18:39:40.543Z",
  "total": 80,
  "entry": [
    {
      "fullUrl": "urn:uuid:{resourceId}",
      "resource": { "..." }
    }
  ]
}
```

- `id` is prefixed with `export-` followed by the visit UUID.
- `type` is always `document` for comprehensive bundles (vs. `searchset` for query results).
- `total` reflects the actual count of entries in the bundle.
- `fullUrl` uses `urn:uuid:{id}` format for each entry.

---

## 5. Inbound FHIR Processing

### 5.1 Inbound Endpoints Overview

| Endpoint | Purpose | Supported Resource Types |
|---|---|---|
| `POST /api/fhir/Patient` | Create/update a single patient | Patient only |
| `POST /api/fhir/Bundle` | Import Patient + Encounter bundle | Patient, Encounter (others skipped) |
| `POST /api/fhir/PrevisitContext` | HIE pre-visit intelligence ingestion | MedicationStatement, Condition, Observation, Procedure |

### 5.2 Patient Import Flow

```
POST /api/fhir/Patient
  ├── Validate resourceType === "Patient"
  ├── Validate name[] is present
  ├── Extract member-id from identifier (or generate FHIR-{timestamp})
  ├── Check if member exists by memberId
  │   ├── EXISTS → Update member fields
  │   │   └── Audit: fhir_patient_updated
  │   └── NOT EXISTS → Create new member
  │       └── Audit: fhir_patient_created
  └── Return Patient resource in FHIR format
```

### 5.3 Bundle Import Flow

```
POST /api/fhir/Bundle
  ├── Validate resourceType === "Bundle"
  ├── Validate entry[] is present
  ├── Process entries sequentially:
  │   ├── Patient → Create/update member (upsert by member-id)
  │   │   ├── Also imports extensions: conditions, medications, allergies, riskFlags
  │   │   ├── Also imports vitals-history, lab-results, medication-history from extensions
  │   │   └── Stores createdMember reference for Encounter resolution
  │   ├── Encounter → Create new visit
  │   │   ├── Resolves Patient reference from createdMember or subject.reference
  │   │   ├── Assigns random NP user
  │   │   └── Creates checklist items from plan pack
  │   └── Other types → Skipped with informational message
  ├── Audit: fhir_bundle_imported
  └── Return OperationOutcome with results
```

### 5.4 PrevisitContext (HIE) Ingestion Flow

The `POST /api/fhir/PrevisitContext?scheduledEncounterId={visitId}` endpoint is the primary HIE integration point. It accepts a FHIR Bundle from a Health Information Exchange and maps resources to Easy Health's data model.

```
POST /api/fhir/PrevisitContext?scheduledEncounterId={visitId}
  ├── Validate scheduledEncounterId query parameter
  ├── Validate Bundle resourceType and entry[]
  ├── Verify visit exists and is not finalized/locked
  ├── Check for duplicate bundle (by bundle.id)
  ├── Create HieIngestionLog record
  ├── Process each entry:
  │   ├── MedicationStatement
  │   │   ├── Extract medication name, dosage, frequency, route
  │   │   ├── Dedup against existing med_reconciliation (by name + dosage + source)
  │   │   ├── Create med_reconciliation entry (status: "new", source: "external")
  │   │   ├── Dedup against existing medication_history (by name + dosage + source)
  │   │   └── Create medication_history entry (source: "hie")
  │   ├── Condition
  │   │   ├── Extract ICD-10 code from code.coding[]
  │   │   ├── Skip if no ICD-10 code found
  │   │   ├── Dedup against existing visit_codes (by code)
  │   │   ├── Dedup against existing suspected_conditions (by code)
  │   │   ├── Map verificationStatus → confidence (confirmed/probable/suspected)
  │   │   └── Create suspected_condition (status: "pending")
  │   ├── Observation
  │   │   ├── If category === "vital-signs":
  │   │   │   ├── Map LOINC codes to vital sign fields
  │   │   │   ├── Dedup against vitals_history (by date + source)
  │   │   │   └── Create vitals_history entry (source: "hie")
  │   │   └── Else (laboratory):
  │   │       ├── Extract test code, name, value, units, reference ranges
  │   │       ├── Dedup against lab_results (by testCode + date + source)
  │   │       └── Create lab_result entry (source: "hie")
  │   ├── Procedure
  │   │   ├── Extract CPT/HCPCS code from code.coding[]
  │   │   ├── Dedup against visit_codes (by code + source)
  │   │   └── Create visit_code entry (source: "hie")
  │   └── Other types → Skipped
  ├── Update HieIngestionLog (status, resourceSummary, errorDetails)
  ├── Audit: hie_previsit_ingestion
  └── Return OperationOutcome with summary
```

### 5.5 Provenance Tagging

All HIE-sourced data carries provenance markers:

| Data Type | Provenance Field | Value |
|---|---|---|
| Vitals History | `vitals_history.source` | `hie` |
| Lab Results | `lab_results.source` | `hie` |
| Medication History | `medication_history.source` | `hie` |
| Med Reconciliation | `med_reconciliation.source` | `external` |
| Visit Codes (from Procedure) | `visit_codes.source` | `hie` |
| Suspected Conditions | `suspected_conditions.hieSource` | Source system name from `bundle.meta.source` |

When these records are exported as FHIR resources, the source is reflected in `meta.source` on the resource.

### 5.6 Condition Suspecting Logic

HIE Condition resources go through a suspecting pipeline rather than being directly added as diagnoses:

1. **Ingestion:** HIE Condition with ICD-10 code arrives in PrevisitContext bundle.
2. **Deduplication:** Check if the ICD-10 code already exists as a visit code or suspected condition.
3. **Confidence Mapping:**
   - `verificationStatus: confirmed` → `confidence: confirmed`
   - `verificationStatus: provisional` → `confidence: probable`
   - All others → `confidence: suspected`
4. **Suspected Condition Created:** Status = `pending`, awaiting NP review.
5. **NP Review:** Via `PATCH /api/visits/:id/suspected-conditions/:condId`:
   - **Confirm:** Creates a verified `visit_code` entry and links it to the suspected condition.
   - **Dismiss:** Records `dismissalReason` and marks as `dismissed`.
6. **Export:** Only confirmed conditions (now in `visit_codes`) appear as Condition resources in the export bundle.

### 5.7 Deduplication Strategy

| Resource Type | Dedup Key | Logic |
|---|---|---|
| MedicationStatement → med_reconciliation | `medicationName` + `dosage` + `source=external` | Case-insensitive name + dosage match |
| MedicationStatement → medication_history | `medicationName` + `dosage` + `source=hie` | Case-insensitive name + dosage match |
| Condition → visit_codes | `code` + `codeType=ICD-10` | Case-insensitive code match |
| Condition → suspected_conditions | `visitId` + `icdCode` | Unique constraint in database |
| Observation (vitals) → vitals_history | `measureDate` + `source=hie` | Same date and source |
| Observation (labs) → lab_results | `testCode` + `collectedDate` + `source=hie` | Same code, date, and source |
| Procedure → visit_codes | `code` + `source=hie` | Case-insensitive code match |
| Bundle (entire) | `bundle.id` + `visitId` | Checked via `hie_ingestion_log.bundleId` |

### 5.8 Error Handling

The PrevisitContext endpoint uses partial-success semantics:

| Scenario | HTTP Status | Response Status |
|---|---|---|
| All resources processed successfully | 200 | `completed` |
| Some resources failed, some succeeded | 200 | `partial` |
| All resources failed | 422 | `failed` |
| Visit not found | 404 | N/A |
| Visit is finalized/locked | 409 | N/A |
| Missing required parameters | 400 | N/A |
| Server error | 500 | N/A |

Individual entry errors are collected and returned in the `issue` array of the OperationOutcome response, alongside informational messages about processed resources.

---

## 6. FHIR Validation Rules

### 6.1 Required Fields Per Resource Type

| Resource Type | Required FHIR Fields | Easy Health Business Rules |
|---|---|---|
| Patient | `name[0]` | `identifier` with `urn:easy-health:member-id` system expected |
| Encounter | `status`, `class`, `type`, `subject` | `subject` must reference a valid Patient |
| Appointment | `status`, `participant`, `start` | At least one participant (Patient) |
| Coverage | `status`, `type`, `beneficiary` | Only emitted if `insurancePlan` is non-null |
| Condition | `clinicalStatus`, `code`, `subject` | Visit codes require ICD-10 coding |
| AllergyIntolerance | `clinicalStatus`, `code`, `patient` | |
| Observation | `status`, `code` | Vitals require LOINC codes and UCUM units |
| MedicationStatement | `status`, `medicationCodeableConcept`, `subject` | |
| Consent | `status`, `scope`, `category`, `patient` | |
| DocumentReference | `status`, `type`, `content` | Type must be LOINC `11506-3` |
| Task | `status`, `description` | |

### 6.2 Business Rules Beyond FHIR Spec

| Rule | Description | Enforcement Point |
|---|---|---|
| Member ID required | All patients should have a `urn:easy-health:member-id` identifier for payer matching | Patient import — auto-generated if missing |
| Home health class | All Encounters must have `class.code = "HH"` | Bundle builder (hardcoded) |
| Visit status gating | Export only allowed for visits with sufficient clinical data | Export endpoint |
| ICD-10 specificity | Diagnosis codes should be at maximum specificity | Manual review (not enforced programmatically) |
| Consent before recording | Voice transcription consent must be `granted` before audio recording | Recording endpoint validation |
| Finalized visits immutable | Finalized/exported visits cannot accept new HIE data | PrevisitContext endpoint (status check) |
| Locked visits immutable | Visits locked for supervisor review cannot be modified | All mutation endpoints (lock check) |

### 6.3 Referential Integrity Rules

| Reference | Source | Target | Validation |
|---|---|---|---|
| `Encounter.subject` | Visit | Patient | `visits.memberId` → `members.id` |
| `Observation.encounter` | Vitals/Assessment | Encounter | `vitals_records.visitId` → `visits.id` |
| `Observation.subject` | Lab/History | Patient | `lab_results.memberId` → `members.id` |
| `Condition.encounter` | Visit Code | Encounter | `visit_codes.visitId` → `visits.id` |
| `Condition.subject` | Visit Code | Patient | Via visit → member |
| `MedicationStatement.context` | Med Recon | Encounter | `med_reconciliation.visitId` → `visits.id` |
| `Task.encounter` | Care Task | Encounter | `care_plan_tasks.visitId` → `visits.id` |
| `Consent.patient` | Visit Consent | Patient | Via visit → member |
| `Coverage.beneficiary` | Coverage | Patient | `members.id` |

Cross-resource references use the format `{ResourceType}/{uuid}` (e.g., `Patient/83df54a8-...`).

### 6.4 Date/Time Format Requirements

| Field | Format | Example |
|---|---|---|
| `birthDate` | `YYYY-MM-DD` | `1945-03-15` |
| `period.start` / `period.end` | `YYYY-MM-DD` | `2026-02-10` |
| `effectiveDateTime` | `YYYY-MM-DD` or ISO 8601 | `2025-11-15` |
| `dateTime` (Consent) | ISO 8601 | `2026-02-10T09:35:00Z` |
| `Appointment.start` | ISO 8601 datetime | `2026-02-10T09:30:00` |
| `Bundle.timestamp` | ISO 8601 with timezone | `2026-02-10T18:39:40.543Z` |

### 6.5 Code System Validation

The following validations are performed during inbound processing:

| Validation | Endpoint | Rule |
|---|---|---|
| ICD-10 code presence | PrevisitContext (Condition) | Must have at least one coding with ICD-10 system |
| CPT/HCPCS code presence | PrevisitContext (Procedure) | Must have at least one coding with CPT or HCPCS system |
| LOINC code for vitals | PrevisitContext (Observation) | Maps specific LOINC codes to vital sign fields |
| Bundle resourceType | All inbound endpoints | Must be `"Bundle"` for bundle endpoints, `"Patient"` for patient endpoint |

---

## 7. Developer Testing Guide

### 7.1 Prerequisites

Start the application:
```bash
npm run dev
```
The demo environment auto-seeds 3 patients (Dorothy Martinez MEM-001, Robert Johnson MEM-002, Margaret Chen MEM-003) and 3 visits on startup.

### 7.2 Quick Smoke Test

Run these commands to verify the FHIR API is functional:

```bash
# 1. List all patients (expect 3+)
curl -s http://localhost:5000/api/fhir/Patient | jq '.total'

# 2. Get a specific patient
curl -s http://localhost:5000/api/fhir/Patient/83df54a8-f086-45be-b8cc-07a7062b35e1 | jq '.name[0]'

# 3. Get a comprehensive bundle (expect 60-100 entries)
curl -s "http://localhost:5000/api/fhir/Bundle?visit=0d8a67ff-1216-4d58-9185-838eff151398" | jq '.total'

# 4. Check resource types in the bundle
curl -s "http://localhost:5000/api/fhir/Bundle?visit=0d8a67ff-1216-4d58-9185-838eff151398" \
  | jq '[.entry[].resource.resourceType] | group_by(.) | map({type: .[0], count: length})'

# 5. Get vitals observations
curl -s "http://localhost:5000/api/fhir/Observation?encounter=0d8a67ff-1216-4d58-9185-838eff151398" | jq '.total'

# 6. Get conditions
curl -s "http://localhost:5000/api/fhir/Condition?encounter=0d8a67ff-1216-4d58-9185-838eff151398" | jq '.total'

# 7. Export a visit
curl -s -X POST http://localhost:5000/api/visits/0d8a67ff-1216-4d58-9185-838eff151398/export | jq '.fhirBundle.total'

# 8. Import a new patient
curl -s -X POST http://localhost:5000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Patient","name":[{"family":"Test","given":["API"]}],"birthDate":"1960-01-01","gender":"male"}' \
  | jq '.id'
```

### 7.3 Using the FHIR Playground

Easy Health includes a built-in FHIR Playground (accessible at `/fhir-playground` in the UI) that allows you to:

1. **Browse FHIR Patients** — View all patients as FHIR Patient resources.
2. **View Comprehensive Bundles** — Select a visit and see the full 80+ entry export bundle.
3. **Inspect Individual Resources** — Drill into specific resource types within a bundle.
4. **Test Imports** — Paste FHIR JSON and submit Patient or Bundle imports.
5. **Validate Structure** — Check resource counts and types against expectations.

### 7.4 Testing Error Handling

```bash
# Missing required parameter
curl -s "http://localhost:5000/api/fhir/Observation" | jq '.'
# Expect: OperationOutcome with "encounter query parameter required"

# Non-existent patient
curl -s http://localhost:5000/api/fhir/Patient/non-existent-id | jq '.'
# Expect: OperationOutcome with "Patient not found"

# Invalid Patient import (missing name)
curl -s -X POST http://localhost:5000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Patient","birthDate":"1960-01-01"}' | jq '.'
# Expect: OperationOutcome with "Patient.name is required"

# Invalid Bundle import (wrong resourceType)
curl -s -X POST http://localhost:5000/api/fhir/Bundle \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Patient"}' | jq '.'
# Expect: OperationOutcome with "Expected resourceType 'Bundle'"
```

### 7.5 Testing HIE PrevisitContext Ingestion

```bash
# Ingest a pre-visit bundle
curl -s -X POST "http://localhost:5000/api/fhir/PrevisitContext?scheduledEncounterId=0d8a67ff-1216-4d58-9185-838eff151398" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Bundle",
    "id": "test-hie-bundle-001",
    "meta": { "source": "test-hie-system" },
    "entry": [
      {
        "resource": {
          "resourceType": "Condition",
          "code": {
            "coding": [
              {
                "system": "http://hl7.org/fhir/sid/icd-10-cm",
                "code": "E11.65",
                "display": "Type 2 diabetes mellitus with hyperglycemia"
              }
            ]
          },
          "verificationStatus": {
            "coding": [{ "code": "confirmed" }]
          }
        }
      },
      {
        "resource": {
          "resourceType": "MedicationStatement",
          "status": "active",
          "medicationCodeableConcept": {
            "text": "Metformin 1000mg"
          },
          "dosage": [{ "text": "1000mg twice daily" }],
          "effectivePeriod": { "start": "2024-01-15" }
        }
      }
    ]
  }' | jq '.'
```

Expected: OperationOutcome with `created_suspected_condition` and `created_med_reconciliation` actions.

### 7.6 Validating Against HL7 FHIR Validator

To validate Easy Health FHIR output against the official HL7 validator:

1. **Export a bundle:**
   ```bash
   curl -s "http://localhost:5000/api/fhir/Bundle?visit=0d8a67ff-1216-4d58-9185-838eff151398" > bundle.json
   ```

2. **Run the HL7 FHIR Validator:**
   ```bash
   # Download the validator JAR (requires Java)
   wget https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar

   # Validate the bundle
   java -jar validator_cli.jar bundle.json -version 4.0.1
   ```

3. **Common validation warnings you can expect:**
   - Custom code systems (`urn:easy-health:*`) will produce warnings about unknown code systems. This is expected — these are Easy Health-specific extensions.
   - `gender` values stored as title-case (e.g., `Female`) may warn. FHIR expects lowercase (`female`).
   - Missing `identifier` on Encounter resources — planned for future enhancement.

### 7.7 Common Mistakes and How to Avoid Them

| Mistake | Impact | Fix |
|---|---|---|
| Sending `resourceType: "Bundle"` to `POST /api/fhir/Patient` | 400 error | Use correct endpoint for the resource type |
| Omitting `name` array in Patient import | 400 error | Always include at least `name[0].family` |
| Using `Patient/{id}` format for PrevisitContext scheduledEncounterId | 404 error | Use the raw visit UUID, not a FHIR reference |
| Sending a bundle with no `entry` array | 400 error | Must include at least one entry |
| Sending a PrevisitContext bundle without Condition `code.coding` | Warning + skip | Always include ICD-10 coding for conditions |
| Not checking for duplicate bundle ingestion | Double-counted data | Include a unique `bundle.id` in HIE bundles |
| Expecting Observation import via Bundle | Silently skipped | Only Patient and Encounter are imported via `POST /api/fhir/Bundle` |

### 7.8 Testing Checklist for New FHIR Features

When adding or modifying FHIR functionality, verify:

- [ ] New resource type appears in comprehensive bundle output
- [ ] Resource has correct `resourceType` field
- [ ] All required FHIR fields are present
- [ ] Code systems use correct URIs
- [ ] Cross-resource references use `{ResourceType}/{uuid}` format
- [ ] `fullUrl` is set to `urn:uuid:{id}` in bundle entries
- [ ] `meta.source` provenance is set for HIE/external data
- [ ] Deduplication logic prevents duplicate entries
- [ ] Error cases return proper OperationOutcome resources
- [ ] Audit events are created for all operations
- [ ] Bundle `total` count is accurate
- [ ] Resource can be validated by HL7 FHIR Validator (modulo custom code systems)
- [ ] Existing smoke tests still pass

---

## 8. Interoperability Roadmap

### 8.1 Current Capabilities vs. Future Needs

| Capability | Current State | Target State | Priority |
|---|---|---|---|
| FHIR R4 JSON resource generation | 11 resource types | 11+ (add Practitioner, Organization, Location) | Low |
| US Core Profile conformance | Partial (Patient, Encounter, Observation) | Full US Core 5.0.1 | High |
| SMART on FHIR authorization | Not implemented | OAuth2 + SMART scopes | High |
| Bulk FHIR export ($export) | Not implemented | Async bulk export for payer reporting | Medium |
| Subscription notifications | Not implemented | FHIR Subscriptions for real-time data push | Medium |
| RxNorm medication coding | Free text only | RxNorm CUI + NDC codes | Medium |
| SNOMED CT allergy coding | Free text only | SNOMED CT substance codes | Low |
| Provenance resource | `meta.source` only | Full Provenance resources per US Core | Medium |
| FHIR search parameters | `encounter` and `visit` only | Full search parameter support (`_id`, `date`, `patient`, etc.) | Low |

### 8.2 US Core Profile Compliance Status

| US Core Profile | Our Resource | Compliance | Gaps |
|---|---|---|---|
| US Core Patient | Patient | High | Gender should be lowercase; add `us-core-race` and `us-core-ethnicity` extensions |
| US Core Encounter | Encounter | Medium | Missing `identifier`, need standard `type` coding (CPT E/M codes) |
| US Core Condition | Condition | Medium | Problem list items lack structured coding (free text only) |
| US Core AllergyIntolerance | AllergyIntolerance | Low | No substance coding (SNOMED/RxNorm) |
| US Core Vital Signs | Observation (vitals) | High | LOINC codes and UCUM units present |
| US Core Laboratory Result | Observation (labs) | Medium | LOINC codes present; need consistent unit coding |
| US Core DocumentReference | DocumentReference | High | LOINC type code present |
| US Core MedicationRequest | — | Not applicable | We use MedicationStatement, not MedicationRequest |
| US Core Practitioner | — | Not implemented | Practitioner resources referenced but not emitted |
| US Core Organization | — | Not implemented | Organization (practice/payer) not emitted |
| US Core Location | — | Not implemented | Location (patient home) not emitted |

### 8.3 Da Vinci Implementation Guides

The following Da Vinci IGs are relevant to Easy Health's use case:

| Implementation Guide | Relevance | Status |
|---|---|---|
| **Da Vinci PDex (Payer Data Exchange)** | Export clinical data to MA/ACA payers | Our bundle composition aligns; formal conformance testing needed |
| **Da Vinci CDEX (Clinical Data Exchange)** | Request/respond to clinical data requests | Not implemented; relevant for payer clinical data requests |
| **Da Vinci DEQM (Data Exchange for Quality Measures)** | HEDIS/quality measure reporting via FHIR | Our HEDIS Observation resources partially align; need MeasureReport resource |
| **Da Vinci ATR (Member Attribution)** | Member-to-plan attribution | Not implemented; relevant for multi-plan deployments |
| **Da Vinci PAS (Prior Authorization)** | Prior authorization requests | Not applicable to current workflow |

### 8.4 TEFCA Readiness Assessment

| TEFCA Requirement | Easy Health Status | Notes |
|---|---|---|
| FHIR R4 API | Met | Core endpoints implemented |
| USCDI v1 data classes | Mostly met | Patient, Encounters, Conditions, Vitals, Labs, Medications, Allergies, Clinical Notes |
| USCDI v3 additions | Partially met | Missing: Health Insurance Information (structured), Clinical Tests, Diagnostic Imaging |
| Provenance tracking | Partially met | `meta.source` present; full Provenance resource needed |
| Security (OAuth2) | Not met | Session-based auth only; SMART on FHIR needed |
| Patient matching | Partially met | By member ID; need algorithmic matching (demographics-based) |
| Query-based exchange | Partially met | Read endpoints available; limited search parameters |
| Document-based exchange | Met | Comprehensive document bundles available |

### 8.5 Bulk FHIR Export Considerations

For the planned `$export` operation:

1. **Scope:** System-level export of all patients/encounters, or group-level export by plan/program.
2. **Format:** NDJSON (newline-delimited JSON) per the Bulk Data specification.
3. **Resource types to include:** Patient, Encounter, Condition, Observation, MedicationStatement, AllergyIntolerance, Coverage.
4. **Performance:** Async operation with status polling. Will need background job processing (not real-time).
5. **Authorization:** Backend services authorization (OAuth2 client credentials grant) per SMART Backend Services specification.
6. **Use case:** Monthly payer reporting, quality measure submission, population health analytics.

---

## Appendix: Reference Links

| Resource | URL |
|---|---|
| HL7 FHIR R4 Specification | https://hl7.org/fhir/R4/ |
| US Core Implementation Guide | https://www.hl7.org/fhir/us/core/ |
| LOINC Code Search | https://loinc.org/search/ |
| ICD-10-CM Browser | https://www.icd10data.com/ |
| RxNav (RxNorm) | https://mor.nlm.nih.gov/RxNav/ |
| SNOMED CT Browser | https://browser.ihtsdotools.org/ |
| UCUM Units | https://ucum.org/ucum |
| FHIR Validator | https://github.com/hapifhir/org.hl7.fhir.core |
| Da Vinci Implementation Guides | https://www.hl7.org/fhir/us/davinci-pdex/ |
| TEFCA | https://www.healthit.gov/topic/interoperability/policy/trusted-exchange-framework-and-common-agreement-tefca |
| CMS Interoperability Rules | https://www.cms.gov/regulations-and-guidance/guidance/interoperability/ |
| Easy Health FHIR API Reference | [docs/fhir-api-reference.md](./fhir-api-reference.md) |
