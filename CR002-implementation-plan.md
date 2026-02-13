# CR-002: HIE-Driven Pre-Visit Intelligence Ingestion Module

## Implementation Plan

**System:** Easy Health Point of Care Application
**Requestor:** Jay Baker
**Date:** February 13, 2026
**Status:** In Progress - Phase 1 Complete

---

## 1. Design Review & Reusability Analysis

### 1.1 Existing Assets That Will Be Reused (Not Duplicated)

| Existing Asset | Location | How It Will Be Reused |
|---|---|---|
| `DATA_SOURCES = ["practice", "hie"]` | `shared/schema.ts:464` | Already defines "hie" as a valid source. All source fields already accept this value. No schema change needed. |
| `source` field on `med_reconciliation` | `shared/schema.ts:489` | Will receive `source = "hie"` for HIE-originated medications. Existing field, no duplication. |
| `source` field on `medication_history` | `shared/schema.ts:429` | Will receive `source = "hie"` for HIE medication history records. Existing field. |
| `source` field on `lab_results` | `shared/schema.ts:403` | Will receive `source = "hie"` for HIE lab observations. Existing field. |
| `source` field on `vitals_history` | `shared/schema.ts:454` | Will receive `source = "hie"` for HIE vitals observations. Existing field. |
| `source` field on `visit_codes` | `shared/schema.ts:380` | Will receive `source = "hie"` for HIE-derived diagnosis codes. Existing field. |
| `POST /api/fhir/Bundle` endpoint | `server/routes.ts:3090` | Pattern will be followed for the new PrevisitContext endpoint. Existing Bundle handler stays unchanged. |
| FHIR helper functions (`memberToFhirPatient`, `visitToFhirEncounter`, etc.) | `server/routes.ts:2502+` | Reused for FHIR response formatting. |
| Medication reconciliation CRUD | `server/storage.ts:637-653` | `createMedReconciliation()` will be called to pre-populate meds from HIE. No new CRUD needed. |
| Completeness engine | `server/routes.ts:857-982` | Will be extended (not duplicated) with a new `componentType` case for pre-visit data. |
| Visit overview endpoint | `server/routes.ts:178-300` | Will be extended to include HIE ingestion data and suspected conditions in the response payload. |
| Adjudication summary endpoint | `server/routes.ts:1778+` | Will be extended to include HIE verification indicators. |
| Alerts system on intake dashboard | `client/src/pages/intake-dashboard.tsx:989+` | HIE-derived alerts will use the existing alerts pipeline. |
| CDS/Recommendations panel | `client/src/pages/intake-dashboard.tsx:1059+` | Suspected conditions will surface through the existing recommendations system. |
| Audit event logging | `server/storage.ts` + `shared/schema.ts:275` | `createAuditEvent()` will log HIE ingestion events. No new audit system. |
| `createMedicationHistory()` | `server/storage.ts:150` | Will be called to persist HIE medications in member history. |
| `createLabResult()` | `server/storage.ts` | Will be called to persist HIE lab observations. |

### 1.2 New Components Required (Cannot Be Achieved With Existing Code)

| New Component | Justification |
|---|---|
| `hie_ingestion_log` table | No existing table tracks ingestion events with bundle metadata, resource counts, and processing status. |
| `suspected_conditions` table | No existing table for conditions that are suspected but not yet confirmed by the NP. Visit codes require confirmed diagnoses. |
| `POST /api/fhir/PrevisitContext` endpoint | Existing `/api/fhir/Bundle` handles Patient + Encounter creation. PrevisitContext is semantically different: it enriches an *existing* scheduled encounter with clinical intelligence. Separate endpoint avoids overloading Bundle semantics. |
| NP Guidance Panel (UI component) | No existing panel aggregates pre-visit intelligence into actionable NP guidance. The alerts panel shows real-time alerts, not pre-visit summaries. |
| `GET /api/visits/:id/previsit-summary` endpoint | No existing endpoint generates an aggregated pre-visit intelligence summary. |
| FHIR resource processors for MedicationStatement, Condition, Observation, Procedure | Existing Bundle handler only processes Patient and Encounter resource types. |

### 1.3 Design Principles

