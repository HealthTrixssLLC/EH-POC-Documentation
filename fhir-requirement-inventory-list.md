# Easy Health FHIR Implementation Guide - Resource Requirement Inventory

> **Purpose**: Complete inventory of all FHIR R4 resources, profiles, extensions, code systems, value sets, and operations used by the Easy Health platform for interoperability. This document serves as the requirements specification for developing an Easy Health FHIR IG.
>
> **FHIR Version**: R4 (4.0.1)
>
> **Last Updated**: 2026-02-13

---

## Table of Contents

1. [Resource Summary Matrix](#1-resource-summary-matrix)
2. [Resource Profiles - Detailed Specifications](#2-resource-profiles---detailed-specifications)
3. [Custom Extensions](#3-custom-extensions)
4. [Code Systems](#4-code-systems)
5. [Value Sets](#5-value-sets)
6. [Operations & Interactions](#6-operations--interactions)
7. [Bundle Profiles](#7-bundle-profiles)
8. [Capability Statement Summary](#8-capability-statement-summary)
9. [Data Mapping - Internal to FHIR](#9-data-mapping---internal-to-fhir)
10. [CR-002 Planned Resources](#10-cr-002-planned-resources)

---

## 1. Resource Summary Matrix

| # | FHIR Resource | Direction | Count of Profiles | Conformance | US Core Base | Notes |
|---|---------------|-----------|-------------------|-------------|-------------|-------|
| 1 | Patient | Inbound + Outbound | 1 | SHALL | US Core Patient | Member demographics; primary identity anchor |
| 2 | Encounter | Inbound + Outbound | 1 | SHALL | US Core Encounter | In-home clinical visit; class=HH |
| 3 | Observation (Vital Signs) | Outbound | 8 sub-profiles | SHALL | US Core Vital Signs | BP, HR, RR, Temp, SpO2, Weight, Height, BMI |
| 4 | Observation (Laboratory) | Outbound | 1 | SHALL | US Core Laboratory Result | Lab results with LOINC codes and referenceRange |
| 5 | Observation (Survey - Assessment) | Outbound | 1 | SHOULD | US Core Survey | PHQ-2, PHQ-9, PRAPARE, AWV scored instruments |
| 6 | Observation (Survey - HEDIS) | Outbound | 1 | SHOULD | — | BCS, COL, CDC-A1C, CBP, FMC quality measures |
| 7 | Condition (Encounter Diagnosis) | Inbound + Outbound | 1 | SHALL | US Core Condition Encounter Diagnosis | ICD-10-CM coded visit diagnoses |
| 8 | Condition (Problem List) | Outbound | 1 | SHALL | US Core Condition Problems Health Concerns | Member-level chronic conditions |
| 9 | AllergyIntolerance | Outbound | 1 | SHALL | US Core AllergyIntolerance | Member allergy list |
| 10 | MedicationStatement (History) | Outbound | 1 | SHALL | US Core MedicationStatement | Longitudinal medication history with source provenance |
| 11 | MedicationStatement (Reconciliation) | Outbound | 1 | SHALL | — | Visit-level reconciled medications |
| 12 | Coverage | Outbound | 1 | SHOULD | — | MA / ACA insurance plan coverage |
| 13 | Appointment | Outbound | 1 | SHOULD | — | Visit scheduling with service type |
| 14 | Consent | Outbound | 1 | SHOULD | — | NOPP, voice transcription, treatment consents |
| 15 | DocumentReference | Outbound | 1 | SHOULD | US Core DocumentReference | Progress note (base64-encoded JSON attachment) |
| 16 | Task | Outbound | 1 | MAY | — | Care plan tasks with priority mapping |
| 17 | Bundle | Inbound + Outbound | 4 sub-profiles | SHALL | — | document, searchset, transaction, OperationOutcome |
| 18 | OperationOutcome | Outbound | 1 | SHALL | — | Error and processing result responses |
| 19 | Procedure | Planned (CR-002) | 1 | SHOULD | US Core Procedure | HIE-sourced procedures mapped to CPT/HCPCS |

---

## 2. Resource Profiles - Detailed Specifications

### 2.1 EasyHealth-Patient

**Base**: US Core Patient  
**Direction**: Inbound + Outbound  
**Internal Table**: `members`  
**Helper Function**: `memberToFhirPatient()`

| Element | Cardinality | Type | Fixed/Bound Value | Mapping (Internal Field) | Notes |
|---------|-------------|------|-------------------|--------------------------|-------|
| `resourceType` | 1..1 | code | "Patient" | — | |
| `id` | 1..1 | id | — | `members.id` | Internal UUID |
| `identifier[member-id]` | 1..1 | Identifier | system = `urn:easy-health:member-id` | `members.memberId` | Primary business identifier |
| `identifier[member-id].system` | 1..1 | uri | `urn:easy-health:member-id` | — | Fixed |
| `identifier[member-id].value` | 1..1 | string | — | `members.memberId` | e.g., "MEM-001" |
| `name` | 1..* | HumanName | use = "official" | — | |
| `name.family` | 1..1 | string | — | `members.lastName` | |
| `name.given` | 1..* | string | — | `[members.firstName]` | |
| `name.use` | 1..1 | code | "official" | — | Fixed |
| `birthDate` | 1..1 | date | — | `members.dob` | YYYY-MM-DD |
| `gender` | 1..1 | code | — | `members.gender` | male / female / other / unknown |
| `telecom[phone]` | 0..1 | ContactPoint | system = "phone", use = "home" | `members.phone` | |
| `telecom[email]` | 0..1 | ContactPoint | system = "email" | `members.email` | |
| `address` | 0..* | Address | use = "home" | — | |
| `address.line` | 0..* | string | — | `[members.address]` | |
| `address.city` | 0..1 | string | — | `members.city` | |
| `address.state` | 0..1 | string | — | `members.state` | |
| `address.postalCode` | 0..1 | string | — | `members.zip` | |
| `generalPractitioner` | 0..* | Reference(Practitioner) | — | `members.pcp` | Display-only reference |

**Inbound Extensions** (used during Bundle import only):

| Extension URL | Type | Mapping | Notes |
|---------------|------|---------|-------|
| `urn:easy-health:conditions` | complex (sub-extensions with valueString) | `members.conditions[]` | Array of condition strings |
| `urn:easy-health:medications` | complex (sub-extensions with valueString) | `members.medications[]` | Array of medication strings |
| `urn:easy-health:allergies` | complex (sub-extensions with valueString) | `members.allergies[]` | Array of allergy strings |
| `urn:easy-health:risk-flags` | complex (sub-extensions with valueString) | `members.riskFlags[]` | Array of risk flag strings |
| `urn:easy-health:insurance-plan` | valueString | `members.insurancePlan` | Insurance plan identifier |
| `urn:easy-health:vitals-history` | complex (sub-extensions with valueString containing JSON) | `vitals_history` | JSON-encoded vitals records |
| `urn:easy-health:lab-results` | complex (sub-extensions with valueString containing JSON) | `lab_results` | JSON-encoded lab results |
| `urn:easy-health:medication-history` | complex (sub-extensions with valueString containing JSON) | `medication_history` | JSON-encoded medication records |

---

### 2.2 EasyHealth-Encounter

**Base**: US Core Encounter  
**Direction**: Inbound + Outbound  
**Internal Table**: `visits`  
**Helper Function**: `visitToFhirEncounter()`

| Element | Cardinality | Type | Fixed/Bound Value | Mapping (Internal Field) | Notes |
|---------|-------------|------|-------------------|--------------------------|-------|
| `resourceType` | 1..1 | code | "Encounter" | — | |
| `id` | 1..1 | id | — | `visits.id` | |
| `status` | 1..1 | code | — | Mapped from `visits.status` | See status mapping below |
| `class` | 1..1 | Coding | system = `http://terminology.hl7.org/CodeSystem/v3-ActCode`, code = "HH" | — | Fixed: home health |
| `class.display` | 1..1 | string | "home health" | — | Fixed |
| `type` | 1..* | CodeableConcept | system = `urn:easy-health:visit-type` | `visits.visitType` | |
| `subject` | 1..1 | Reference(Patient) | — | `Patient/${visits.memberId}` | |
| `period.start` | 1..1 | dateTime | — | `visits.scheduledDate` | |
| `period.end` | 0..1 | dateTime | — | `visits.finalizedAt` | Only when finalized |
| `participant[np].individual` | 0..1 | Reference(Practitioner) | — | `Practitioner/${visits.npUserId}` | Assigned NP |

**Status Mapping**:

| Internal Status | FHIR Encounter Status |
|-----------------|----------------------|
| `scheduled` | `planned` |
| `in_progress` | `in-progress` |
| `ready_for_review` | `in-progress` |
| `finalized` | `finished` |
| `exported` | `finished` |

---

### 2.3 EasyHealth-VitalSigns-Observation

**Base**: US Core Vital Signs  
**Direction**: Outbound  
**Internal Table**: `vitals_records` (current visit) / `vitals_history` (historical)  
**Helper Functions**: `vitalsToFhirObservations()`, `vitalsHistoryToFhir()`

Each vital sign produces a separate Observation resource. Blood pressure uses the component pattern.

#### 2.3.1 Blood Pressure Panel

| Element | Cardinality | Type | Value | Notes |
|---------|-------------|------|-------|-------|
| `status` | 1..1 | code | "final" | |
| `category` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/observation-category`, code = "vital-signs" | |
| `code` | 1..1 | CodeableConcept | LOINC `85354-9` "Blood pressure panel" | |
| `encounter` | 0..1 | Reference(Encounter) | — | Present for visit vitals; absent for historical |
| `component[systolic].code` | 1..1 | CodeableConcept | LOINC `8480-6` "Systolic BP" | |
| `component[systolic].valueQuantity` | 1..1 | Quantity | unit = "mmHg", system = `http://unitsofmeasure.org`, code = "mm[Hg]" | |
| `component[diastolic].code` | 1..1 | CodeableConcept | LOINC `8462-4` "Diastolic BP" | |
| `component[diastolic].valueQuantity` | 1..1 | Quantity | unit = "mmHg", system = `http://unitsofmeasure.org`, code = "mm[Hg]" | |

#### 2.3.2 Heart Rate

| Element | Value |
|---------|-------|
| `code` | LOINC `8867-4` "Heart rate" |
| `valueQuantity` | unit = "bpm", system = `http://unitsofmeasure.org`, code = "/min" |

#### 2.3.3 Respiratory Rate

| Element | Value |
|---------|-------|
| `code` | LOINC `9279-1` "Respiratory rate" |
| `valueQuantity` | unit = "breaths/min", system = `http://unitsofmeasure.org`, code = "/min" |

#### 2.3.4 Body Temperature

| Element | Value |
|---------|-------|
| `code` | LOINC `8310-5` "Body temperature" |
| `valueQuantity` | unit = "degF", system = `http://unitsofmeasure.org`, code = "[degF]" |

#### 2.3.5 Oxygen Saturation

| Element | Value |
|---------|-------|
| `code` | LOINC `2708-6` "Oxygen saturation" |
| `valueQuantity` | unit = "%", system = `http://unitsofmeasure.org`, code = "%" |

#### 2.3.6 Body Weight

| Element | Value |
|---------|-------|
| `code` | LOINC `29463-7` "Body weight" |
| `valueQuantity` | unit = "lbs", system = `http://unitsofmeasure.org`, code = "[lb_av]" |

#### 2.3.7 Body Height

| Element | Value |
|---------|-------|
| `code` | LOINC `8302-2` "Body height" |
| `valueQuantity` | unit = "[in_i]", system = `http://unitsofmeasure.org`, code = "[in_i]" |

#### 2.3.8 BMI

| Element | Value |
|---------|-------|
| `code` | LOINC `39156-5` "BMI" |
| `valueQuantity` | unit = "kg/m2", system = `http://unitsofmeasure.org`, code = "kg/m2" |

**Historical Vitals**: Same profiles but with `meta.source` provenance (e.g., "practice", "hie") and `effectiveDateTime` instead of `encounter` reference. Source table: `vitals_history`.

---

### 2.4 EasyHealth-Laboratory-Observation

**Base**: US Core Laboratory Result Observation  
**Direction**: Outbound  
**Internal Table**: `lab_results`  
**Helper Function**: `labResultsToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `lab_results.id` |
| `meta.source` | 0..1 | uri | — | `lab_results.source` (e.g., "practice", "hie") |
| `status` | 1..1 | code | "final" | Fixed |
| `category` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/observation-category`, code = "laboratory" | Fixed |
| `code.coding` | 0..1 | Coding | system = `http://loinc.org` | `lab_results.testCode` / `lab_results.testName` |
| `code.text` | 1..1 | string | — | `lab_results.testName` |
| `subject` | 1..1 | Reference(Patient) | — | `Patient/${lab_results.memberId}` |
| `effectiveDateTime` | 1..1 | dateTime | — | `lab_results.collectedDate` |
| `issued` | 0..1 | instant | — | `lab_results.resultDate` |
| `valueQuantity.value` | 1..1 | decimal | — | `lab_results.value` |
| `valueQuantity.unit` | 1..1 | string | — | `lab_results.unit` |
| `referenceRange[0].low` | 0..1 | Quantity | — | `lab_results.referenceMin` + `.unit` |
| `referenceRange[0].high` | 0..1 | Quantity | — | `lab_results.referenceMax` + `.unit` |
| `interpretation` | 0..1 | CodeableConcept | code = "A" (abnormal), "AA" (critical), "N" (normal) | `lab_results.status` |
| `performer` | 0..* | Reference(Practitioner) | — | `lab_results.orderingProvider` (display only) |
| `note` | 0..* | Annotation | — | `lab_results.notes` |

---

### 2.5 EasyHealth-Survey-Assessment-Observation

**Base**: Observation (Survey category)  
**Direction**: Outbound  
**Internal Table**: `assessment_responses`  
**Builder**: Inline in `buildComprehensiveFhirBundle()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `status` | 1..1 | code | "final" or "preliminary" | `assessment_responses.status` ("completed" → "final") |
| `category` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/observation-category`, code = "survey" | Fixed |
| `code` | 1..1 | CodeableConcept | system = `urn:easy-health:instrument` | `assessment_responses.instrumentId` |
| `encounter` | 1..1 | Reference(Encounter) | — | `Encounter/${visitId}` |
| `subject` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `valueInteger` | 0..1 | integer | — | `assessment_responses.computedScore` |
| `interpretation` | 0..* | CodeableConcept | — | `assessment_responses.interpretation` (text) |

**Instrument Codes** (urn:easy-health:instrument):

| Code | Display | Score Range | Internal Scoring |
|------|---------|-------------|------------------|
| `phq-2` | PHQ-2 Depression Screening | 0-6 | Sum of 2 items (0-3 each) |
| `phq-9` | PHQ-9 Depression Assessment | 0-27 | Sum of 9 items (0-3 each) |
| `prapare` | PRAPARE Social Determinants | Count of risk items | Binary risk per domain |
| `awv` | Annual Wellness Visit Assessment | Multi-domain | Composite domain scoring |

---

### 2.6 EasyHealth-HEDIS-Measure-Observation

**Base**: Observation (Survey category)  
**Direction**: Outbound  
**Internal Table**: `measure_results`  
**Helper Function**: `measureResultsToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `meta.source` | 0..1 | uri | — | `measure_results.captureMethod` (e.g., "in_home_visit") |
| `status` | 1..1 | code | "final" or "preliminary" | `measure_results.status` ("complete" → "final") |
| `category` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/observation-category`, code = "survey" | Fixed |
| `code` | 1..1 | CodeableConcept | system = `urn:easy-health:hedis-measure` | `measure_results.measureId` |
| `encounter` | 1..1 | Reference(Encounter) | — | `Encounter/${visitId}` |
| `effectiveDateTime` | 0..1 | dateTime | — | `measure_results.completedAt` |
| `valueString` | 0..1 | string | — | JSON-serialized `measure_results.evidenceMetadata` |
| `note` | 0..* | Annotation | — | `measure_results.notes` |

**HEDIS Measure Codes** (urn:easy-health:hedis-measure):

| Code | Display | Clinical Criteria |
|------|---------|------------------|
| `BCS` | Breast Cancer Screening | Mammogram within 2 years, women 50-74 |
| `COL` | Colorectal Cancer Screening | FIT, colonoscopy, or other per age range |
| `CDC-A1C` | Diabetes A1C Control | HbA1c < 8.0% for diabetics |
| `CBP` | Controlling Blood Pressure | Systolic < 140 AND Diastolic < 90 |
| `FMC` | Follow-Up After Mental Health | Follow-up visit within 30 days |

---

### 2.7 EasyHealth-Encounter-Condition

**Base**: US Core Condition Encounter Diagnosis  
**Direction**: Outbound (+ Inbound for CR-002)  
**Internal Table**: `visit_codes`  
**Helper Function**: `codesToFhirConditions()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `visit_codes.id` |
| `clinicalStatus` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/condition-clinical`, code = "active" | Fixed |
| `code` | 1..1 | CodeableConcept | system = `http://hl7.org/fhir/sid/icd-10-cm` | `visit_codes.code` / `.description` |
| `subject` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `encounter` | 1..1 | Reference(Encounter) | — | `Encounter/${visitId}` |

**Filter**: Only codes where `codeType = "ICD-10"` AND `removedByNp = false`.

---

### 2.8 EasyHealth-ProblemList-Condition

**Base**: US Core Condition Problems and Health Concerns  
**Direction**: Outbound  
**Internal Table**: `members.conditions` (text array)  
**Helper Function**: `memberConditionsToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `problem-${memberId}-${index}` |
| `meta.source` | 1..1 | uri | "patient-history" | Fixed |
| `clinicalStatus` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/condition-clinical`, code = "active" | Fixed |
| `category` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/condition-category`, code = "problem-list-item" | Fixed |
| `code.text` | 1..1 | string | — | `members.conditions[i]` (free text) |
| `subject` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |

---

### 2.9 EasyHealth-AllergyIntolerance

**Base**: US Core AllergyIntolerance  
**Direction**: Outbound  
**Internal Table**: `members.allergies` (text array)  
**Helper Function**: `allergiesToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `allergy-${memberId}-${index}` |
| `clinicalStatus` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical`, code = "active" | Fixed |
| `code.text` | 1..1 | string | — | `members.allergies[i]` (free text) |
| `patient` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |

---

### 2.10 EasyHealth-MedicationHistory-MedicationStatement

**Base**: US Core MedicationStatement  
**Direction**: Outbound  
**Internal Table**: `medication_history`  
**Helper Function**: `medicationHistoryToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `medication_history.id` |
| `meta.source` | 0..1 | uri | — | `medication_history.source` (e.g., "practice", "hie", "patient_reported") |
| `status` | 1..1 | code | — | See status mapping below |
| `medicationCodeableConcept.text` | 1..1 | string | — | `medication_history.medicationName` |
| `medicationCodeableConcept.coding[0].display` | 0..1 | string | — | `medication_history.genericName` |
| `subject` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `effectivePeriod.start` | 0..1 | dateTime | — | `medication_history.startDate` |
| `effectivePeriod.end` | 0..1 | dateTime | — | `medication_history.endDate` |
| `dosage[0].text` | 0..1 | string | — | Concatenated: `dosage frequency (route)` |
| `reasonCode` | 0..* | CodeableConcept | — | `medication_history.reason` (text) |
| `informationSource` | 0..1 | Reference | — | `medication_history.prescriber` (display only) |
| `category` | 0..1 | CodeableConcept | system = `urn:easy-health:med-category` | `medication_history.category` |

**Status Mapping**:

| Internal Status | FHIR MedicationStatement Status |
|-----------------|--------------------------------|
| `active` | `active` |
| `discontinued` | `stopped` |
| (other) | `completed` |

---

### 2.11 EasyHealth-MedReconciliation-MedicationStatement

**Base**: MedicationStatement  
**Direction**: Outbound  
**Internal Table**: `med_reconciliation`  
**Helper Function**: `medReconToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `recon-${med_reconciliation.id}` |
| `meta.source` | 1..1 | uri | "visit-reconciliation" | Fixed |
| `status` | 1..1 | code | — | See status mapping below |
| `medicationCodeableConcept.text` | 1..1 | string | — | `med_reconciliation.medicationName` |
| `subject` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `context` | 1..1 | Reference(Encounter) | — | `Encounter/${visitId}` |
| `dosage[0].text` | 0..1 | string | — | Concatenated: `dosage frequency` |
| `note` | 0..* | Annotation | — | `med_reconciliation.notes` |

**Status Mapping**:

| Internal Status | FHIR MedicationStatement Status |
|-----------------|--------------------------------|
| `continued` | `active` |
| `discontinued` | `stopped` |
| `new` | `active` |
| (other) | `completed` |

---

### 2.12 EasyHealth-Coverage

**Direction**: Outbound  
**Internal Table**: `members.insurancePlan`  
**Helper Function**: `coverageToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `coverage-${memberId}` |
| `status` | 1..1 | code | "active" | Fixed |
| `type` | 1..1 | CodeableConcept | system = `urn:easy-health:plan-type` | Derived from `members.insurancePlan` prefix |
| `subscriber` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `beneficiary` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `payor` | 1..* | Reference(Organization) | — | `members.insurancePlan` (display only) |

**Plan Type Codes** (urn:easy-health:plan-type):

| Code | Display |
|------|---------|
| `MA` | Medicare Advantage |
| `ACA` | ACA |

---

### 2.13 EasyHealth-Appointment

**Direction**: Outbound  
**Internal Table**: `visits`  
**Helper Function**: `appointmentToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `appt-${visits.id}` |
| `status` | 1..1 | code | — | See status mapping below |
| `serviceType` | 1..* | CodeableConcept | system = `urn:easy-health:visit-type` | `visits.visitType` |
| `start` | 1..1 | instant | — | `${visits.scheduledDate}T${visits.scheduledTime}` |
| `participant[patient]` | 1..1 | BackboneElement | actor = `Patient/${memberId}`, status = "accepted" | |
| `participant[practitioner]` | 0..1 | BackboneElement | actor = `Practitioner/${npUserId}`, status = "accepted" | |
| `comment` | 0..1 | string | — | `visits.travelNotes` |

**Status Mapping**:

| Internal Status | FHIR Appointment Status |
|-----------------|------------------------|
| `scheduled` | `booked` |
| `in_progress` | `arrived` |
| `finalized` | `fulfilled` |

---

### 2.14 EasyHealth-Consent

**Direction**: Outbound  
**Internal Table**: `visit_consents`  
**Helper Function**: `consentsToFhir()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `id` | 1..1 | id | — | `visit_consents.id` |
| `status` | 1..1 | code | — | See status mapping below |
| `scope` | 1..1 | CodeableConcept | system = `http://terminology.hl7.org/CodeSystem/consentscope`, code = "patient-privacy" | Fixed |
| `category` | 1..1 | CodeableConcept | system = `urn:easy-health:consent-type` | `visit_consents.consentType` |
| `patient` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `dateTime` | 0..1 | dateTime | — | `visit_consents.signedAt` or `.createdAt` |
| `performer` | 0..* | Reference | — | `visit_consents.witnessName` (display only) |

**Status Mapping**:

| Internal Status | FHIR Consent Status |
|-----------------|---------------------|
| `granted` | `active` |
| `declined` | `rejected` |
| (other) | `proposed` |

**Consent Type Codes** (urn:easy-health:consent-type):

| Code | Display |
|------|---------|
| `nopp` | Notice of Privacy Practices |
| `voice_transcription` | Voice Transcription |
| `treatment` | Treatment |

---

### 2.15 EasyHealth-ProgressNote-DocumentReference

**Direction**: Outbound  
**Internal Table**: `clinical_notes`  
**Builder**: Inline in `buildComprehensiveFhirBundle()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `status` | 1..1 | code | "current" | Fixed |
| `type` | 1..1 | CodeableConcept | system = `http://loinc.org`, code = "11506-3", display = "Progress note" | Fixed |
| `subject` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `content[0].attachment.contentType` | 1..1 | code | "application/json" | Fixed |
| `content[0].attachment.data` | 1..1 | base64Binary | — | Base64-encoded JSON of `clinical_notes.content` |

---

### 2.16 EasyHealth-CareTask

**Direction**: Outbound  
**Internal Table**: `care_plan_tasks`  
**Builder**: Inline in `buildComprehensiveFhirBundle()`

| Element | Cardinality | Type | Value | Mapping |
|---------|-------------|------|-------|---------|
| `status` | 1..1 | code | — | `care_plan_tasks.status` |
| `priority` | 0..1 | code | — | See priority mapping below |
| `description` | 1..1 | string | — | `care_plan_tasks.description` |
| `for` | 1..1 | Reference(Patient) | — | `Patient/${memberId}` |
| `encounter` | 1..1 | Reference(Encounter) | — | `Encounter/${visitId}` |

**Priority Mapping**:

| Internal Priority | FHIR Task Priority |
|-------------------|-------------------|
| `urgent` | `urgent` |
| `high` | `asap` |
| `normal` / (default) | `routine` |

---

### 2.17 EasyHealth-OperationOutcome

**Direction**: Outbound (all FHIR endpoints)  
**Used For**: Error responses and processing results

| Element | Cardinality | Notes |
|---------|-------------|-------|
| `issue[].severity` | 1..1 | `error`, `warning`, `information` |
| `issue[].code` | 1..1 | `invalid`, `required`, `exception`, `informational`, `processing` |
| `issue[].diagnostics` | 0..1 | Human-readable error message |

---

## 3. Custom Extensions

All Easy Health custom extensions use the `urn:easy-health:` namespace. These are used during inbound Bundle import (POST /api/fhir/Bundle) to carry data that does not have a standard FHIR element mapping.

| Extension URL | Context | Cardinality | Type | Description |
|---------------|---------|-------------|------|-------------|
| `urn:easy-health:conditions` | Patient | 0..1 | complex | Sub-extensions with `valueString` for each chronic condition |
| `urn:easy-health:medications` | Patient | 0..1 | complex | Sub-extensions with `valueString` for each known medication |
| `urn:easy-health:allergies` | Patient | 0..1 | complex | Sub-extensions with `valueString` for each allergy |
| `urn:easy-health:risk-flags` | Patient | 0..1 | complex | Sub-extensions with `valueString` for each risk flag |
| `urn:easy-health:insurance-plan` | Patient | 0..1 | valueString | Insurance plan identifier (e.g., "MA-BlueCross") |
| `urn:easy-health:vitals-history` | Patient | 0..1 | complex | Sub-extensions with `valueString` containing JSON-encoded vitals |
| `urn:easy-health:lab-results` | Patient | 0..1 | complex | Sub-extensions with `valueString` containing JSON-encoded labs |
| `urn:easy-health:medication-history` | Patient | 0..1 | complex | Sub-extensions with `valueString` containing JSON-encoded medications |

---

## 4. Code Systems

### 4.1 Standard Code Systems Referenced

| Code System | URI | Used For |
|-------------|-----|----------|
| LOINC | `http://loinc.org` | Vital signs, lab results, document types |
| ICD-10-CM | `http://hl7.org/fhir/sid/icd-10-cm` | Diagnosis codes |
| UCUM | `http://unitsofmeasure.org` | Quantity units |
| ActCode (HL7 v3) | `http://terminology.hl7.org/CodeSystem/v3-ActCode` | Encounter class |
| Observation Category | `http://terminology.hl7.org/CodeSystem/observation-category` | vital-signs, laboratory, survey |
| Condition Clinical | `http://terminology.hl7.org/CodeSystem/condition-clinical` | active |
| Condition Category | `http://terminology.hl7.org/CodeSystem/condition-category` | problem-list-item |
| AllergyIntolerance Clinical | `http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical` | active |
| Consent Scope | `http://terminology.hl7.org/CodeSystem/consentscope` | patient-privacy |

### 4.2 Easy Health Custom Code Systems

| Code System | URI | Used For | Codes |
|-------------|-----|----------|-------|
| Member Identifier | `urn:easy-health:member-id` | Patient.identifier | Dynamic member IDs (e.g., "MEM-001") |
| Visit Type | `urn:easy-health:visit-type` | Encounter.type, Appointment.serviceType | `annual_wellness`, `follow_up` |
| Plan Type | `urn:easy-health:plan-type` | Coverage.type | `MA`, `ACA` |
| Instrument | `urn:easy-health:instrument` | Observation.code (assessment) | `phq-2`, `phq-9`, `prapare`, `awv` |
| HEDIS Measure | `urn:easy-health:hedis-measure` | Observation.code (quality measure) | `BCS`, `COL`, `CDC-A1C`, `CBP`, `FMC` |
| Consent Type | `urn:easy-health:consent-type` | Consent.category | `nopp`, `voice_transcription`, `treatment` |
| Medication Category | `urn:easy-health:med-category` | MedicationStatement.category | Dynamic category values |

---

## 5. Value Sets

### 5.1 EasyHealth-VitalSigns-ValueSet

Bound to Observation.code for vital sign resources.

| LOINC Code | Display | UCUM Unit | UCUM Code |
|------------|---------|-----------|-----------|
| 85354-9 | Blood pressure panel | — (component) | — |
| 8480-6 | Systolic blood pressure | mmHg | mm[Hg] |
| 8462-4 | Diastolic blood pressure | mmHg | mm[Hg] |
| 8867-4 | Heart rate | bpm | /min |
| 9279-1 | Respiratory rate | breaths/min | /min |
| 8310-5 | Body temperature | degF | [degF] |
| 2708-6 | Oxygen saturation | % | % |
| 29463-7 | Body weight | lbs | [lb_av] |
| 8302-2 | Body height | [in_i] | [in_i] |
| 39156-5 | Body mass index | kg/m2 | kg/m2 |

### 5.2 EasyHealth-VisitType-ValueSet

Bound to Encounter.type and Appointment.serviceType.

| Code | Display |
|------|---------|
| `annual_wellness` | Annual Wellness Visit |
| `follow_up` | Follow Up Visit |

### 5.3 EasyHealth-PlanType-ValueSet

Bound to Coverage.type.

| Code | Display |
|------|---------|
| `MA` | Medicare Advantage |
| `ACA` | ACA (Affordable Care Act) |

### 5.4 EasyHealth-Instrument-ValueSet

Bound to Observation.code for assessment results.

| Code | Display |
|------|---------|
| `phq-2` | PHQ-2 Depression Screening |
| `phq-9` | PHQ-9 Depression Assessment |
| `prapare` | PRAPARE Social Determinants Screening |
| `awv` | Annual Wellness Visit Assessment |

### 5.5 EasyHealth-HEDISMeasure-ValueSet

Bound to Observation.code for HEDIS quality measures.

| Code | Display |
|------|---------|
| `BCS` | Breast Cancer Screening |
| `COL` | Colorectal Cancer Screening |
| `CDC-A1C` | Comprehensive Diabetes Care - A1C |
| `CBP` | Controlling Blood Pressure |
| `FMC` | Follow-Up After Mental Health |

### 5.6 EasyHealth-ConsentType-ValueSet

Bound to Consent.category.

| Code | Display |
|------|---------|
| `nopp` | Notice of Privacy Practices |
| `voice_transcription` | Voice Transcription Permission |
| `treatment` | Treatment Consent |

### 5.7 EasyHealth-LabInterpretation-ValueSet

Bound to Observation.interpretation for laboratory results.

| Code | Display | Meaning |
|------|---------|---------|
| `N` | normal | Result within reference range |
| `A` | abnormal | Result outside reference range |
| `AA` | critical | Critically abnormal result |

---

## 6. Operations & Interactions

### 6.1 Outbound (Read) Endpoints

| Endpoint | Method | Interaction | Returns | Notes |
|----------|--------|-------------|---------|-------|
| `/api/fhir/Patient/:id` | GET | read | EasyHealth-Patient | Single patient by internal ID |
| `/api/fhir/Patient` | GET | search-type | Bundle (searchset of EasyHealth-Patient) | All patients |
| `/api/fhir/Encounter/:id` | GET | read | EasyHealth-Encounter | Single encounter by visit ID |
| `/api/fhir/Observation?encounter=:id` | GET | search-type | Bundle (searchset of EasyHealth-VitalSigns-Observation) | Up to 8 vitals observations for a visit |
| `/api/fhir/Condition?encounter=:id` | GET | search-type | Bundle (searchset of EasyHealth-Encounter-Condition) | ICD-10 coded diagnoses for a visit |
| `/api/fhir/Bundle?visit=:id` | GET | search-type | EasyHealth-Comprehensive-Bundle | Full visit export: 11 resource types, 80+ entries |

### 6.2 Inbound (Write) Endpoints

| Endpoint | Method | Interaction | Accepts | Creates/Updates | Notes |
|----------|--------|-------------|---------|-----------------|-------|
| `/api/fhir/Patient` | POST | create / update | EasyHealth-Patient | `members` | Upsert by `urn:easy-health:member-id` identifier |
| `/api/fhir/Bundle` | POST | transaction | Bundle (Patient + Encounter) | `members`, `visits`, `required_checklists`, `vitals_history`, `lab_results`, `medication_history` | Processes Patient with extensions, creates Encounter with plan pack checklist |

### 6.3 Demo / Utility Endpoints

| Endpoint | Method | Returns | Notes |
|----------|--------|---------|-------|
| `/api/fhir/demo-bundle` | GET | Static demo Bundle | 5 patients with conditions, allergies, medications from JSON file |
| `/api/demo/sample-import-bundle` | GET | Same static demo Bundle | Alternate route |
| `/api/demo/fhir-bundles` | GET | Array of document Bundles | All members with visits, vitals, conditions |
| `/api/demo/fhir-bundle/:memberId` | GET | Single document Bundle | Per-member export |

---

## 7. Bundle Profiles

### 7.1 EasyHealth-Comprehensive-Bundle (Document)

**Endpoint**: GET `/api/fhir/Bundle?visit=:id`  
**Type**: `document`  
**Builder**: `buildComprehensiveFhirBundle()`

**Entry composition** (order of appearance):

| # | Resource Type | Profile | Source | Cardinality in Bundle |
|---|---------------|---------|--------|----------------------|
| 1 | Patient | EasyHealth-Patient | `members` | 1 |
| 2 | Encounter | EasyHealth-Encounter | `visits` | 1 |
| 3 | Appointment | EasyHealth-Appointment | `visits` | 1 |
| 4 | Coverage | EasyHealth-Coverage | `members.insurancePlan` | 0..1 |
| 5 | Condition | EasyHealth-ProblemList-Condition | `members.conditions` | 0..* |
| 6 | AllergyIntolerance | EasyHealth-AllergyIntolerance | `members.allergies` | 0..* |
| 7 | Observation (Vital Signs) | EasyHealth-VitalSigns-Observation | `vitals_records` | 0..8 |
| 8 | Observation (Historical Vitals) | EasyHealth-VitalSigns-Observation | `vitals_history` | 0..* |
| 9 | Observation (Laboratory) | EasyHealth-Laboratory-Observation | `lab_results` | 0..* |
| 10 | MedicationStatement (History) | EasyHealth-MedicationHistory | `medication_history` | 0..* |
| 11 | MedicationStatement (Reconciliation) | EasyHealth-MedReconciliation | `med_reconciliation` | 0..* |
| 12 | Condition (Encounter Dx) | EasyHealth-Encounter-Condition | `visit_codes` | 0..* |
| 13 | Observation (Assessment) | EasyHealth-Survey-Assessment | `assessment_responses` | 0..* |
| 14 | Observation (HEDIS Measure) | EasyHealth-HEDIS-Measure | `measure_results` | 0..* |
| 15 | Consent | EasyHealth-Consent | `visit_consents` | 0..* |
| 16 | DocumentReference | EasyHealth-ProgressNote | `clinical_notes` | 0..1 |
| 17 | Task | EasyHealth-CareTask | `care_plan_tasks` | 0..* |

**Typical Bundle Size**: 80+ entries for a complete visit with vitals history, lab results, and medication history.

### 7.2 EasyHealth-Import-Bundle (Transaction)

**Endpoint**: POST `/api/fhir/Bundle`  
**Type**: `transaction` (processed sequentially)

**Supported Entry Resources**:

| Resource Type | Processing | Notes |
|---------------|------------|-------|
| Patient | Upsert by `urn:easy-health:member-id` | Extensions processed for conditions, medications, allergies, risk flags, insurance, vitals history, labs, med history |
| Encounter | Create new visit | Links to Patient from bundle or by subject reference; auto-assigns NP; populates checklist from plan pack |
| (other) | Skipped | Logged as "unsupported resource type" in results |

### 7.3 EasyHealth-Searchset-Bundle

**Used by**: GET endpoints that return multiple resources  
**Type**: `searchset`

| Endpoint | Entry Resource |
|----------|---------------|
| `/api/fhir/Patient` | EasyHealth-Patient |
| `/api/fhir/Observation?encounter=:id` | EasyHealth-VitalSigns-Observation |
| `/api/fhir/Condition?encounter=:id` | EasyHealth-Encounter-Condition |

---

## 8. Capability Statement Summary

### Supported Resource Types and Interactions

| Resource | read | search-type | create | update | Profiles |
|----------|------|-------------|--------|--------|----------|
| Patient | Y | Y | Y (via POST) | Y (via POST upsert) | EasyHealth-Patient |
| Encounter | Y | — | Y (via Bundle) | — | EasyHealth-Encounter |
| Observation | — | Y (by encounter) | — | — | VitalSigns, Laboratory, Survey-Assessment, HEDIS-Measure |
| Condition | — | Y (by encounter) | — | — | Encounter-Condition, ProblemList-Condition |
| AllergyIntolerance | — | — | — | — | EasyHealth-AllergyIntolerance (bundle only) |
| MedicationStatement | — | — | — | — | MedicationHistory, MedReconciliation (bundle only) |
| Coverage | — | — | — | — | EasyHealth-Coverage (bundle only) |
| Appointment | — | — | — | — | EasyHealth-Appointment (bundle only) |
| Consent | — | — | — | — | EasyHealth-Consent (bundle only) |
| DocumentReference | — | — | — | — | EasyHealth-ProgressNote (bundle only) |
| Task | — | — | — | — | EasyHealth-CareTask (bundle only) |
| Bundle | — | Y (by visit) | Y (transaction) | — | Comprehensive, Import, Searchset |

### Search Parameters

| Resource | Parameter | Type | Target |
|----------|-----------|------|--------|
| Observation | encounter | reference | Encounter |
| Condition | encounter | reference | Encounter |
| Bundle | visit | string | Visit ID (custom) |
| Patient | (none) | — | Returns all |

---

## 9. Data Mapping - Internal to FHIR

### 9.1 Source Provenance Tracking (`meta.source`)

| meta.source Value | Meaning | Used On |
|-------------------|---------|---------|
| `practice` | Data from clinical practice / EHR | MedicationHistory, LabResults, VitalsHistory |
| `patient-history` | Member-level historical data | ProblemList-Condition |
| `visit-reconciliation` | Reconciled during in-home visit | MedReconciliation-MedicationStatement |
| `in_home_visit` | Captured during visit | HEDIS-Measure-Observation |
| `hie` | Health Information Exchange (CR-002) | All HIE-sourced resources |
| `patient_reported` | Patient-reported data | MedicationHistory |

### 9.2 fullUrl Format

All Bundle entries use `urn:uuid:` URN format:
- Patient: `urn:uuid:${member.id}`
- Encounter: `urn:uuid:${visit.id}`
- Observation: `urn:uuid:${record.id}-{suffix}` (suffix: bp, hr, rr, temp, spo2, wt, ht, bmi)
- Condition: `urn:uuid:${code.id}` or `urn:uuid:problem-${memberId}-${index}`
- AllergyIntolerance: `urn:uuid:allergy-${memberId}-${index}`
- Coverage: `urn:uuid:coverage-${memberId}`
- Appointment: `urn:uuid:appt-${visitId}`
- MedicationStatement (recon): `urn:uuid:recon-${medRecon.id}`
- Measure Observation: `urn:uuid:measure-${measureResult.id}`

### 9.3 Reference Resolution

All references use the relative reference format:
- `Patient/${id}` — references member by internal ID
- `Encounter/${id}` — references visit by internal ID
- `Practitioner/${id}` — references user by internal ID (NP)

---

## 10. CR-002 Planned Resources

### 10.1 New Inbound Endpoint

**Endpoint**: POST `/api/fhir/PrevisitContext`  
**Purpose**: Accept FHIR Bundle from HIE containing pre-visit clinical context  
**New Table**: `hie_ingestion_log` (tracks bundleId for idempotency)  
**New Table**: `suspected_conditions` (NP confirm/dismiss workflow)

### 10.2 New Inbound Resource Handling

| Resource Type | Routing Logic | Target Table | Source Tag | Dedup Strategy |
|---------------|--------------|--------------|------------|----------------|
| MedicationStatement | Always | `med_reconciliation` (status=pending) + `medication_history` | `hie` | `medicationName` + `dosage` per visit |
| Condition | If ICD-10 not already on encounter | `suspected_conditions` | `hie` | `icdCode` + `visitId` |
| Observation (category=laboratory) | `category.coding` = `laboratory` | `lab_results` | `hie` | `testCode` + `collectedDate` |
| Observation (category=vital-signs) | `category.coding` = `vital-signs` | `vitals_history` | `hie` | `vitalType` + `measureDate` |
| Procedure | CPT/HCPCS mapping | `visit_codes` (verified=false) | `hie` | `code` + `visitId` |

### 10.3 New Workflows

| Workflow | Resources | Description |
|----------|-----------|-------------|
| Suspected Condition Confirm | Condition → visit_codes | NP reviews HIE-suspected condition; confirm adds to encounter diagnoses |
| Suspected Condition Dismiss | Condition → suspected_conditions | NP dismisses with reason; excluded from coding |
| Med Reconciliation Pre-Population | MedicationStatement → med_reconciliation | HIE meds appear as pending items in existing med recon UI |
| Visit Lock Safeguard | All | Rejects ingestion with 409 if `visit.lockedAt` is set |
| Partial Failure Handling | All | Processes all resources; collects per-resource errors; overall status = completed/partial/failed |

---

## Appendix A: LOINC Codes Used

| LOINC Code | Display Name | Context |
|------------|-------------|---------|
| 85354-9 | Blood pressure panel with all children optional | Vital Signs - BP |
| 8480-6 | Systolic blood pressure | BP Component |
| 8462-4 | Diastolic blood pressure | BP Component |
| 8867-4 | Heart rate | Vital Signs |
| 9279-1 | Respiratory rate | Vital Signs |
| 8310-5 | Body temperature | Vital Signs |
| 2708-6 | Oxygen saturation in Arterial blood | Vital Signs |
| 29463-7 | Body weight | Vital Signs |
| 8302-2 | Body height | Vital Signs |
| 39156-5 | Body mass index (BMI) | Vital Signs (calculated) |
| 11506-3 | Progress note | DocumentReference.type |

## Appendix B: HL7 Terminology Code Systems Used

| Code System | URI | Codes Used |
|-------------|-----|------------|
| ActCode (v3) | `http://terminology.hl7.org/CodeSystem/v3-ActCode` | `HH` (home health) |
| Observation Category | `http://terminology.hl7.org/CodeSystem/observation-category` | `vital-signs`, `laboratory`, `survey` |
| Condition Clinical Status | `http://terminology.hl7.org/CodeSystem/condition-clinical` | `active` |
| Condition Category | `http://terminology.hl7.org/CodeSystem/condition-category` | `problem-list-item` |
| AllergyIntolerance Clinical | `http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical` | `active` |
| Consent Scope | `http://terminology.hl7.org/CodeSystem/consentscope` | `patient-privacy` |

## Appendix C: UCUM Units Used

| UCUM Code | Display | Used For |
|-----------|---------|----------|
| mm[Hg] | mmHg | Blood pressure |
| /min | per minute | Heart rate, Respiratory rate |
| [degF] | degrees Fahrenheit | Body temperature |
| % | percent | Oxygen saturation |
| [lb_av] | pounds | Body weight |
| [in_i] | inches | Body height |
| kg/m2 | kg/m2 | BMI |

## Appendix D: Demo FHIR Bundle Content

**File**: `server/data/demo-fhir-bundle.json`  
**Served at**: GET `/api/fhir/demo-bundle` and GET `/api/demo/sample-import-bundle`

| Content | Count | Notes |
|---------|-------|-------|
| Patient resources | 5 | Each with extensions for conditions, medications, allergies, risk flags, insurance, vitals history, lab results, medication history |
| Encounter resources | 5 | One per patient, type = annual_wellness |
| Condition resources | ~20-25 | 4-5 per patient |
| AllergyIntolerance resources | ~5-10 | 1-2 per patient |
| MedicationStatement resources | ~20-30 | 4-6 per patient |
| Total entries | ~55-75 | Full import via POST /api/fhir/Bundle |
