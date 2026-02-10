# Easy Health FHIR R4 API Reference

This document describes the complete FHIR R4 API surface implemented by Easy Health. All endpoints follow the [HL7 FHIR R4](http://hl7.org/fhir/R4/) specification. Errors return standard FHIR `OperationOutcome` resources.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Outbound (Read) Endpoints](#outbound-read-endpoints)
   - [GET /api/fhir/Patient](#get-apifhirpatient)
   - [GET /api/fhir/Patient/:id](#get-apifhirpatientid)
   - [GET /api/fhir/Encounter/:id](#get-apifhirencounterid)
   - [GET /api/fhir/Observation](#get-apifhirobservation)
   - [GET /api/fhir/Condition](#get-apifhircondition)
   - [GET /api/fhir/Bundle](#get-apifhirbundle)
6. [Inbound (Write) Endpoints](#inbound-write-endpoints)
   - [POST /api/fhir/Patient](#post-apifhirpatient)
   - [POST /api/fhir/Bundle](#post-apifhirbundle)
7. [Visit Export Endpoints](#visit-export-endpoints)
   - [POST /api/visits/:id/export](#post-apivisitsidexport)
   - [GET /api/visits/:id/progress-note/export](#get-apivisitsidprogress-noteexport)
8. [Demo / Utility Endpoints](#demo--utility-endpoints)
   - [GET /api/demo/fhir-bundles](#get-apidemofhir-bundles)
   - [GET /api/demo/fhir-bundle/:memberId](#get-apidemofhir-bundlememberid)
9. [FHIR Resource Mappings](#fhir-resource-mappings)
10. [Comprehensive Bundle Composition](#comprehensive-bundle-composition)
11. [LOINC / Terminology Codes Used](#loinc--terminology-codes-used)
12. [Testing Guide](#testing-guide)
13. [Test JSON Payloads](#test-json-payloads)

---

## Overview

Easy Health exposes a FHIR R4 API layer that supports:

- **Outbound (Read)**: Query patients, encounters, observations, conditions, and comprehensive visit bundles in FHIR R4 format
- **Inbound (Write)**: Import patients and bundles (Patient + Encounter) from external EMR systems
- **Visit Export**: Generate comprehensive FHIR document bundles containing 80+ resources per visit
- **Progress Note Export**: Download structured clinical progress notes as text

The comprehensive visit bundle includes **11 distinct FHIR resource types**: Patient, Encounter, Appointment, Coverage, Condition, AllergyIntolerance, Observation, MedicationStatement, Consent, DocumentReference, and Task. Observations span 5 data categories (vitals, historical vitals, labs, assessments, HEDIS measures) and MedicationStatements span 2 categories (history, reconciliation), for a total of **17 data categories** mapped across the 11 resource types.

---

## Base URL

```
http://localhost:5000
```

All FHIR endpoints are prefixed with `/api/fhir/`. Visit export endpoints use `/api/visits/`.

---

## Authentication

The API uses session-based authentication. In the POC/demo environment, authentication is relaxed for API testing. For production, all endpoints require a valid session cookie.

---

## Error Handling

All errors return a FHIR `OperationOutcome` resource:

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "not-found",
      "diagnostics": "Patient not found"
    }
  ]
}
```

| HTTP Status | FHIR Code     | Meaning                          |
|-------------|---------------|----------------------------------|
| 400         | `required`    | Missing required query parameter |
| 400         | `invalid`     | Invalid resource or format       |
| 404         | `not-found`   | Resource not found               |
| 500         | `exception`   | Server error                     |

---

## Outbound (Read) Endpoints

### GET /api/fhir/Patient

List all patients as a FHIR searchset Bundle.

**Request:**
```bash
curl http://localhost:5000/api/fhir/Patient
```

**Response** (200 OK):
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 3,
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "83df54a8-f086-45be-b8cc-07a7062b35e1",
        "identifier": [
          { "system": "urn:easy-health:member-id", "value": "MEM-001" }
        ],
        "name": [
          { "family": "Martinez", "given": ["Dorothy"], "use": "official" }
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
    }
  ]
}
```

---

### GET /api/fhir/Patient/:id

Retrieve a single Patient resource by internal UUID.

**Request:**
```bash
curl http://localhost:5000/api/fhir/Patient/83df54a8-f086-45be-b8cc-07a7062b35e1
```

**Response** (200 OK):
```json
{
  "resourceType": "Patient",
  "id": "83df54a8-f086-45be-b8cc-07a7062b35e1",
  "identifier": [
    { "system": "urn:easy-health:member-id", "value": "MEM-001" }
  ],
  "name": [
    { "family": "Martinez", "given": ["Dorothy"], "use": "official" }
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

**Error** (404):
```json
{
  "resourceType": "OperationOutcome",
  "issue": [{ "severity": "error", "code": "not-found", "diagnostics": "Patient not found" }]
}
```

---

### GET /api/fhir/Encounter/:id

Retrieve a single Encounter resource by visit UUID.

**Request:**
```bash
curl http://localhost:5000/api/fhir/Encounter/0d8a67ff-1216-4d58-9185-838eff151398
```

**Response** (200 OK):
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

**Encounter Status Mapping:**

| Visit Status              | FHIR Encounter.status |
|---------------------------|-----------------------|
| `finalized` or `exported` | `finished`            |
| `in_progress`             | `in-progress`         |
| All other statuses        | `planned`             |

---

### GET /api/fhir/Observation

Retrieve vitals observations for a specific encounter as a searchset Bundle.

**Query Parameters:**

| Parameter   | Required | Description                |
|-------------|----------|----------------------------|
| `encounter` | Yes      | Visit UUID (Encounter ID)  |

**Request:**
```bash
curl "http://localhost:5000/api/fhir/Observation?encounter=0d8a67ff-1216-4d58-9185-838eff151398"
```

**Response** (200 OK):
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 8,
  "entry": [
    {
      "resource": {
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
            { "system": "http://loinc.org", "code": "85354-9", "display": "Blood pressure panel" }
          ]
        },
        "encounter": { "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398" },
        "component": [
          {
            "code": { "coding": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic BP" }] },
            "valueQuantity": { "value": 138, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
          },
          {
            "code": { "coding": [{ "system": "http://loinc.org", "code": "8462-4", "display": "Diastolic BP" }] },
            "valueQuantity": { "value": 82, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
          }
        ]
      }
    }
  ]
}
```

---

### GET /api/fhir/Condition

Retrieve ICD-10 coded conditions for a specific encounter as a searchset Bundle.

**Query Parameters:**

| Parameter   | Required | Description                |
|-------------|----------|----------------------------|
| `encounter` | Yes      | Visit UUID (Encounter ID)  |

**Request:**
```bash
curl "http://localhost:5000/api/fhir/Condition?encounter=0d8a67ff-1216-4d58-9185-838eff151398"
```

**Response** (200 OK):
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 2,
  "entry": [
    {
      "resource": {
        "resourceType": "Condition",
        "id": "code-uuid-1",
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
        "subject": { "reference": "Patient/83df54a8-f086-45be-b8cc-07a7062b35e1" },
        "encounter": { "reference": "Encounter/0d8a67ff-1216-4d58-9185-838eff151398" }
      }
    }
  ]
}
```

---

### GET /api/fhir/Bundle

Retrieve a comprehensive FHIR document bundle for a visit. This is the primary export endpoint containing all clinical data (80+ resources).

**Query Parameters:**

| Parameter | Required | Description               |
|-----------|----------|---------------------------|
| `visit`   | Yes      | Visit UUID                |

**Request:**
```bash
curl "http://localhost:5000/api/fhir/Bundle?visit=0d8a67ff-1216-4d58-9185-838eff151398"
```

**Response** (200 OK):
```json
{
  "resourceType": "Bundle",
  "id": "export-0d8a67ff-1216-4d58-9185-838eff151398",
  "type": "document",
  "timestamp": "2026-02-10T18:39:40.543Z",
  "total": 80,
  "entry": [
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "Patient", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "Encounter", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "Appointment", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "Coverage", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "Condition", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "AllergyIntolerance", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "Observation", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "MedicationStatement", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "Consent", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "DocumentReference", "..." : "..." } },
    { "fullUrl": "urn:uuid:...", "resource": { "resourceType": "Task", "..." : "..." } }
  ]
}
```

See [Comprehensive Bundle Composition](#comprehensive-bundle-composition) for full details on every resource type included.

---

## Inbound (Write) Endpoints

### POST /api/fhir/Patient

Create or update a patient from a FHIR Patient resource. If a patient with the same `urn:easy-health:member-id` identifier exists, it is updated. Otherwise, a new patient is created.

**Request:**
```bash
curl -X POST http://localhost:5000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Patient",
    "identifier": [
      { "system": "urn:easy-health:member-id", "value": "EXT-12345" }
    ],
    "name": [
      { "family": "Smith", "given": ["John"], "use": "official" }
    ],
    "birthDate": "1952-08-20",
    "gender": "male",
    "telecom": [
      { "system": "phone", "value": "(555) 999-0001", "use": "home" },
      { "system": "email", "value": "john.smith@example.com" }
    ],
    "address": [
      {
        "use": "home",
        "line": ["456 Elm Street"],
        "city": "Chicago",
        "state": "IL",
        "postalCode": "60601"
      }
    ],
    "generalPractitioner": [
      { "display": "Dr. Sarah Chen" }
    ]
  }'
```

**Response** (201 Created for new, 200 OK for update):
Returns the created/updated Patient resource in FHIR format.

**Validation:**
- `resourceType` must be `"Patient"`
- `name` array with at least one entry is required
- If no `urn:easy-health:member-id` identifier is provided, an auto-generated ID (`FHIR-{timestamp}`) is assigned

**Side Effects:**
- Creates an audit event: `fhir_patient_created` or `fhir_patient_updated`

---

### POST /api/fhir/Bundle

Import a FHIR Bundle containing Patient and Encounter resources. Processes entries sequentially; Patient resources are processed first so Encounter resources can reference the created patient.

**Supported Resource Types for Import:**

| ResourceType | Action                                |
|--------------|---------------------------------------|
| `Patient`    | Created or updated (upsert by ID)     |
| `Encounter`  | Creates a new visit (scheduled)       |
| Other types  | Skipped with informational message    |

**Request:**
```bash
curl -X POST http://localhost:5000/api/fhir/Bundle \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Bundle",
    "type": "transaction",
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "identifier": [
            { "system": "urn:easy-health:member-id", "value": "EXT-99001" }
          ],
          "name": [
            { "family": "Johnson", "given": ["Mary"], "use": "official" }
          ],
          "birthDate": "1948-11-03",
          "gender": "female",
          "telecom": [
            { "system": "phone", "value": "(555) 888-1234" }
          ],
          "address": [
            {
              "line": ["789 Pine Road"],
              "city": "Peoria",
              "state": "IL",
              "postalCode": "61602"
            }
          ],
          "generalPractitioner": [
            { "display": "Dr. Robert Lee" }
          ]
        }
      },
      {
        "resource": {
          "resourceType": "Encounter",
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
          "subject": { "reference": "Patient/will-be-resolved" },
          "period": { "start": "2026-03-15" }
        }
      }
    ]
  }'
```

**Response** (200 OK):
```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "information",
      "code": "informational",
      "diagnostics": "Processed 2 resources"
    }
  ],
  "results": [
    { "resourceType": "Patient", "action": "created", "id": "generated-uuid" },
    { "resourceType": "Encounter", "action": "created", "id": "generated-uuid" }
  ]
}
```

**Side Effects:**
- Creates an audit event: `fhir_bundle_imported`
- Patient references in subsequent Encounter entries are auto-resolved to the Patient created earlier in the same bundle

---

## Visit Export Endpoints

### POST /api/visits/:id/export

Generate and persist a comprehensive FHIR document bundle for a visit. The bundle is saved to the `ExportArtifact` table and returned in the response.

**Request:**
```bash
curl -X POST http://localhost:5000/api/visits/0d8a67ff-1216-4d58-9185-838eff151398/export
```

**Response** (200 OK):
```json
{
  "fhirBundle": {
    "resourceType": "Bundle",
    "id": "export-0d8a67ff-...",
    "type": "document",
    "timestamp": "2026-02-10T18:45:00.000Z",
    "total": 80,
    "entry": [ "..." ]
  }
}
```

**Side Effects:**
- Creates an `ExportArtifact` record with `exportType: "fhir_bundle"` and the full JSON bundle stored in `fileData`
- Creates an audit event: `visit_exported`

---

### GET /api/visits/:id/progress-note/export

Download a structured clinical progress note as a plain text file. The note is organized into SOAP-style categories.

**Request:**
```bash
curl http://localhost:5000/api/visits/0d8a67ff-1216-4d58-9185-838eff151398/progress-note/export
```

**Response** (200 OK, `text/plain`):
```
=== ENCOUNTER ===
Patient: Dorothy Martinez (MEM-001)
Date: 2026-02-10
Visit Type: Annual Wellness Visit

=== SUBJECTIVE ===
Chief Complaint: Annual wellness visit
...

=== OBJECTIVE ===
Vitals: BP 138/82, HR 72, Temp 98.4F
...

=== ASSESSMENT & PLAN ===
Type 2 Diabetes - Continue current management
...

=== ATTESTATION ===
Electronically signed by ...
```

---

## Demo / Utility Endpoints

### GET /api/demo/fhir-bundles

Returns FHIR bundles for all members with their associated visits (lightweight bundles with Patient, Encounter, Vitals, and Conditions only).

**Request:**
```bash
curl http://localhost:5000/api/demo/fhir-bundles
```

**Response** (200 OK):
```json
[
  {
    "memberId": "MEM-001",
    "memberName": "Dorothy Martinez",
    "visitCount": 1,
    "bundle": {
      "resourceType": "Bundle",
      "type": "document",
      "timestamp": "2026-02-10T...",
      "entry": [ "..." ]
    }
  }
]
```

---

### GET /api/demo/fhir-bundle/:memberId

Returns a FHIR bundle for a specific member (by external member ID like `MEM-001`) with all their visits.

**Request:**
```bash
curl http://localhost:5000/api/demo/fhir-bundle/MEM-001
```

**Response:** Same structure as individual bundle from the list endpoint above.

---

## FHIR Resource Mappings

This section documents how Easy Health internal data maps to each FHIR R4 resource type.

### Patient (from `members` table)

| FHIR Field              | Source Field         | Notes                                    |
|--------------------------|----------------------|------------------------------------------|
| `id`                     | `members.id`         | Internal UUID                            |
| `identifier[0].value`    | `members.memberId`   | System: `urn:easy-health:member-id`      |
| `name[0].family`         | `members.lastName`   |                                          |
| `name[0].given[0]`       | `members.firstName`  |                                          |
| `birthDate`              | `members.dob`        | YYYY-MM-DD format                        |
| `gender`                 | `members.gender`     | Falls back to `"unknown"`                |
| `telecom[].phone`        | `members.phone`      | Use: `home`                              |
| `telecom[].email`        | `members.email`      |                                          |
| `address[0]`             | `members.address/city/state/zip` |                               |
| `generalPractitioner[0]` | `members.pcp`        | Display name only                        |

### Encounter (from `visits` table)

| FHIR Field              | Source Field            | Notes                                   |
|--------------------------|-------------------------|-----------------------------------------|
| `id`                     | `visits.id`             | Visit UUID                              |
| `status`                 | `visits.status`         | See status mapping table above          |
| `class.code`             | —                       | Always `HH` (home health)              |
| `type[0].coding[0].code` | `visits.visitType`      | e.g., `annual_wellness`                 |
| `subject.reference`      | `visits.memberId`       | `Patient/{memberId}`                    |
| `period.start`           | `visits.scheduledDate`  |                                         |
| `period.end`             | `visits.finalizedAt`    | Only if finalized                       |
| `participant[0]`         | `visits.npUserId`       | `Practitioner/{npUserId}`               |

### Appointment (from `visits` table)

| FHIR Field               | Source Field             | Notes                                  |
|---------------------------|--------------------------|----------------------------------------|
| `id`                      | `appt-{visits.id}`       | Prefixed visit UUID                    |
| `status`                  | `visits.status`          | `fulfilled`/`booked`/`arrived`         |
| `serviceType[0].code`     | `visits.visitType`       |                                        |
| `start`                   | `scheduledDate + scheduledTime` | ISO datetime                   |
| `participant[0].actor`    | Patient reference        |                                        |
| `participant[1].actor`    | Practitioner reference   | If NP assigned                         |
| `comment`                 | `visits.travelNotes`     | If present                             |

### Coverage (from `members` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `coverage-{members.id}`   |                                       |
| `status`                  | —                         | Always `active`                       |
| `type.coding[0].code`     | `members.insurancePlan`   | `MA` or `ACA` based on prefix        |
| `subscriber.reference`    | Patient reference         |                                       |
| `beneficiary.reference`   | Patient reference         |                                       |
| `payor[0].display`        | `members.insurancePlan`   | e.g., `MA-PLAN-001`                  |

### Condition (two sources)

**From ICD-10 Visit Codes** (`visit_codes` table):

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `visit_codes.id`          |                                       |
| `clinicalStatus`          | —                         | Always `active`                       |
| `code.coding[0].system`   | —                         | `http://hl7.org/fhir/sid/icd-10-cm`  |
| `code.coding[0].code`     | `visit_codes.code`        | e.g., `E11.9`                         |
| `code.coding[0].display`  | `visit_codes.description` |                                       |
| `encounter.reference`     | Visit reference           |                                       |

**From Member Problem List** (`members.conditions` array):

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `problem-{memberId}-{i}` | Generated                             |
| `meta.source`             | —                         | `patient-history`                     |
| `category[0].code`        | —                         | `problem-list-item`                   |
| `code.text`               | Condition string          | e.g., `"Type 2 Diabetes"`            |

### AllergyIntolerance (from `members.allergies` array)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `allergy-{memberId}-{i}` | Generated                             |
| `clinicalStatus`          | —                         | Always `active`                       |
| `code.text`               | Allergy string            | e.g., `"Penicillin"`                 |
| `patient.reference`       | Patient reference         |                                       |

### Observation - Current Visit Vitals

Each vital sign maps to a separate Observation resource with LOINC codes. See [LOINC Codes](#loinc--terminology-codes-used) for the complete list.

| Vital                    | LOINC Code  | Units    | UCUM Code   |
|--------------------------|-------------|----------|-------------|
| Blood Pressure (panel)   | 85354-9     | mmHg     | mm[Hg]      |
| Systolic BP (component)  | 8480-6      | mmHg     | mm[Hg]      |
| Diastolic BP (component) | 8462-4      | mmHg     | mm[Hg]      |
| Heart Rate               | 8867-4      | bpm      | /min        |
| Respiratory Rate         | 9279-1      | breaths/min | /min     |
| Temperature              | 8310-5      | degF     | [degF]      |
| Oxygen Saturation        | 2708-6      | %        | %           |
| Body Weight              | 29463-7     | lbs      | [lb_av]     |
| Body Height              | 8302-2      | [in_i]   | [in_i]      |
| BMI                      | 39156-5     | kg/m2    | kg/m2       |

**Note:** Weight is stored in US pounds (lbs) and height in total inches. BMI is calculated using the formula: `(weight_lbs / height_in^2) * 703`.

### Observation - Historical Vitals (`vitals_history` table)

Same LOINC codes as current vitals, with additional fields:

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `meta.source`             | `source`                  | `hie`, `practice`, etc.              |
| `effectiveDateTime`       | `measureDate`             |                                       |
| `subject.reference`       | Patient reference         |                                       |

### Observation - Lab Results (`lab_results` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `lab_results.id`          |                                       |
| `meta.source`             | `source`                  | `hie` or `practice`                  |
| `category[0].code`        | —                         | `laboratory`                          |
| `code.coding[0].system`   | —                         | `http://loinc.org`                    |
| `code.coding[0].code`     | `testCode`                | LOINC code                            |
| `code.text`               | `testName`                |                                       |
| `effectiveDateTime`       | `collectedDate`           |                                       |
| `issued`                  | `resultDate`              |                                       |
| `valueQuantity.value`     | `value`                   |                                       |
| `valueQuantity.unit`      | `unit`                    |                                       |
| `referenceRange`          | `referenceMin/Max`        |                                       |
| `interpretation`          | `status`                  | `A` (abnormal), `AA` (critical), `N` |
| `performer[0]`            | `orderingProvider`        |                                       |

### Observation - Assessment Results (`assessment_responses` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `assessment_responses.id` |                                       |
| `status`                  | `status`                  | `final` or `preliminary`              |
| `category[0].code`        | —                         | `survey`                              |
| `code.coding[0].system`   | —                         | `urn:easy-health:instrument`          |
| `code.coding[0].code`     | `instrumentId`            | e.g., `phq2`, `phq9`, `prapare`      |
| `valueInteger`            | `computedScore`           | Assessment score                      |
| `interpretation[0].text`  | `interpretation`          | e.g., `"Low risk"`                    |

### Observation - HEDIS Measure Results (`measure_results` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `measure-{id}`            |                                       |
| `meta.source`             | `captureMethod`           | `in_home_visit`, etc.                |
| `status`                  | `status`                  | `final` or `preliminary`              |
| `category[0].code`        | —                         | `survey`                              |
| `code.coding[0].system`   | —                         | `urn:easy-health:hedis-measure`       |
| `code.coding[0].code`     | `measureId`               | e.g., `BCS`, `COL`, `A1C`            |
| `effectiveDateTime`       | `completedAt`             |                                       |
| `valueString`             | `evidenceMetadata`        | JSON-encoded evidence                 |

### MedicationStatement - History (`medication_history` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `medication_history.id`   |                                       |
| `meta.source`             | `source`                  | `hie`, `practice`                    |
| `status`                  | `status`                  | `active`/`stopped`/`completed`        |
| `medicationCodeableConcept.text` | `medicationName`   |                                       |
| `effectivePeriod.start`   | `startDate`               |                                       |
| `effectivePeriod.end`     | `endDate`                 | If discontinued                       |
| `dosage[0].text`          | `dosage + frequency + route` | Combined string                   |
| `reasonCode[0].text`      | `reason`                  |                                       |
| `informationSource`       | `prescriber`              |                                       |
| `category.coding[0].code` | `category`                | Drug class                            |

### MedicationStatement - Reconciliation (`med_reconciliation` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `recon-{id}`              |                                       |
| `meta.source`             | —                         | Always `visit-reconciliation`         |
| `status`                  | `status`                  | continued=`active`, discontinued=`stopped`, new=`active` |
| `context.reference`       | Visit reference           | `Encounter/{visitId}`                 |
| `dosage[0].text`          | `dosage + frequency`      |                                       |
| `note[0].text`            | `notes`                   |                                       |

### Consent (`visit_consents` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `visit_consents.id`       |                                       |
| `status`                  | `status`                  | granted=`active`, declined=`rejected` |
| `scope.coding[0].code`    | —                         | `patient-privacy`                     |
| `category[0].code`        | `consentType`             | e.g., `visit_consent`, `nopp`, `voice_transcription` |
| `patient.reference`       | Patient reference         |                                       |
| `dateTime`                | `signedAt` or `createdAt` |                                       |
| `performer[0]`            | `witnessName`             |                                       |

### DocumentReference (from `clinical_notes` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `clinical_notes.id`       |                                       |
| `status`                  | —                         | Always `current`                      |
| `type.coding[0].code`     | —                         | LOINC `11506-3` (Progress note)       |
| `content[0].attachment`   | Full clinical note JSON   | Base64-encoded JSON                   |

### Task (from `care_plan_tasks` table)

| FHIR Field               | Source Field              | Notes                                 |
|---------------------------|---------------------------|---------------------------------------|
| `id`                      | `care_plan_tasks.id`      |                                       |
| `status`                  | `status`                  | `completed`/`in-progress`/`requested` |
| `description`             | `title`                   |                                       |
| `for.reference`           | Patient reference         |                                       |
| `encounter.reference`     | Visit reference           |                                       |
| `priority`                | `priority`                | `urgent`/`asap`/`routine`             |
| `note[0].text`            | `description`             |                                       |

---

## Comprehensive Bundle Composition

When you call `GET /api/fhir/Bundle?visit={id}` or `POST /api/visits/{id}/export`, the system assembles a comprehensive document bundle in this order:

| Order | Resource Type        | Source                    | Count    | Provenance            |
|-------|----------------------|---------------------------|----------|-----------------------|
| 1     | Patient              | `members` table           | 1        | —                     |
| 2     | Encounter            | `visits` table            | 1        | —                     |
| 3     | Appointment          | `visits` table            | 1        | —                     |
| 4     | Coverage             | `members.insurancePlan`   | 0-1      | —                     |
| 5     | Condition            | `members.conditions`      | 0-N      | `meta.source: patient-history` |
| 6     | AllergyIntolerance   | `members.allergies`       | 0-N      | —                     |
| 7     | Observation (vitals) | `vitals_records` table    | 0-8      | Current visit         |
| 8     | Observation (hist. vitals) | `vitals_history` table | 0-N   | `meta.source: hie/practice` |
| 9     | Observation (labs)   | `lab_results` table       | 0-N      | `meta.source: hie/practice` |
| 10    | MedicationStatement  | `medication_history`      | 0-N      | `meta.source: hie/practice` |
| 11    | MedicationStatement  | `med_reconciliation`      | 0-N      | `meta.source: visit-reconciliation` |
| 12    | Condition (ICD-10)   | `visit_codes` table       | 0-N      | Visit-specific codes  |
| 13    | Observation (assessments) | `assessment_responses` | 0-N   | —                     |
| 14    | Observation (measures) | `measure_results` table | 0-N      | `meta.source: {captureMethod}` |
| 15    | Consent              | `visit_consents` table    | 0-N      | —                     |
| 16    | DocumentReference    | `clinical_notes` table    | 0-1      | —                     |
| 17    | Task                 | `care_plan_tasks` table   | 0-N      | —                     |

**Typical bundle size:** 60-100+ entries depending on patient history depth.

---

## LOINC / Terminology Codes Used

### Standard Terminology Systems

| System URI                                                  | Description                    |
|-------------------------------------------------------------|--------------------------------|
| `http://loinc.org`                                          | LOINC codes for observations   |
| `http://hl7.org/fhir/sid/icd-10-cm`                        | ICD-10-CM diagnosis codes      |
| `http://terminology.hl7.org/CodeSystem/observation-category`| Observation categories         |
| `http://terminology.hl7.org/CodeSystem/v3-ActCode`          | Encounter class codes          |
| `http://terminology.hl7.org/CodeSystem/condition-clinical`  | Condition clinical status      |
| `http://terminology.hl7.org/CodeSystem/condition-category`  | Condition categories           |
| `http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical` | Allergy clinical status |
| `http://terminology.hl7.org/CodeSystem/consentscope`        | Consent scope                  |
| `http://unitsofmeasure.org`                                 | UCUM units of measure          |

### Easy Health Custom Systems

| System URI                           | Description                     |
|--------------------------------------|---------------------------------|
| `urn:easy-health:member-id`          | Member identifier system        |
| `urn:easy-health:visit-type`         | Visit type codes                |
| `urn:easy-health:instrument`         | Assessment instrument codes     |
| `urn:easy-health:hedis-measure`      | HEDIS measure codes             |
| `urn:easy-health:plan-type`          | Insurance plan type codes       |
| `urn:easy-health:med-category`       | Medication category codes       |
| `urn:easy-health:consent-type`       | Consent type codes              |

---

## Testing Guide

### Prerequisites

The application must be running on `http://localhost:5000`. Start it with:

```bash
npm run dev
```

The demo environment auto-seeds 3 patients and 3 visits on startup.

### Quick Smoke Test

Run these commands in order to verify the FHIR API is working:

```bash
# 1. List all patients
curl -s http://localhost:5000/api/fhir/Patient | jq '.total'
# Expected: 3 (or more if you've imported additional patients)

# 2. Get a specific patient
curl -s http://localhost:5000/api/fhir/Patient/83df54a8-f086-45be-b8cc-07a7062b35e1 | jq '.name[0]'

# 3. Get a comprehensive bundle
curl -s "http://localhost:5000/api/fhir/Bundle?visit=0d8a67ff-1216-4d58-9185-838eff151398" | jq '.total'
# Expected: 80 (for Dorothy Martinez's visit)

# 4. Check resource types in the bundle
curl -s "http://localhost:5000/api/fhir/Bundle?visit=0d8a67ff-1216-4d58-9185-838eff151398" \
  | jq '[.entry[].resource.resourceType] | group_by(.) | map({type: .[0], count: length})'

# 5. Get vitals observations
curl -s "http://localhost:5000/api/fhir/Observation?encounter=0d8a67ff-1216-4d58-9185-838eff151398" | jq '.total'

# 6. Get conditions
curl -s "http://localhost:5000/api/fhir/Condition?encounter=0d8a67ff-1216-4d58-9185-838eff151398" | jq '.total'

# 7. Export a visit (creates ExportArtifact + audit event)
curl -s -X POST http://localhost:5000/api/visits/0d8a67ff-1216-4d58-9185-838eff151398/export | jq '.fhirBundle.total'

# 8. Import a new patient
curl -s -X POST http://localhost:5000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Patient","name":[{"family":"Test","given":["API"]}],"birthDate":"1960-01-01","gender":"male"}' \
  | jq '.id'

# 9. Verify the new patient appears in the list
curl -s http://localhost:5000/api/fhir/Patient | jq '.total'
# Expected: 4 (one more than before)
```

### Testing Error Handling

```bash
# Missing required parameter
curl -s "http://localhost:5000/api/fhir/Observation" | jq '.'
# Returns: OperationOutcome with "encounter query parameter required"

# Non-existent patient
curl -s http://localhost:5000/api/fhir/Patient/non-existent-id | jq '.'
# Returns: OperationOutcome with "Patient not found"

# Non-existent visit bundle
curl -s "http://localhost:5000/api/fhir/Bundle?visit=non-existent-id" | jq '.'
# Returns: OperationOutcome with "Visit not found"

# Invalid Patient import (missing name)
curl -s -X POST http://localhost:5000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Patient","birthDate":"1960-01-01"}' | jq '.'
# Returns: OperationOutcome with "Patient.name is required"

# Invalid Bundle import (wrong resourceType)
curl -s -X POST http://localhost:5000/api/fhir/Bundle \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Patient"}' | jq '.'
# Returns: OperationOutcome with "Expected resourceType 'Bundle'"
```

---

## Test JSON Payloads

### Test 1: Import a Single Patient

Save as `test-patient.json`:

```json
{
  "resourceType": "Patient",
  "identifier": [
    { "system": "urn:easy-health:member-id", "value": "TEST-001" }
  ],
  "name": [
    { "family": "Williams", "given": ["Robert", "James"], "use": "official" }
  ],
  "birthDate": "1955-06-15",
  "gender": "male",
  "telecom": [
    { "system": "phone", "value": "(312) 555-0199", "use": "home" },
    { "system": "phone", "value": "(312) 555-0200", "use": "mobile" },
    { "system": "email", "value": "r.williams@testmail.com" }
  ],
  "address": [
    {
      "use": "home",
      "line": ["100 Test Boulevard", "Apt 4B"],
      "city": "Chicago",
      "state": "IL",
      "postalCode": "60614"
    }
  ],
  "generalPractitioner": [
    { "display": "Dr. Patricia Anderson" }
  ]
}
```

```bash
curl -X POST http://localhost:5000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -d @test-patient.json | jq '.'
```

### Test 2: Import a Bundle (Patient + Encounter)

Save as `test-bundle.json`:

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "identifier": [
          { "system": "urn:easy-health:member-id", "value": "BUNDLE-TEST-001" }
        ],
        "name": [
          { "family": "Garcia", "given": ["Elena"], "use": "official" }
        ],
        "birthDate": "1942-09-22",
        "gender": "female",
        "telecom": [
          { "system": "phone", "value": "(555) 123-4567", "use": "home" }
        ],
        "address": [
          {
            "use": "home",
            "line": ["250 Maple Drive"],
            "city": "Aurora",
            "state": "IL",
            "postalCode": "60502"
          }
        ],
        "generalPractitioner": [
          { "display": "Dr. Michael Torres" }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "Encounter",
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
                "display": "Annual Wellness Visit"
              }
            ]
          }
        ],
        "subject": {
          "reference": "Patient/auto-resolved"
        },
        "period": {
          "start": "2026-04-01"
        }
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "status": "final",
        "code": {
          "coding": [{ "system": "http://loinc.org", "code": "85354-9" }]
        },
        "valueQuantity": { "value": 130, "unit": "mmHg" }
      }
    }
  ]
}
```

```bash
curl -X POST http://localhost:5000/api/fhir/Bundle \
  -H "Content-Type: application/json" \
  -d @test-bundle.json | jq '.'
```

Expected output shows Patient created, Encounter created, and Observation skipped (not a supported import type):

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    { "severity": "information", "code": "informational", "diagnostics": "Processed 3 resources" }
  ],
  "results": [
    { "resourceType": "Patient", "action": "created", "id": "..." },
    { "resourceType": "Encounter", "action": "created", "id": "..." },
    { "resourceType": "Observation", "action": "skipped", "reason": "unsupported resource type" }
  ]
}
```

### Test 3: Export a Visit and Validate Bundle Structure

```bash
# Export and save to file
curl -s -X POST http://localhost:5000/api/visits/0d8a67ff-1216-4d58-9185-838eff151398/export \
  | jq '.fhirBundle' > exported-bundle.json

# Validate bundle structure
cat exported-bundle.json | jq '{
  resourceType: .resourceType,
  type: .type,
  total: .total,
  resources: [.entry[].resource.resourceType] | group_by(.) | map({type: .[0], count: length})
}'
```

Expected output:

```json
{
  "resourceType": "Bundle",
  "type": "document",
  "total": 80,
  "resources": [
    { "type": "AllergyIntolerance", "count": 2 },
    { "type": "Appointment", "count": 1 },
    { "type": "Condition", "count": 3 },
    { "type": "Coverage", "count": 1 },
    { "type": "Encounter", "count": 1 },
    { "type": "MedicationStatement", "count": 4 },
    { "type": "Observation", "count": 65 },
    { "type": "Patient", "count": 1 },
    { "type": "Task", "count": 2 }
  ]
}
```

### Test 4: Verify Provenance Tags

```bash
# Check which resources have meta.source provenance
curl -s "http://localhost:5000/api/fhir/Bundle?visit=0d8a67ff-1216-4d58-9185-838eff151398" \
  | jq '[.entry[] | select(.resource.meta.source) | {type: .resource.resourceType, source: .resource.meta.source}] | group_by(.source) | map({source: .[0].source, count: length, types: [.[].type] | unique})'
```

### Test 5: Update an Existing Patient via FHIR

```bash
# First import
curl -s -X POST http://localhost:5000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Patient",
    "identifier": [{ "system": "urn:easy-health:member-id", "value": "UPDATE-TEST" }],
    "name": [{ "family": "Before", "given": ["Update"] }],
    "birthDate": "1960-01-01",
    "gender": "male"
  }' | jq '.name[0]'
# Returns: { "family": "Before", "given": ["Update"], "use": "official" }

# Update same patient (matched by member-id)
curl -s -X POST http://localhost:5000/api/fhir/Patient \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Patient",
    "identifier": [{ "system": "urn:easy-health:member-id", "value": "UPDATE-TEST" }],
    "name": [{ "family": "After", "given": ["Update"] }],
    "birthDate": "1960-01-01",
    "gender": "male"
  }' | jq '.name[0]'
# Returns: { "family": "After", "given": ["Update"], "use": "official" }
```

---

## Notes and Limitations

1. **FHIR Compliance Level**: The API produces valid FHIR R4 JSON resources but does not implement the full FHIR REST specification (no `_search`, `_include`, `_revinclude`, pagination, versioning, or conditional operations).

2. **Inbound Import Scope**: Only `Patient` and `Encounter` resources are processed during bundle import. All other resource types are acknowledged but skipped.

3. **ID Strategy**: Internal UUIDs are used as FHIR resource IDs. Cross-resource references use the format `{ResourceType}/{uuid}`.

4. **US Units**: Vitals use US standard units (lbs for weight, inches for height, Fahrenheit for temperature). BMI uses the imperial formula: `(weight_lbs / height_in^2) * 703`.

5. **Provenance**: Historical data from HIE or practice systems is tagged with `meta.source` on the resource. Current visit data does not carry provenance tags.

6. **Bundle Type**: Comprehensive bundles use `type: "document"`. Search results use `type: "searchset"`.

7. **Audit Trail**: All inbound FHIR operations (Patient create/update, Bundle import, visit export) create audit events in the `audit_events` table.