1. **No New CRUD Patterns** - All new data flows through existing `storage.ts` interface methods. New methods only added for genuinely new tables.
2. **Source Field Convention** - All HIE-originated records use `source = "hie"`. No new field names or enum values needed.
3. **Existing UI Patterns** - NP Guidance Panel follows the same Card/CardHeader/CardContent pattern used by CDS Alerts, Visit Alerts, and Objectives panels.
4. **Existing FHIR Patterns** - New endpoint follows the same error handling, OperationOutcome response, and audit logging patterns as existing FHIR endpoints.
5. **No Duplicate Medication Workflow** - HIE medications flow into the *same* `med_reconciliation` table with `status = "pending"` and `source = "hie"`, then the NP uses the *existing* reconciliation UI to verify/modify/discontinue.
6. **Completeness Engine Extension** - New rule type added to existing switch/case, not a parallel engine.

---

## 2. Data Model Changes

### 2.1 New Table: `hie_ingestion_log`

```
Purpose: Track each HIE data ingestion event for audit, debugging, and dashboard display.

Columns:
  id              varchar PK (gen_random_uuid)
  visitId         varchar NOT NULL (FK to visits)
  memberId        varchar NOT NULL (FK to members)
  bundleId        varchar (external bundle identifier from Easy Health)
  sourceSystem    text NOT NULL default "EH" (Easy Health)
  resourceCount   integer NOT NULL default 0
  resourceSummary jsonb (breakdown: { MedicationStatement: 3, Condition: 5, ... })
  status          text NOT NULL default "processing" (processing | completed | partial | failed)
  errorDetails    text[]
  receivedAt      text NOT NULL (ISO timestamp)
  processedAt     text (ISO timestamp)
  processedBy     text default "system"
```

### 2.2 New Table: `suspected_conditions`

```
Purpose: Store conditions found in HIE data but not present in the encounter's
active problem list. NP reviews and either confirms (promoting to visit_codes)
or dismisses.

Columns:
  id              varchar PK (gen_random_uuid)
  visitId         varchar NOT NULL (FK to visits)
  memberId        varchar NOT NULL (FK to members)
  icdCode         text NOT NULL
  description     text NOT NULL
  hieSource       text default "EH"
  confidence      text default "suspected" (suspected | probable | confirmed)
  status          text NOT NULL default "pending" (pending | confirmed | dismissed)
  reviewedBy      varchar
  reviewedByName  text
  reviewedAt      text
  dismissalReason text
  linkedCodeId    varchar (FK to visit_codes.id when confirmed)
  ingestionLogId  varchar (FK to hie_ingestion_log.id)
  createdAt       text

  UNIQUE CONSTRAINT: (visitId, icdCode) - prevents duplicate suspected conditions per visit
```

### 2.3 Existing Tables - No Schema Changes Required

The following tables already have `source` fields that accept "hie":
- `med_reconciliation.source` - will receive "hie"
- `medication_history.source` - will receive "hie"
- `lab_results.source` - will receive "hie"
- `vitals_history.source` - will receive "hie"
- `visit_codes.source` - will receive "hie"

---

## 3. Implementation Tasks

### Phase 1: Schema & Storage Layer

- [x] Design review completed (this document)
- [x] **T1.1** Add `hie_ingestion_log` table to `shared/schema.ts` with insert schema and types *(completed 2026-02-13)*
- [x] **T1.2** Add `suspected_conditions` table to `shared/schema.ts` with insert schema and types *(completed 2026-02-13)*
- [x] **T1.3** Run `npm run db:push` to sync new tables to database *(completed 2026-02-13 - both tables verified in PostgreSQL)*
- [x] **T1.4** Add `IStorage` interface methods for new tables *(completed 2026-02-13)*
  - `createHieIngestionLog(log)` / `getHieIngestionLogsByVisit(visitId)` / `getHieIngestionLogByBundleId(visitId, bundleId)` / `updateHieIngestionLog(id, updates)`
  - `createSuspectedCondition(cond)` / `getSuspectedConditionsByVisit(visitId)` / `getSuspectedCondition(id)` / `getSuspectedConditionByVisitAndCode(visitId, icdCode)` / `updateSuspectedCondition(id, updates)`
- [x] **T1.5** Implement `DatabaseStorage` methods for new tables *(completed 2026-02-13)*

### Phase 2: FHIR Ingestion API (CR-002-01)

- [ ] **T2.1** Create `POST /api/fhir/PrevisitContext` endpoint in `server/routes.ts`
  - Accept FHIR Bundle with `scheduledEncounterId` parameter
  - Validate: visit exists, visit is in `scheduled` status, visit is NOT locked (`lockedAt` is null)
  - Idempotency: if `bundleId` already exists in `hie_ingestion_log` for this visit, return existing result (skip re-processing)
  - Create `hie_ingestion_log` record with status `processing`
  - Process each resource by type (see T2.2-T2.5); collect per-resource errors
  - Update ingestion log to `completed` (all succeed), `partial` (some fail), or `failed` (all fail)
  - Return OperationOutcome with processing results
  - Log audit event via existing `createAuditEvent()`
