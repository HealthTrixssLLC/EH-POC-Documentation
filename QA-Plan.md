# Easy Health - QA Test Plan

**Application:** Easy Health In-Home Clinical Visit Platform
**Version:** POC v1.0
**Date:** February 13, 2026
**Prepared By:** QA Engineering

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Environment](#2-test-environment)
3. [User Accounts & Roles](#3-user-accounts--roles)
4. [Demo Patients](#4-demo-patients)
5. [Module 1: Authentication & Login](#5-module-1-authentication--login)
6. [Module 2: Dashboard](#6-module-2-dashboard)
7. [Module 3: Visit List](#7-module-3-visit-list)
8. [Module 4: Pre-Visit Summary](#8-module-4-pre-visit-summary)
9. [Module 5: Intake Dashboard](#9-module-5-intake-dashboard)
10. [Module 6: Identity Verification](#10-module-6-identity-verification)
11. [Module 7: Vitals & Examination](#11-module-7-vitals--examination)
12. [Module 8: Assessments (PHQ-2, PHQ-9, PRAPARE, AWV)](#12-module-8-assessments)
13. [Module 9: HEDIS Measures (BCS, COL)](#13-module-9-hedis-measures)
14. [Module 10: Medication Reconciliation](#14-module-10-medication-reconciliation)
15. [Module 11: Care Plan](#15-module-11-care-plan)
16. [Module 12: Patient Clinical Timeline](#16-module-12-patient-clinical-timeline)
17. [Module 13: Visit Consents](#17-module-13-visit-consents)
18. [Module 14: Voice Capture & AI Extraction](#18-module-14-voice-capture--ai-extraction)
19. [Module 15: Clinical Decision Support (CDS)](#19-module-15-clinical-decision-support)
20. [Module 16: Finalization & Gating Validation](#20-module-16-finalization--gating-validation)
21. [Module 17: Supervisor Review Queue](#21-module-17-supervisor-review-queue)
22. [Module 18: Care Coordination](#22-module-18-care-coordination)
23. [Module 19: FHIR R4 API & Playground](#23-module-19-fhir-r4-api--playground)
24. [Module 20: HIE Pre-Visit Intelligence (CR-002)](#24-module-20-hie-pre-visit-intelligence)
25. [Module 21: Audit & Compliance](#25-module-21-audit--compliance)
26. [Module 22: Admin Console & Demo Management](#26-module-22-admin-console--demo-management)
27. [Module 23: PWA & Responsive Design](#27-module-23-pwa--responsive-design)
28. [End-to-End Workflow Scenarios](#28-end-to-end-workflow-scenarios)
29. [API Test Cases](#29-api-test-cases)
30. [Defect Severity Definitions](#30-defect-severity-definitions)

---

## 1. Overview

Easy Health is a clinical platform managing in-home Nurse Practitioner visits for Medicare Advantage and ACA plans. This QA plan covers all functional modules, role-based access, clinical workflows, data integrity, FHIR interoperability, and UI/UX testing.

### Scope

- All user-facing pages and workflows
- API endpoint validation
- Role-based access control (RBAC)
- Clinical data accuracy (assessment scoring, HEDIS tracking)
- FHIR R4 export/import compliance
- HIE Pre-Visit Intelligence ingestion and workflow
- Finalization gating logic
- Supervisor review and sign-off
- PWA readiness

### Out of Scope

- Performance/load testing
- iOS native (Capacitor) build testing
- Third-party API uptime (OpenAI)
- Penetration testing

---

## 2. Test Environment

| Item | Detail |
|------|--------|
| **URL** | `https://eh-poc-application.healthtrixss.com` (production) or `localhost:5000` (dev) |
| **Browser** | Chrome 120+, Safari 17+, Firefox 120+ |
| **Mobile** | iOS Safari, Chrome Android (responsive mode) |
| **Database** | PostgreSQL (Neon-backed) |
| **Demo Reset** | POST `/api/demo/reset` reseeds all data |

### Pre-Test Setup

1. Navigate to the application URL
2. Verify the login page loads
3. If testing on a fresh environment, data will be auto-seeded on first run
4. To reset demo data mid-testing: call `POST /api/demo/reset`

---

## 3. User Accounts & Roles

All demo accounts use password: `password`

| Username | Full Name | Role | Access Level |
|----------|-----------|------|-------------|
| `sarah.np` | Sarah Johnson, NP | Nurse Practitioner | Visits, intake, assessments, finalization |
| `michael.np` | Michael Chen, NP | Nurse Practitioner | Same as above |
| `dr.williams` | Dr. Lisa Williams | Supervisor | Review queue, sign-off, adjudication |
| `emma.coord` | Emma Davis | Care Coordinator | Care coordination, task management |
| `admin` | System Admin | Admin | Admin console, FHIR playground, demo config |
| `compliance` | Robert Taylor | Compliance | Audit queue, compliance reports |

### Login Methods

- **Standard Login:** Enter username and password on login page
- **Demo Quick Login:** Click role-specific buttons (Demo NP, Demo Supervisor, etc.) then click "Sign In"

---

## 4. Demo Patients

| Member ID | Name | DOB | Plan | Key Conditions |
|-----------|------|-----|------|---------------|
| MEM-001 | Dorothy Martinez | 1945-03-15 | MA-PLAN-001 | Type 2 Diabetes, Hypertension, Osteoarthritis |
| MEM-002 | Harold Washington | 1938-11-22 | MA-PLAN-001 | COPD, CHF, Depression |
| MEM-003 | Margaret Thompson | 1952-07-08 | ACA-PLAN-001 | Breast cancer (remission), Hypothyroidism, Anxiety |

Additional patients available via FHIR Bundle import (5 more patients).

---

## 5. Module 1: Authentication & Login

**Route:** `/` (redirects to login if unauthenticated)

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| AUTH-001 | Valid NP login | 1. Navigate to `/` 2. Enter username `sarah.np`, password `password` 3. Click Sign In | Dashboard loads, NP role features visible | P1 |
| AUTH-002 | Valid Supervisor login | 1. Navigate to `/` 2. Enter `dr.williams` / `password` 3. Click Sign In | Dashboard loads, Supervisor features visible (Review Queue) | P1 |
| AUTH-003 | Valid Coordinator login | 1. Login as `emma.coord` | Dashboard loads with Care Coordination view | P1 |
| AUTH-004 | Valid Admin login | 1. Login as `admin` | Dashboard loads, Admin Console accessible in sidebar | P1 |
| AUTH-005 | Valid Compliance login | 1. Login as `compliance` | Dashboard loads, Audit section accessible | P1 |
| AUTH-006 | Invalid password | 1. Enter valid username with wrong password 2. Click Sign In | Error message displayed, no login | P1 |
| AUTH-007 | Empty fields | 1. Click Sign In without entering credentials | Validation error shown | P2 |
| AUTH-008 | Demo quick login buttons | 1. Click "Demo NP" button 2. Click "Sign In" | Auto-fills credentials and logs in as NP | P2 |
| AUTH-009 | Session persistence | 1. Login 2. Refresh page | User remains logged in, dashboard reloads | P2 |
| AUTH-010 | Logout | 1. Click logout/sign out | Redirected to login page, session cleared | P2 |

---

## 6. Module 2: Dashboard

**Route:** `/`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| DASH-001 | NP Dashboard loads | 1. Login as NP 2. Verify dashboard content | Shows today's visits, pending tasks, recent activity | P1 |
| DASH-002 | Supervisor Dashboard | 1. Login as Supervisor | Shows review queue summary, pending reviews count | P1 |
| DASH-003 | Coordinator Dashboard | 1. Login as Coordinator | Shows care coordination tasks, referral status | P1 |
| DASH-004 | Dashboard visit cards | 1. Login as NP 2. View visit cards | Each card shows patient name, time, visit type, status badge | P2 |
| DASH-005 | Navigate to visit from dashboard | 1. Click on a visit card | Navigates to pre-visit summary or intake | P2 |

---

## 7. Module 3: Visit List

**Route:** `/visits`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| VISIT-001 | Visit list loads | 1. Navigate to `/visits` | All visits displayed with patient name, date, status, visit type | P1 |
| VISIT-002 | Visit status badges | 1. View visit list | Status badges show correct colors: scheduled (blue), in_progress (amber), approved (green), correction_requested (red) | P2 |
| VISIT-003 | Navigate to visit summary | 1. Click on a scheduled visit | Navigates to `/visits/{id}/summary` | P1 |
| VISIT-004 | Navigate to visit intake | 1. Click on an in-progress visit | Navigates to `/visits/{id}/intake` | P1 |
| VISIT-005 | Visit filtering | 1. Use any available filters (status, date) | List updates to show filtered results | P3 |

---

## 8. Module 4: Pre-Visit Summary

**Route:** `/visits/:id/summary`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| PREVISIT-001 | Summary loads | 1. Navigate to a visit summary | Patient demographics, conditions, medications, allergies, risk flags displayed | P1 |
| PREVISIT-002 | Plan pack info | 1. View summary | Shows assigned plan pack, required assessments, required HEDIS measures | P1 |
| PREVISIT-003 | HIE data display | 1. View summary for a visit with HIE data ingested | HIE ingestion log shown, suspected conditions listed with pending/confirmed/dismissed status | P1 |
| PREVISIT-004 | NP Guidance panel | 1. View summary with HIE data | Pre-visit guidance panel shows prioritized care gaps and HIE-sourced information | P2 |
| PREVISIT-005 | Start visit button | 1. Click "Start Visit" or equivalent | Visit status changes to in_progress, navigates to intake dashboard | P1 |
| PREVISIT-006 | Travel & safety notes | 1. View summary | Travel notes and safety notes visible if present | P3 |

---

## 9. Module 5: Intake Dashboard

**Route:** `/visits/:id/intake`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| INTAKE-001 | Dashboard loads | 1. Navigate to intake dashboard | Patient header, objective checklist, navigation links to all intake sections | P1 |
| INTAKE-002 | Objective checklist status | 1. View checklist items | Each item shows correct status: not_started, in_progress, complete, unable_to_assess | P1 |
| INTAKE-003 | Progress tracking | 1. Complete an assessment 2. Return to intake dashboard | Checklist item updates to "complete," overall progress percentage increases | P1 |
| INTAKE-004 | Unable to assess | 1. Click unable to assess on a checklist item 2. Select reason 3. Add notes | Item marked as unable_to_assess, reason and notes saved | P1 |
| INTAKE-005 | Navigation links | 1. Click each section link (Identity, Vitals, Assessments, Measures, Meds, Care Plan, Timeline, Consents, Voice Capture) | Each navigates to the correct page | P1 |
| INTAKE-006 | Suspected conditions from HIE | 1. View intake for visit with HIE data | Suspected diagnoses section shows pending conditions with confirm/dismiss buttons | P1 |
| INTAKE-007 | Confirm suspected condition | 1. Click "Confirm" on a suspected condition (e.g., E11.9 Diabetes) | Condition status changes to "confirmed," linked diagnosis code created | P1 |
| INTAKE-008 | Dismiss suspected condition | 1. Click "Dismiss" on a suspected condition 2. Enter dismissal reason | Condition status changes to "dismissed," reason saved | P1 |
| INTAKE-009 | Progress note section | 1. View/edit progress notes | MEAT/TAMPER compliant notes editable with chief complaint, HPI, ROS, exam, assessment, plan sections | P2 |
| INTAKE-010 | Patient context panel | 1. Navigate to `/visits/:id/intake/patient-context` | Shows patient context with conditions, medications, risk flags | P2 |

---

## 10. Module 6: Identity Verification

**Route:** `/visits/:id/intake/identity`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| ID-001 | Identity page loads | 1. Navigate to identity verification | Patient name, DOB, address displayed for verification | P1 |
| ID-002 | Verify identity | 1. Select verification method (visual ID, verbal confirmation) 2. Confirm identity | Visit record updated with identityVerified=true, identityMethod set | P1 |
| ID-003 | Return to intake | 1. Complete verification 2. Navigate back | Intake checklist shows identity as "complete" | P1 |

---

## 11. Module 7: Vitals & Examination

**Route:** `/visits/:id/intake/vitals`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| VITALS-001 | Vitals form loads | 1. Navigate to vitals | Empty form with fields: BP (systolic/diastolic), HR, RR, temp, O2 sat, weight (lbs), height (feet/inches), pain level | P1 |
| VITALS-002 | Enter valid vitals | 1. Enter: BP 120/80, HR 72, RR 16, Temp 98.6, O2 97%, Weight 165 lbs, Height 5'8" 2. Save | Vitals saved, BMI auto-calculated, checklist updated | P1 |
| VITALS-003 | US standard units | 1. Observe unit labels | Weight in lbs, height in feet/inches, temp in F | P1 |
| VITALS-004 | BMI auto-calculation | 1. Enter weight and height 2. Observe BMI | BMI correctly calculated from weight (lbs) and height (ft/in) | P1 |
| VITALS-005 | Out-of-range warning | 1. Enter BP 220/140 (critically high) 2. Save | Warning displayed about abnormal values, validation override option available | P1 |
| VITALS-006 | Validation override | 1. Trigger out-of-range warning 2. Select override reason 3. Add note 4. Confirm | Override saved with reason and note, vitals accepted | P1 |
| VITALS-007 | Pain level scale | 1. Enter pain level 0-10 | Value accepted, displayed correctly | P2 |
| VITALS-008 | Incomplete vitals | 1. Save with only some fields filled | Partial save allowed, checklist shows "in_progress" | P2 |
| VITALS-009 | Voice-inferred fields | 1. If voice capture has extracted vital values, verify they pre-populate | Voice-extracted values shown with source indicator | P3 |

---

## 12. Module 8: Assessments

**Route:** `/visits/:id/intake/assessment/:aid`

### Instruments: PHQ-2, PHQ-9, PRAPARE, AWV

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| ASSESS-001 | PHQ-2 loads | 1. Navigate to PHQ-2 assessment | 2 questions displayed with 4 response options each (0-3 scale) | P1 |
| ASSESS-002 | PHQ-2 scoring | 1. Answer both PHQ-2 questions 2. Submit | Score computed (0-6), interpretation displayed (e.g., "Positive screen" if >= 3) | P1 |
| ASSESS-003 | PHQ-2 triggers PHQ-9 | 1. Complete PHQ-2 with score >= 3 | PHQ-9 assessment becomes available/required (conditional assessment) | P1 |
| ASSESS-004 | PHQ-2 does not trigger PHQ-9 | 1. Complete PHQ-2 with score < 3 | PHQ-9 not required, checklist reflects this | P1 |
| ASSESS-005 | PHQ-9 loads | 1. Navigate to PHQ-9 (after PHQ-2 trigger) | 9 questions displayed with 4 response options each | P1 |
| ASSESS-006 | PHQ-9 scoring | 1. Complete all 9 questions 2. Submit | Score computed (0-27), severity interpretation (None, Mild, Moderate, Moderately Severe, Severe) | P1 |
| ASSESS-007 | PRAPARE loads | 1. Navigate to PRAPARE assessment | Social determinants of health questions displayed | P1 |
| ASSESS-008 | PRAPARE scoring | 1. Complete PRAPARE 2. Submit | Score computed, risk areas identified | P1 |
| ASSESS-009 | AWV loads | 1. Navigate to Annual Wellness Visit assessment | AWV-specific questions displayed | P1 |
| ASSESS-010 | AWV scoring | 1. Complete AWV 2. Submit | Score and interpretation generated | P1 |
| ASSESS-011 | Unable to assess | 1. Click "Unable to Assess" on any assessment 2. Select reason 3. Add note | Assessment marked as unable_to_assess, reason recorded | P1 |
| ASSESS-012 | Assessment saves in progress | 1. Answer some questions 2. Navigate away 3. Return | Partial responses preserved, assessment shows "in_progress" | P2 |
| ASSESS-013 | Checklist update after completion | 1. Complete an assessment 2. Return to intake | Corresponding checklist item shows "complete" with score summary | P1 |

---

## 13. Module 9: HEDIS Measures

**Route:** `/visits/:id/intake/measure/:mid`

### Measures: BCS (Breast Cancer Screening), COL (Colorectal Screening)

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| HEDIS-001 | BCS measure loads | 1. Navigate to BCS measure for eligible patient (female, age-appropriate) | BCS form with screening documentation fields, age-range guidance shown | P1 |
| HEDIS-002 | BCS documentation | 1. Document mammogram date, result, capture method 2. Save | Measure result saved, evidence metadata recorded | P1 |
| HEDIS-003 | COL measure loads | 1. Navigate to COL measure for eligible patient (age 45-75) | COL form with screening options (colonoscopy, FIT, etc.) | P1 |
| HEDIS-004 | COL documentation | 1. Document colonoscopy date, result 2. Save | Measure result saved with evidence | P1 |
| HEDIS-005 | Measure evaluation | 1. Complete a measure 2. Trigger evaluation | Measure evaluated against HEDIS criteria, pass/fail determined | P1 |
| HEDIS-006 | Unable to assess measure | 1. Click unable to assess 2. Select reason 3. Save | Measure marked unable_to_assess, reason saved, checklist updated | P1 |
| HEDIS-007 | Age-range guidance | 1. View measure for patient outside recommended age range | Guidance message displayed indicating patient age relative to measure criteria | P2 |

---

## 14. Module 10: Medication Reconciliation

**Route:** `/visits/:id/intake/medications`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| MEDS-001 | Med recon page loads | 1. Navigate to medication reconciliation | Current medication list displayed with name, dosage, frequency, route, source, status | P1 |
| MEDS-002 | Medication sources | 1. View medication list | Medications show correct source labels: "history," "home," "patient_report," "external" (HIE) | P1 |
| MEDS-003 | HIE medications | 1. View med recon for visit with HIE data ingested | HIE-sourced medications appear with source="external" and status="new" | P1 |
| MEDS-004 | Verify medication | 1. Click verify/reconcile on a medication | Status changes to "verified," reconciled by and timestamp recorded | P1 |
| MEDS-005 | Add new medication | 1. Click Add Medication 2. Fill in name, dosage, frequency, route 3. Save | New medication added with source="patient_report" or "home" | P1 |
| MEDS-006 | Modify medication | 1. Edit an existing medication dosage 2. Save | Status changes to "modified," original values preserved for audit | P1 |
| MEDS-007 | Discontinue medication | 1. Mark a medication as discontinued 2. Add reason | Status changes to "discontinued" | P1 |
| MEDS-008 | Drug interaction check | 1. Add a medication known to interact with an existing one | Interaction flag displayed with severity and description | P1 |
| MEDS-009 | Beers Criteria check | 1. Add/view a medication on the Beers list for elderly patients | Beers risk flag shown (isBeersRisk=true, beersReason displayed) | P1 |
| MEDS-010 | Hold medication | 1. Mark a medication as held | Status changes to "held" | P2 |

---

## 15. Module 11: Care Plan

**Route:** `/visits/:id/intake/careplan`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| CARE-001 | Care plan loads | 1. Navigate to care plan | Existing tasks shown (referrals, follow-ups, patient education) | P1 |
| CARE-002 | Add care plan task | 1. Click Add Task 2. Select type (referral, follow-up, education, lab order) 3. Fill details 4. Save | Task created with title, description, priority, due date | P1 |
| CARE-003 | Task priority levels | 1. Create tasks with different priorities (low, medium, high, urgent) | Each displays correct priority badge | P2 |
| CARE-004 | Update task status | 1. Change task status from pending to in_progress to completed | Status updates correctly, completed tasks show completion timestamp | P2 |
| CARE-005 | Assign task | 1. Assign task to a user | Task shows assigned user | P2 |

---

## 16. Module 12: Patient Clinical Timeline

**Route:** `/visits/:id/intake/timeline`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| TIMELINE-001 | Timeline loads | 1. Navigate to patient timeline | Longitudinal view of lab results, medication changes, vital sign trends | P1 |
| TIMELINE-002 | Lab results display | 1. View lab section | Lab results shown with test name, value, units, reference range, status (normal/high/low) | P1 |
| TIMELINE-003 | Medication history | 1. View medication section | Medication history with start/end dates, dosage changes, prescriber | P1 |
| TIMELINE-004 | Vitals trends | 1. View vitals section | Historical vital signs with trend visualization | P2 |
| TIMELINE-005 | HIE-sourced data | 1. View timeline for patient with HIE data | HIE-sourced items display provenance tag (source="hie") | P2 |
| TIMELINE-006 | Data source filtering | 1. Filter by source (practice vs. HIE) | Timeline filters to show selected source data | P3 |

---

## 17. Module 13: Visit Consents

**Route:** `/visits/:id/intake/consents`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| CONSENT-001 | Consent page loads | 1. Navigate to consents | Shows consent items: NOPP acknowledgement, Voice Transcription permission | P1 |
| CONSENT-002 | Grant NOPP consent | 1. Select method (verbal, written, digital) 2. Mark as granted | NOPP consent recorded with method, captured by, timestamp | P1 |
| CONSENT-003 | NOPP exception | 1. Click exception path 2. Select reason (e.g., "Patient refused to acknowledge") 3. Add note | Exception recorded with reason and note | P1 |
| CONSENT-004 | Voice transcription consent | 1. Grant voice transcription consent | Consent recorded, voice capture module unlocked | P1 |
| CONSENT-005 | Decline voice consent | 1. Decline voice transcription | Consent status = declined, voice capture remains locked | P1 |
| CONSENT-006 | Previously delivered NOPP | 1. Select "previously_delivered" method | Consent recorded, linked to prior delivery | P2 |

---

## 18. Module 14: Voice Capture & AI Extraction

**Route:** `/visits/:id/intake/voice-capture`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| VOICE-001 | Voice capture page loads | 1. Navigate to voice capture (consent must be granted first) | Recording interface displayed if consent granted | P1 |
| VOICE-002 | Consent gate | 1. Navigate to voice capture without granting voice consent | Message shown requiring consent before recording | P1 |
| VOICE-003 | Record audio | 1. Click record 2. Speak clinical notes 3. Stop recording | Recording saved with duration, mime type, status="completed" | P1 |
| VOICE-004 | Transcribe recording | 1. Click transcribe on a completed recording | Transcription request sent to OpenAI Whisper, status updates to "transcribing" then "transcribed" | P1 |
| VOICE-005 | View transcript | 1. View completed transcript | Transcript text displayed with confidence score | P1 |
| VOICE-006 | Extract fields | 1. Click extract on a completed transcript | GPT-4o extracts structured fields (vitals, conditions, medications) from transcript | P1 |
| VOICE-007 | Review extracted fields | 1. View extracted fields | Each field shows: key, label, proposed value, confidence, source snippet, status (pending) | P1 |
| VOICE-008 | Accept extracted field | 1. Click accept on an extracted field | Field status = "accepted," value applied to visit record | P1 |
| VOICE-009 | Reject extracted field | 1. Click reject on an extracted field | Field status = "rejected," value not applied | P1 |
| VOICE-010 | Edit extracted field | 1. Edit the proposed value of an extracted field 2. Accept | Edited value saved and applied | P2 |
| VOICE-011 | Bulk accept fields | 1. Click bulk accept | All pending fields accepted at once | P2 |
| VOICE-012 | Assessment extraction | 1. Trigger assessment-specific extraction | Assessment responses extracted from transcript and mapped to instrument questions | P2 |
| VOICE-013 | AI provider not configured | 1. Attempt transcription without API key configured | Graceful error message, no crash | P2 |

---

## 19. Module 15: Clinical Decision Support (CDS)

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| CDS-001 | Rules evaluate on vitals save | 1. Enter vitals with high BP (e.g., 160/100) 2. Save | CDS rule fires, recommendation generated (e.g., "Consider hypertension follow-up") | P1 |
| CDS-002 | View recommendations | 1. Navigate to recommendations section | Pending recommendations shown with rule name, action, priority | P1 |
| CDS-003 | Accept recommendation | 1. Accept a CDS recommendation | Status changes to accepted, linked action created | P1 |
| CDS-004 | Dismiss recommendation | 1. Dismiss a recommendation 2. Select reason 3. Add note | Status = dismissed, reason and note recorded | P1 |
| CDS-005 | Auto-coding (CPT/HCPCS/ICD-10) | 1. Complete visit components 2. Trigger code generation | CPT, HCPCS, and ICD-10 codes auto-generated based on completed assessments, measures, and diagnoses | P1 |
| CDS-006 | Code verification | 1. View generated codes | Each code shows: type, code, description, source, auto-assigned flag, verification status | P2 |
| CDS-007 | Remove auto-assigned code | 1. Remove an auto-assigned code | Code marked removedByNp=true | P2 |
| CDS-008 | Vitals validation alerts | 1. Enter critically abnormal vitals | Alerts created with appropriate severity (warning, critical, emergency) | P1 |
| CDS-009 | Alert acknowledgement | 1. Acknowledge an alert | Alert status updated, acknowledgedBy and timestamp recorded | P2 |
| CDS-010 | Alert dismissal | 1. Dismiss an alert with reason | Alert dismissed, reason saved | P2 |
| CDS-011 | Code evidence mapping | 1. View code evidence | Evidence map links codes to supporting clinical data (assessments, vitals, diagnoses) | P3 |

---

## 20. Module 16: Finalization & Gating Validation

**Route:** `/visits/:id/finalize`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| FINAL-001 | Finalization page loads | 1. Navigate to finalization | Completeness summary, gating checklist, clinical note preview | P1 |
| FINAL-002 | Gating - all complete | 1. Complete all required assessments, measures, identity, vitals, consents 2. Attempt finalization | Finalization succeeds, visit status = "ready_for_review" | P1 |
| FINAL-003 | Gating - missing assessment | 1. Leave a required assessment incomplete 2. Attempt finalization | Gating blocks finalization, error lists missing items | P1 |
| FINAL-004 | Gating - missing vitals | 1. Skip vitals 2. Attempt finalization | Gating blocks, vitals listed as required | P1 |
| FINAL-005 | Gating - missing identity | 1. Skip identity verification 2. Attempt finalization | Gating blocks, identity verification listed as required | P1 |
| FINAL-006 | Gating - missing consent | 1. Skip NOPP consent 2. Attempt finalization | Gating blocks if consent required by plan pack | P1 |
| FINAL-007 | Gating with exclusions | 1. Mark required items as "unable to assess" with valid reasons 2. Attempt finalization | Exclusions accepted, finalization proceeds | P1 |
| FINAL-008 | Completeness score | 1. View completeness evaluation | Percentage score reflecting completed vs. required items, itemized breakdown | P1 |
| FINAL-009 | Clinical note generation | 1. View generated clinical note | Note includes all sections: chief complaint, HPI, ROS, exam, assessment, plan, assessment/measures summary | P2 |
| FINAL-010 | NP attestation | 1. Sign attestation 2. Finalize | signedAt, signedBy, attestationText recorded | P1 |
| FINAL-011 | Diagnosis validation | 1. View diagnosis validation results | Each diagnosis validated against rules, evidence mapping shown | P2 |
| FINAL-012 | Progress note export | 1. Export progress note | GET `/api/visits/:id/progress-note/export` returns formatted note | P2 |

---

## 21. Module 17: Supervisor Review Queue

**Route:** `/reviews`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| REVIEW-001 | Review queue loads | 1. Login as Supervisor 2. Navigate to `/reviews` | List of visits with status "ready_for_review" or "correction_requested" | P1 |
| REVIEW-002 | Review queue metrics | 1. View queue header | Shows pending count, average review time, rework rate | P2 |
| REVIEW-003 | Open visit for review | 1. Click on a visit in the queue | Visit detail with adjudication scorecard, completeness scores, clinical note | P1 |
| REVIEW-004 | Approve visit | 1. Review visit 2. Add comments 3. Click Approve | Visit status = "approved," review decision recorded with timestamp | P1 |
| REVIEW-005 | Return for correction | 1. Select structured return reasons (e.g., "Incomplete Assessment," "Documentation Gap") 2. Add comments 3. Click Return | Visit status = "correction_requested," return reasons saved, visit unlocked for NP | P1 |
| REVIEW-006 | Adjudication scorecard | 1. View scorecard | Shows completeness score, diagnosis support score, quality flags | P1 |
| REVIEW-007 | HIE verification badges | 1. Review visit with HIE data | HIE verification badges shown next to HIE-confirmed conditions and medications | P2 |
| REVIEW-008 | Encounter locking | 1. Approve a visit | Visit locked (lockedAt, lockedBy set), NP cannot modify | P1 |
| REVIEW-009 | Rework tracking | 1. Return a visit 2. NP corrects 3. Re-submit | Rework count incremented, review history preserved | P2 |
| REVIEW-010 | Structured return reasons | 1. View available return reason categories | 10 categories available: incomplete_assessment, missing_vitals, unsupported_diagnosis, documentation_gap, coding_error, medication_reconciliation, consent_missing, quality_measure, clinical_concern, other | P2 |
| REVIEW-011 | Sign-off history | 1. View sign-off history for a visit | All review decisions listed with reviewer, decision, timestamp, comments | P2 |

---

## 22. Module 18: Care Coordination

**Route:** `/coordination`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| COORD-001 | Coordination page loads | 1. Login as Care Coordinator 2. Navigate to `/coordination` | Task list with referrals, follow-ups, pending actions | P1 |
| COORD-002 | View all tasks | 1. View task list | Tasks from all visits shown with patient name, type, priority, status, due date | P1 |
| COORD-003 | Update task status | 1. Change task from pending to in_progress | Status updates, UI reflects change | P1 |
| COORD-004 | Complete task | 1. Mark task complete 2. Add outcome notes | Task completed with outcome, completedAt timestamp | P1 |
| COORD-005 | Filter tasks | 1. Filter by priority or status | Task list updates accordingly | P3 |

---

## 23. Module 19: FHIR R4 API & Playground

**Route:** `/admin/fhir`

### FHIR Playground UI Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| FHIR-001 | Playground loads | 1. Login as Admin 2. Navigate to `/admin/fhir` | Tabbed interface with API Reference, Export, Import, HIE Simulation sections | P1 |
| FHIR-002 | API Reference tab | 1. Click API Reference tab | Lists all 12+ FHIR endpoints with method, path, description | P2 |
| FHIR-003 | Export Patient | 1. Select a patient 2. Export as FHIR Patient resource | Valid FHIR R4 Patient JSON returned | P1 |
| FHIR-004 | Export Encounter | 1. Select a visit 2. Export as FHIR Encounter | Valid FHIR R4 Encounter JSON | P1 |
| FHIR-005 | Export comprehensive Bundle | 1. Export comprehensive bundle for a visit | Bundle with 11 resource types, 80+ entries across 17 data categories | P1 |
| FHIR-006 | Import FHIR Bundle | 1. Paste/upload a FHIR Bundle JSON 2. Import | Patient(s) and Encounter(s) created, import results displayed | P1 |
| FHIR-007 | Sample import bundle | 1. Load sample import bundle (5 patients) 2. Import | 5 new patients created with associated visits | P1 |
| FHIR-008 | Visit export | 1. Export a finalized visit | POST `/api/visits/:id/export` creates export artifact | P1 |
| FHIR-009 | PrevisitContext endpoint | 1. View in API Reference | PrevisitContext POST endpoint documented with resource mapping | P2 |

### FHIR API Endpoint Test Cases

| ID | Endpoint | Method | Test | Expected Result | Priority |
|----|----------|--------|------|----------------|----------|
| API-FHIR-001 | `/api/fhir/Patient` | GET | Retrieve all patients | 200, array of FHIR Patient resources | P1 |
| API-FHIR-002 | `/api/fhir/Patient` | POST | Upsert a patient | 201, patient created or updated | P1 |
| API-FHIR-003 | `/api/visits/:id/bundle` | GET | Get comprehensive visit bundle | 200, FHIR Bundle with 11 resource types | P1 |
| API-FHIR-004 | `/api/fhir/PrevisitContext` | POST | Submit HIE pre-visit bundle | 200, ingestion result with created/skipped/error counts | P1 |
| API-FHIR-005 | `/api/fhir/demo-bundle` | GET | Get demo FHIR bundle | 200, FHIR Bundle with sample patient data | P2 |
| API-FHIR-006 | `/api/fhir/demo-hie-bundle` | GET | Get demo HIE bundle | 200, Bundle with 14 resources (5 Medication, 4 Condition, 3 Observation, 2 Procedure) | P2 |
| API-FHIR-007 | `/api/demo/sample-import-bundle` | GET | Get sample import bundle | 200, importable FHIR Bundle with 5 patients | P2 |

---

## 24. Module 20: HIE Pre-Visit Intelligence (CR-002)

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| HIE-001 | HIE Simulation tab | 1. Navigate to `/admin/fhir` 2. Click "HIE Simulation" tab | Visit selector, "Preview Bundle" button, "Simulate HIE Ingestion" button displayed | P1 |
| HIE-002 | Preview demo bundle | 1. Click "Preview Bundle" | Resource count cards shown: 5 Medication, 4 Condition, 3 Observation, 2 Procedure | P1 |
| HIE-003 | Select visit for ingestion | 1. Open visit selector dropdown | Only eligible visits shown (not finalized/exported) | P1 |
| HIE-004 | Simulate HIE ingestion | 1. Select a visit 2. Click "Simulate HIE Ingestion" | Processing spinner, then results: "Ingestion completed" badge, resource counts (created/skipped/errors) | P1 |
| HIE-005 | Duplicate ingestion detection | 1. Ingest HIE data for same visit twice | Second ingestion shows duplicate warning, resources skipped | P1 |
| HIE-006 | Suspected conditions created | 1. After ingestion, check visit's suspected conditions via API | GET `/api/visits/:id/suspected-conditions` returns conditions with ICD codes (E11.9, I10, N18.3, E66.01) and status="pending" | P1 |
| HIE-007 | Med reconciliation populated | 1. After ingestion, check med reconciliation | GET `/api/visits/:id/med-reconciliation` includes HIE medications with source="external" | P1 |
| HIE-008 | Previsit summary enriched | 1. After ingestion, view previsit summary | GET `/api/visits/:id/previsit-summary` includes hieIngestionLog and suspectedConditions arrays | P1 |
| HIE-009 | NP confirm suspected condition | 1. Navigate to intake 2. Find suspected condition 3. Click Confirm | PATCH updates status to "confirmed," linked visit code created | P1 |
| HIE-010 | NP dismiss suspected condition | 1. Find suspected condition 2. Click Dismiss 3. Enter reason | PATCH updates status to "dismissed," dismissalReason recorded | P1 |
| HIE-011 | Completeness engine awareness | 1. Ingest HIE data 2. Check completeness | Completeness engine accounts for HIE-sourced data in its evaluation | P2 |
| HIE-012 | Supervisor HIE badges | 1. Login as Supervisor 2. Review visit with HIE data | HIE verification badges visible next to HIE-sourced conditions and medications | P2 |
| HIE-013 | Provenance tagging | 1. View HIE-sourced records in database | All HIE records tagged with source="hie" or source="external," hieSource field populated | P2 |
| HIE-014 | Ingestion log persistence | 1. After ingestion 2. Query ingestion log | hie_ingestion_log record with bundleId, sourceSystem, resourceCount, resourceSummary, status="completed" | P2 |

---

## 25. Module 21: Audit & Compliance

**Routes:** `/audit`, `/audit/queue`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| AUDIT-001 | Audit log loads | 1. Login as Compliance or Admin 2. Navigate to `/audit` | Audit event log with timestamps, event types, users, resources | P1 |
| AUDIT-002 | Audit queue loads | 1. Navigate to `/audit/queue` | Audit assignments listed with visit, assignee, status, priority, due date | P1 |
| AUDIT-003 | Random sampling | 1. Verify audit assignments exist | System creates audit assignments via random sampling after visit finalization | P2 |
| AUDIT-004 | Complete audit | 1. Open audit assignment 2. Add findings (category, description, severity) 3. Select recommendation (accept, remediate, escalate) 4. Submit | Audit outcome recorded with findings, overall severity, recommendation | P1 |
| AUDIT-005 | Audit finding categories | 1. View available finding categories | 8 categories: documentation_quality, coding_accuracy, clinical_appropriateness, regulatory_compliance, consent_verification, assessment_completeness, medication_safety, care_coordination | P2 |
| AUDIT-006 | Access audit logging | 1. Perform various actions as different users 2. Check audit log | Access events logged with userId, role, resource accessed, IP address | P2 |

---

## 26. Module 22: Admin Console & Demo Management

**Routes:** `/admin`, `/demo`

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| ADMIN-001 | Admin console loads | 1. Login as Admin 2. Navigate to `/admin` | Plan packs, assessment definitions, measure definitions, member management | P1 |
| ADMIN-002 | View plan packs | 1. View plan packs list | Shows plan name, visit type, required assessments, required measures | P2 |
| ADMIN-003 | View assessment definitions | 1. View assessment definitions | All instruments listed (PHQ-2, PHQ-9, PRAPARE, AWV) with questions, scoring rules | P2 |
| ADMIN-004 | View measure definitions | 1. View measure definitions | All HEDIS measures listed with criteria, CPT codes, evaluation type | P2 |
| ADMIN-005 | Member management | 1. View member list | All members shown 2. Edit member details | Member updated | P2 |
| ADMIN-006 | Tech docs page | 1. Navigate to `/admin/tech-docs` | Technical documentation displayed | P3 |
| ADMIN-007 | Demo config | 1. Navigate to `/demo` or demo config section | Demo mode toggle, watermark text, allowed roles, max exports per day | P2 |
| ADMIN-008 | Demo reset | 1. Trigger demo reset (POST `/api/demo/reset`) | All data reseeded to initial state, confirmation displayed | P1 |
| ADMIN-009 | AI provider config | 1. View AI provider settings | Provider type, model name, API key reference, active status | P2 |
| ADMIN-010 | Test AI provider | 1. Click test on AI provider | Connection test executed, success/failure result shown | P3 |

---

## 27. Module 23: PWA & Responsive Design

### Test Cases

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|----------------|----------|
| PWA-001 | PWA manifest | 1. Check `/manifest.json` in browser devtools | Valid manifest with name, icons, start_url, theme_color | P2 |
| PWA-002 | Service worker | 1. Check service worker registration in devtools | Service worker registered and active | P2 |
| PWA-003 | iOS meta tags | 1. Inspect page source | apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style meta tags present | P3 |
| PWA-004 | Add to home screen | 1. On iOS Safari, use "Add to Home Screen" | App icon appears on home screen, launches in standalone mode | P3 |
| PWA-005 | Responsive - tablet | 1. Resize browser to 768px width | Sidebar collapses, layout adjusts, all content accessible | P2 |
| PWA-006 | Responsive - mobile | 1. Resize browser to 375px width | Mobile-optimized layout, touch-friendly buttons, scrollable content | P2 |
| PWA-007 | Sidebar toggle | 1. Click sidebar toggle on mobile | Sidebar opens/closes as overlay | P2 |

---

## 28. End-to-End Workflow Scenarios

### E2E-001: Complete Visit Lifecycle (Happy Path)

**Actors:** NP (Sarah Johnson), Supervisor (Dr. Williams)
**Patient:** Dorothy Martinez

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Login as NP (sarah.np) | Dashboard loads |
| 2 | Navigate to Visits, select Dorothy Martinez's scheduled visit | Pre-visit summary loads |
| 3 | Review pre-visit summary (demographics, conditions, medications) | All patient data displayed correctly |
| 4 | Click "Start Visit" | Status changes to in_progress, intake dashboard loads |
| 5 | Complete Identity Verification (visual ID) | Identity verified, checklist updated |
| 6 | Enter Vitals: BP 130/85, HR 78, RR 16, Temp 98.4, O2 96%, Weight 175 lbs, Height 5'4" | Vitals saved, BMI calculated, checklist updated |
| 7 | Complete PHQ-2 (score < 3) | PHQ-2 complete, PHQ-9 not triggered |
| 8 | Complete PRAPARE assessment | Score computed, risk areas identified |
| 9 | Complete AWV assessment | Score computed, checklist updated |
| 10 | Complete BCS measure (if applicable) | Measure documented, evidence recorded |
| 11 | Complete Medication Reconciliation (verify all meds) | All medications verified or reconciled |
| 12 | Grant NOPP consent (verbal) | Consent recorded |
| 13 | Add care plan task (follow-up appointment) | Task created |
| 14 | Navigate to Finalize | Completeness 100%, all gating criteria met |
| 15 | Sign attestation, finalize | Visit status = ready_for_review |
| 16 | Logout, login as Supervisor (dr.williams) | Supervisor dashboard loads |
| 17 | Navigate to Review Queue | Dorothy's visit appears in queue |
| 18 | Open visit, review adjudication scorecard | Scores displayed, clinical note available |
| 19 | Approve visit | Visit status = approved, encounter locked |
| 20 | Login as Coordinator (emma.coord) | Coordination dashboard loads |
| 21 | View and manage care plan tasks from the visit | Tasks visible with correct details |

### E2E-002: Visit with HIE Data

**Patient:** Beatrice Robinson (or any scheduled visit)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Login as Admin, navigate to `/admin/fhir` | FHIR Playground loads |
| 2 | Click "HIE Simulation" tab | Tab loads with visit selector |
| 3 | Select target visit, click "Simulate HIE Ingestion" | 14 resources processed, ingestion completed |
| 4 | Login as NP, open the visit's pre-visit summary | HIE data shown: suspected conditions, ingestion log |
| 5 | Start visit, navigate to intake dashboard | Suspected conditions panel shows pending conditions |
| 6 | Confirm E11.9 (Diabetes), Dismiss N18.3 (CKD - provisional) with reason | Conditions updated accordingly |
| 7 | Navigate to Med Reconciliation | HIE medications (Lisinopril, Metformin, etc.) shown with source="external" |
| 8 | Reconcile HIE medications | Medications verified/modified |
| 9 | Complete remaining intake, finalize | Completeness reflects HIE data |
| 10 | Login as Supervisor, review visit | HIE verification badges visible |

### E2E-003: Visit with Correction Requested

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | NP completes and finalizes a visit | Visit in ready_for_review |
| 2 | Supervisor returns with reasons: "Incomplete Assessment," "Documentation Gap" | Visit status = correction_requested |
| 3 | NP opens visit, sees return reasons | Return reasons displayed with structured categories |
| 4 | NP completes missing items, re-finalizes | Visit back to ready_for_review |
| 5 | Supervisor approves | Rework count = 1, visit approved |

### E2E-004: Voice Capture Workflow

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Grant voice transcription consent | Consent recorded |
| 2 | Navigate to Voice Capture | Recording interface available |
| 3 | Record clinical notes (simulated) | Recording saved |
| 4 | Transcribe recording | Transcript generated (requires OpenAI API key) |
| 5 | Extract fields from transcript | Structured fields extracted with confidence scores |
| 6 | Review and accept/reject extracted fields | Values applied to visit record |

### E2E-005: FHIR Import New Patients

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Login as Admin, navigate to FHIR Playground | Playground loads |
| 2 | Load sample import bundle (5 patients) | Bundle JSON displayed |
| 3 | Click Import | 5 new patients created with visits |
| 4 | Navigate to Visits | New patient visits appear in list |
| 5 | Open a new patient's visit | All imported data displayed correctly |

---

## 29. API Test Cases

### Authentication

| ID | Method | Endpoint | Payload | Expected Status | Expected Response |
|----|--------|----------|---------|----------------|-------------------|
| API-001 | POST | `/api/auth/login` | `{"username":"sarah.np","password":"password"}` | 200 | User object with role="np" |
| API-002 | POST | `/api/auth/login` | `{"username":"bad","password":"bad"}` | 401 | Error message |

### Dashboard

| ID | Method | Endpoint | Expected Status | Notes |
|----|--------|----------|----------------|-------|
| API-003 | GET | `/api/dashboard/np` | 200 | NP dashboard data |
| API-004 | GET | `/api/dashboard/supervisor` | 200 | Supervisor metrics |
| API-005 | GET | `/api/dashboard/coordinator` | 200 | Coordinator tasks |

### Visits

| ID | Method | Endpoint | Expected Status | Notes |
|----|--------|----------|----------------|-------|
| API-006 | GET | `/api/visits` | 200 | Array of visits |
| API-007 | GET | `/api/visits/:id/overview` | 200 | Visit overview with member data |
| API-008 | GET | `/api/visits/:id/completeness` | 200 | Completeness evaluation |
| API-009 | GET | `/api/visits/:id/tasks` | 200 | Care plan tasks |
| API-010 | GET | `/api/visits/:id/consents` | 200 | Visit consents |
| API-011 | GET | `/api/visits/:id/codes` | 200 | Auto-generated codes |
| API-012 | GET | `/api/visits/:id/overrides` | 200 | Validation overrides |
| API-013 | GET | `/api/visits/:id/recommendations` | 200 | CDS recommendations |
| API-014 | GET | `/api/visits/:id/alerts` | 200 | Visit alerts |
| API-015 | GET | `/api/visits/:id/note` | 200 | Clinical note |
| API-016 | GET | `/api/visits/:id/sign-offs` | 200 | Review sign-offs |
| API-017 | GET | `/api/visits/:id/suspected-conditions` | 200 | Suspected conditions from HIE |
| API-018 | GET | `/api/visits/:id/previsit-summary` | 200 | Pre-visit summary with HIE data |
| API-019 | GET | `/api/visits/:id/adjudication-summary` | 200 | Adjudication scorecard |

### Clinical Data Entry

| ID | Method | Endpoint | Payload | Expected Status |
|----|--------|----------|---------|----------------|
| API-020 | POST | `/api/visits/:id/verify-identity` | `{"method":"visual_id"}` | 200 |
| API-021 | POST | `/api/visits/:id/vitals` | Valid vitals JSON | 200 |
| API-022 | POST | `/api/visits/:id/assessments` | Assessment responses | 200 |
| API-023 | POST | `/api/visits/:id/measures` | Measure result | 200 |
| API-024 | POST | `/api/visits/:id/consents` | Consent record | 200 |
| API-025 | POST | `/api/visits/:id/finalize` | Attestation | 200 or 400 (gating) |
| API-026 | POST | `/api/visits/:id/review` | Decision + comments | 200 |
| API-027 | POST | `/api/visits/:id/export` | - | 200 |

### Med Reconciliation

| ID | Method | Endpoint | Expected Status | Notes |
|----|--------|----------|----------------|-------|
| API-028 | GET | `/api/visits/:id/med-reconciliation` | 200 | Med list with interactions |
| API-029 | POST | `/api/visits/:id/med-reconciliation` | 200 | Add/update medication |

### Admin

| ID | Method | Endpoint | Expected Status | Notes |
|----|--------|----------|----------------|-------|
| API-030 | GET | `/api/admin/plan-packs` | 200 | Plan packs list |
| API-031 | GET | `/api/admin/assessment-definitions` | 200 | Assessment instruments |
| API-032 | GET | `/api/admin/measure-definitions` | 200 | HEDIS measures |
| API-033 | GET | `/api/admin/members` | 200 | All members |
| API-034 | GET | `/api/clinical-rules` | 200 | CDS rules |
| API-035 | GET | `/api/diagnosis-rules` | 200 | Diagnosis validation rules |
| API-036 | POST | `/api/demo/reset` | 200 | Database reseeded |

---

## 30. Defect Severity Definitions

| Severity | Definition | Example | Response Time |
|----------|-----------|---------|---------------|
| **P1 - Critical** | Application crash, data loss, security breach, complete feature failure | Cannot login, vitals not saving, finalization crashes | Immediate fix required |
| **P2 - Major** | Feature partially broken, significant workflow impact, incorrect calculations | Assessment score calculated wrong, gating allows incomplete visit | Fix within 24 hours |
| **P3 - Minor** | UI cosmetic issues, minor functionality gaps, edge case failures | Badge color wrong, tooltip missing, sort order off | Fix in next sprint |
| **P4 - Trivial** | Typos, minor alignment issues, nice-to-have improvements | Text alignment, icon inconsistency | Backlog |

---

## Appendix A: Visit Status Flow

```
scheduled
    |
    v
in_progress
    |
    v
ready_for_review -----> correction_requested
    |                         |
    v                         v
approved              (NP corrects, re-finalizes)
    |                         |
    v                         v
finalized             ready_for_review (again)
    |
    v
export_generated
    |
    v
synced / emr_submitted
```

## Appendix B: Assessment Scoring Reference

| Instrument | Score Range | Interpretation |
|------------|-----------|----------------|
| PHQ-2 | 0-6 | >= 3 triggers PHQ-9 |
| PHQ-9 | 0-27 | 0-4 None, 5-9 Mild, 10-14 Moderate, 15-19 Moderately Severe, 20-27 Severe |
| PRAPARE | Variable | Risk areas identified per domain |
| AWV | Variable | Wellness status assessed |

## Appendix C: FHIR R4 Resource Types in Comprehensive Bundle

1. Patient
2. Encounter
3. Observation (vitals, labs, assessment scores)
4. Condition (diagnoses)
5. MedicationStatement
6. Procedure
7. Consent
8. CarePlan
9. DocumentReference (clinical note)
10. QuestionnaireResponse (assessments)
11. Provenance

## Appendix D: HIE Demo Bundle Resources

| Resource Type | Count | Examples |
|--------------|-------|---------|
| MedicationStatement | 5 | Lisinopril 10mg, Metformin 500mg, Atorvastatin 20mg, Amlodipine 5mg, Omeprazole 20mg |
| Condition | 4 | E11.9 Diabetes, I10 Hypertension, N18.3 CKD Stage 3, E66.01 Morbid Obesity |
| Observation | 3 | HbA1c 7.8%, Creatinine 1.8 mg/dL, BP 148/92 mmHg |
| Procedure | 2 | G0439 Annual Wellness Visit, 92014 Diabetic Eye Exam |

## Appendix E: Role-Based Access Matrix

| Feature | NP | Supervisor | Coordinator | Admin | Compliance |
|---------|----|-----------:|:-----------:|:-----:|:----------:|
| Dashboard | Own visits | Review metrics | Task metrics | System stats | Audit stats |
| Visit List | Assigned visits | Review queue | Task-linked | All | Audit-linked |
| Intake / Assessments | Full access | Read-only (review) | No | No | Audit read |
| Finalization | Sign & submit | No | No | No | No |
| Review / Sign-off | No | Full access | No | No | No |
| Care Coordination | Create tasks | View | Full access | View | View |
| FHIR Playground | No | No | No | Full access | No |
| Admin Console | No | No | No | Full access | Limited |
| Audit Queue | No | No | No | View | Full access |
| Demo Management | No | No | No | Full access | No |