- [ ] **T2.2** Implement `MedicationStatement` resource processor
  - Map FHIR MedicationStatement fields to `med_reconciliation` insert
  - Set `source = "hie"`, `status = "pending"` (unverified)
  - Set `memberId` and `visitId` from context
  - Also create `medication_history` record with `source = "hie"`
  - Skip duplicates (match on medicationName + dosage)
- [ ] **T2.3** Implement `Condition` resource processor
  - Extract ICD code from `Condition.code.coding`
  - Check if condition already exists in member's known conditions or visit codes
  - If new: create `suspected_condition` record with `status = "pending"`
  - If existing: skip (no duplicate)
  - Link to `ingestionLogId`
- [ ] **T2.4** Implement `Observation` resource processor
  - Route by FHIR `Observation.category` coding:
    - `category.coding[].code === "vital-signs"` → `vitals_history` table
    - `category.coding[].code === "laboratory"` → `lab_results` table
    - Fallback (no category or unknown) → `lab_results` table
  - Map FHIR Observation to `lab_results` or `vitals_history` accordingly
  - Dedup: skip if matching `testCode + collectedDate + memberId` (labs) or `measureDate + memberId` (vitals) already exists with `source = "hie"`
  - Set `source = "hie"` on all records
- [ ] **T2.5** Implement `Procedure` resource processor
  - Map to `visit_codes` with `codeType = "cpt"` or `"hcpcs"`, `source = "hie"`, `verified = false`
  - These feed into HEDIS measure evaluation

### Phase 3: Provenance Tagging (CR-002-04)

- [ ] **T3.1** Ensure all resource processors from Phase 2 set provenance fields:
  - `source = "hie"` on all created records
  - `ingestionLogId` linkage where applicable
  - Timestamp via `receivedAt` on ingestion log
- [ ] **T3.2** Update Patient Clinical Timeline UI to display origin badges
  - Show "HIE" badge on timeline entries where `source = "hie"`
  - Use existing timeline rendering, add conditional badge
- [ ] **T3.3** Update Medication Reconciliation UI to show HIE origin indicator
  - Show "HIE - Unverified" badge on med recon items where `source = "hie"` and `status = "pending"`
  - Use existing med recon list rendering, add conditional badge

### Phase 4: Medication Reconciliation Pre-Population (CR-002-02)

- [ ] **T4.1** Verify med recon pre-population works end-to-end
  - HIE MedicationStatements → `med_reconciliation` with `source = "hie"`, `status = "pending"`
  - Existing med recon UI already displays all records by visit
  - NP uses existing verify/modify/discontinue actions
  - No new UI workflow needed - just provenance badges (T3.3)
- [ ] **T4.2** Add "Pre-populated from HIE" summary count to med recon header
  - Show count of `source = "hie"` items pending verification
  - Use existing CardHeader pattern

### Phase 5: HIE-Derived Condition Suspecting (CR-002-03)

- [ ] **T5.1** Create `GET /api/visits/:id/suspected-conditions` endpoint
  - Return suspected conditions for the visit
  - Include linked ingestion log metadata
- [ ] **T5.2** Create `PATCH /api/visits/:id/suspected-conditions/:condId` endpoint
  - Allow NP to confirm (creates visit_code entry) or dismiss (with reason)
  - When confirmed: create `visit_code` via existing `createVisitCode()` with `source = "hie"`, `verified = true`
  - Update suspected condition status and link to created code
- [ ] **T5.3** Add suspected conditions to visit overview response
  - Extend `/api/visits/:id/overview` to include `suspectedConditions` array
  - No new endpoint needed for dashboard consumption

### Phase 6: Pre-Visit NP Guidance Panel (CR-002-05)

- [ ] **T6.1** Create `GET /api/visits/:id/previsit-summary` endpoint
  - Aggregate: suspected conditions count, pending med recon count, care gaps from measure definitions, HIE observations summary
  - Generate `EncounterGuidanceSummary` object with prioritized action items
  - Return structured guidance for the NP
- [ ] **T6.2** Build NP Guidance Panel UI component on Intake Dashboard
  - Position: Top of right panel (above Visit Alerts)
  - Only visible when HIE data has been ingested for this visit
  - Sections:
    - **Suspected Diagnoses** - List with confirm/dismiss actions
    - **Medication Review** - Count of HIE meds pending verification, link to med recon
    - **Care Gaps** - HEDIS measures that HIE data can help close
    - **Preventive Screenings** - Due screenings based on HIE history
  - Follow existing Card/CardHeader/CardContent/Badge pattern
  - Use existing color palette (Dark Blue for headers, Orange for action items, Teal for info)
- [ ] **T6.3** Add ingestion status indicator to visit header
  - Show "HIE Data Available" badge when ingestion log exists for visit
  - Show resource count summary on hover/click

### Phase 7: Care Gap Prioritization (CR-002-06)

- [ ] **T7.1** Cross-reference HIE Observations/Procedures against measure definitions
  - For each active measure definition, check if HIE data satisfies or partially satisfies the measure
  - Example: HIE has a colonoscopy Procedure → COL measure may be partially met
  - Generate gap analysis: { measureId, status: "met" | "partially_met" | "gap", hieEvidence: [...] }
- [ ] **T7.2** Include care gap analysis in previsit-summary response
  - Prioritize gaps by clinical impact and ease of closure during visit
  - Surface as actionable items in NP Guidance Panel

### Phase 8: Completeness Engine Pre-Visit Awareness (CR-002-07)

- [ ] **T8.1** Extend completeness engine with `previsit_data` component type
  - Add new case in completeness rule evaluation switch
  - Check: has HIE ingestion been processed? Are suspected conditions reviewed?
  - Status: `passed` if all HIE items reviewed, `failed` if pending items remain
- [ ] **T8.2** Add completeness rules for pre-visit data to seed/plan packs
  - Rule: "HIE Medication Review" - requires all `source=hie` meds in `med_reconciliation` to be verified
  - Rule: "Suspected Condition Review" - requires all suspected conditions to be confirmed or dismissed
- [ ] **T8.3** Update completeness UI to show pre-visit items
  - Reuses existing completeness display - new rules appear automatically

### Phase 9: Supervisor Adjudication Enrichment (CR-002-08)

- [ ] **T9.1** Extend adjudication summary endpoint with HIE indicators
  - Add to `/api/visits/:id/adjudication-summary`:
    - `hieDataAvailable: boolean`
    - `hieIngestionSummary: { resourceCount, receivedAt, status }`
    - `suspectedConditionsReviewed: { total, confirmed, dismissed, pending }`
    - `hieMedReconciliationStatus: { total, verified, pending }`
- [ ] **T9.2** Update Supervisor Review UI to display HIE validation badges
  - Show "HIE Verified" indicators on conditions that were confirmed from HIE
  - Show med reconciliation completion status for HIE-sourced meds
  - Show care gap closure indicators
  - Follow existing adjudication scorecard UI patterns

### Phase 10: Demo Data & Testing

- [ ] **T10.1** Create sample HIE FHIR Bundle JSON for testing
  - Include: 4-5 MedicationStatements, 3-4 Conditions, 2-3 Observations, 1-2 Procedures
  - Use realistic clinical data matching existing demo patients
  - Save as `server/data/demo-hie-previsit-bundle.json`
- [ ] **T10.2** Add "Simulate HIE Ingestion" button to FHIR Playground
  - Sends demo bundle to PrevisitContext endpoint for selected visit
  - Shows processing results
  - Reuses existing FHIR Playground patterns
- [ ] **T10.3** End-to-end testing
  - Test: Ingest HIE bundle → Verify med recon pre-populated → Verify suspected conditions appear → NP confirms/dismisses → Completeness engine reflects → Supervisor sees HIE indicators
- [ ] **T10.4** Update `replit.md` with CR-002 feature documentation

---

## 4. API Reference (New & Modified Endpoints)

### New Endpoints

| Method | Path | Purpose | CR |
|---|---|---|---|
| `POST` | `/api/fhir/PrevisitContext` | Accept HIE FHIR Bundle for a scheduled encounter | CR-002-01 |
| `GET` | `/api/visits/:id/previsit-summary` | Aggregated pre-visit intelligence summary | CR-002-05 |
| `GET` | `/api/visits/:id/suspected-conditions` | List suspected conditions for a visit | CR-002-03 |
| `PATCH` | `/api/visits/:id/suspected-conditions/:condId` | Confirm or dismiss a suspected condition | CR-002-03 |
| `GET` | `/api/visits/:id/hie-ingestion-log` | Get HIE ingestion history for a visit | CR-002-04 |

### Modified Endpoints

| Method | Path | Change | CR |
|---|---|---|---|
| `GET` | `/api/visits/:id/overview` | Add `suspectedConditions`, `hieIngestionLog` to response | CR-002-03, CR-002-04 |
| `GET` | `/api/visits/:id/completeness` | Add `previsit_data` component type evaluation | CR-002-07 |
| `GET` | `/api/visits/:id/adjudication-summary` | Add HIE verification indicators | CR-002-08 |

---

## 5. FHIR Resource Mapping

### Inbound: `POST /api/fhir/PrevisitContext`

| FHIR Resource | Maps To | Source Field | Status Field |
|---|---|---|---|
| `MedicationStatement` | `med_reconciliation` + `medication_history` | `"hie"` | `"pending"` (unverified) |
| `Condition` | `suspected_conditions` (if new) | `"hie"` via `hieSource` | `"pending"` |
| `Observation` (lab) | `lab_results` | `"hie"` | — |
| `Observation` (vitals) | `vitals_history` | `"hie"` | — |
| `Procedure` | `visit_codes` | `"hie"` | `verified = false` |

### Field Mapping: MedicationStatement → med_reconciliation

| FHIR Field | EH POC Field |
|---|---|
| `medicationCodeableConcept.text` | `medicationName` |
| `medicationCodeableConcept.coding[0].display` | `genericName` |
| `dosage[0].text` | `dosage` |
| `dosage[0].timing.code.text` | `frequency` |
| `dosage[0].route.text` | `route` |
| `effectivePeriod.start` | `startDate` |
| `effectivePeriod.end` | `endDate` |
| `status` | mapped to EH status |
| *(hardcoded)* | `source = "hie"`, `status = "pending"` |

### Field Mapping: Condition → suspected_conditions

| FHIR Field | EH POC Field |
|---|---|
| `code.coding[0].code` | `icdCode` |
| `code.coding[0].display` or `code.text` | `description` |
| `verificationStatus.coding[0].code` | `confidence` mapping |
| *(hardcoded)* | `hieSource = "EH"`, `status = "pending"` |

### Field Mapping: Observation (Lab) → lab_results

| FHIR Field | EH POC Field |
|---|---|
| `code.text` or `code.coding[0].display` | `testName` |
| `code.coding[0].code` | `testCode` |
| `valueQuantity.value` | `value` |
| `valueQuantity.unit` | `unit` |
| `referenceRange[0].low.value` | `referenceMin` |
| `referenceRange[0].high.value` | `referenceMax` |
| `effectiveDateTime` | `collectedDate` |
| `issued` | `resultDate` |
| *(hardcoded)* | `source = "hie"` |

---

## 6. UI Component Specifications

### 6.1 NP Guidance Panel (New - Intake Dashboard Right Panel)

```
Position: Top of right panel, above Visit Alerts
Visibility: Only when hie_ingestion_log exists for the visit
Color Scheme: Dark Blue (#2E456B) header, Orange (#FEA002) for action items

Sections:
┌─────────────────────────────────────────────┐
│ 🔍 Pre-Visit Intelligence          [HIE]    │
│ Received: Feb 12, 2026 | 12 resources       │
├─────────────────────────────────────────────┤
│ SUSPECTED DIAGNOSES (3 pending)              │
│  ● E11.65 Type 2 DM w/ hyperglycemia  [✓][✗]│
│  ● I50.9  Heart failure, unspecified   [✓][✗]│
│  ● E03.9  Hypothyroidism              [✓][✗]│
├─────────────────────────────────────────────┤
│ MEDICATION REVIEW                            │
│  4 medications from HIE pending verification │
│  [Go to Medication Reconciliation →]         │
├─────────────────────────────────────────────┤
│ CARE GAPS                                    │
│  ● COL: Colonoscopy due (last: 2016)        │
│  ● CDC-A1C: No recent HbA1c on file         │
├─────────────────────────────────────────────┤
│ SCREENINGS DUE                               │
│  ● BCS: Mammogram (age 82, in range 40-74)  │
└─────────────────────────────────────────────┘
```

### 6.2 Provenance Badges (Additions to Existing UI)

- **Timeline entries**: Small "HIE" badge (Badge variant="outline", text-xs) next to source indicator
- **Med Recon list items**: "HIE - Unverified" badge (Badge variant="secondary") for `source=hie`, `status=pending`
- **Visit header**: "HIE Data Available" badge when ingestion log exists

### 6.3 Supervisor Review Additions

- **Adjudication Scorecard**: New row "HIE Data Validation" with counts
- **Condition list**: "HIE Verified" indicator on confirmed suspected conditions
- **Med Recon summary**: HIE verification completion percentage

---

## 7. Dependency Graph

```
Phase 1 (Schema)
    ├── Phase 2 (FHIR API) ← depends on new tables
    │       ├── Phase 3 (Provenance) ← depends on data being ingested
    │       ├── Phase 4 (Med Recon) ← depends on med data being ingested
    │       └── Phase 5 (Condition Suspecting) ← depends on conditions being ingested
    │               └── Phase 6 (NP Guidance Panel) ← depends on all data + endpoints
    │                       ├── Phase 7 (Care Gaps) ← depends on guidance panel
    │                       ├── Phase 8 (Completeness) ← depends on data + rules
    │                       └── Phase 9 (Supervisor) ← depends on all prior phases
    └── Phase 10 (Demo & Testing) ← depends on all phases
```

---

## 8. MoSCoW Traceability

| CR ID | Priority | Requirement | Implementation Phase | Status |
|---|---|---|---|---|
| CR-002-01 | Must | External FHIR ingestion API | Phase 1, 2 | [ ] Not Started |
| CR-002-02 | Must | Medication reconciliation pre-population | Phase 2, 4 | [ ] Not Started |
| CR-002-03 | Must | HIE-derived condition suspecting | Phase 2, 5 | [ ] Not Started |
| CR-002-04 | Must | Provenance tagging | Phase 2, 3 | [ ] Not Started |
| CR-002-05 | Must | Pre-Visit NP guidance panel | Phase 6 | [ ] Not Started |
| CR-002-06 | Should | Care gap prioritization | Phase 7 | [ ] Not Started |
| CR-002-07 | Should | Completeness engine pre-visit awareness | Phase 8 | [ ] Not Started |
| CR-002-08 | Should | Supervisor adjudication enrichment | Phase 9 | [ ] Not Started |

---

## 9. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| HIE Bundle contains unexpected resource types | Low | Skip with warning in OperationOutcome (existing pattern) |
| Duplicate medications from multiple HIE sources | Medium | Dedup on medicationName + dosage + visitId before insert; unique constraint on `suspected_conditions(visitId, icdCode)` |
| Large bundles cause timeout | Low | Process synchronously with streaming status; log partial results on failure |
| NP ignores suspected conditions | Medium | Completeness engine rule blocks finalization until reviewed |
| HIE data quality varies | Medium | All HIE data marked as `pending`/`unverified`; NP must confirm |
| Repeated PrevisitContext submissions | Medium | Idempotency via `bundleId` tracking in `hie_ingestion_log`; skip if same bundleId already processed. For resources: dedup by medicationName+dosage (meds), icdCode+visitId (conditions), testCode+collectedDate (labs) |
| Ingestion on locked visits | High | Check `visit.lockedAt` before processing; reject with 409 Conflict if visit is locked |
| Observation routing ambiguity (lab vs vitals) | Medium | Use LOINC category codes: vital-signs category → `vitals_history`, laboratory category → `lab_results`. Fallback to `lab_results` if category is absent |
| Partial ingestion failure | Medium | Process all resources; collect errors per-resource; update ingestion log status to `partial` if some succeed and some fail; never roll back successful inserts |

---

## 10. Acceptance Criteria Summary

- [ ] **AC-01**: POST to `/api/fhir/PrevisitContext` with valid FHIR Bundle returns 200 with OperationOutcome
- [ ] **AC-02**: MedicationStatements appear in med reconciliation with `source=hie`, `status=pending`
- [ ] **AC-03**: Conditions not in encounter problem list appear as suspected conditions with `status=pending`
- [ ] **AC-04**: All HIE-originated records display "HIE" provenance badge in UI
- [ ] **AC-05**: NP Guidance Panel displays on intake dashboard when HIE data exists
- [ ] **AC-06**: NP can confirm or dismiss suspected conditions
- [ ] **AC-07**: Confirmed conditions create visit_code entries
- [ ] **AC-08**: Completeness engine flags unreviewed HIE items
- [ ] **AC-09**: Supervisor adjudication shows HIE validation indicators
- [ ] **AC-10**: Demo HIE bundle available in FHIR Playground for testing
