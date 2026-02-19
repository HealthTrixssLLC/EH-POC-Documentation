# Easy Health Clinical Platform — API Endpoint Reference

> **Version:** 1.0.0  
> **Last Updated:** 2026-02-18  
> **Audience:** Engineering teams building, integrating, and testing the Easy Health API  
> **Total Endpoints:** 128

---

## Executive Summary

Easy Health is a clinical platform that powers **in-home Nurse Practitioner (NP) visits** for Medicare Advantage and ACA health plan members. The platform manages the full lifecycle of a clinical encounter — from pre-visit intelligence gathering through HIE data, to real-time voice-assisted clinical documentation, HEDIS measure capture, assessment scoring, auto-coding (CPT/HCPCS/ICD-10), supervisor review, and FHIR R4-compliant data exchange with payer systems.

### Why This API Exists

This API serves as the backbone for:
- **NP mobile/tablet workflow** during in-home visits (vitals, assessments, medications, consent)
- **Supervisor oversight** with review queues, quality scoring, and encounter sign-off
- **Care coordination** for gap closure, task management, and alert routing
- **Compliance & audit** workflows with sampling, assignment, and outcome tracking
- **Payer integration** via FHIR R4 bundles for claims, quality reporting, and HIE pre-visit data
- **AI-assisted documentation** with voice capture, transcription, and LLM-powered field extraction

### Authentication Model

The API uses **session-based authentication** with role-based access control (RBAC).

**Authentication headers** (sent on every request after login):
```
x-user-id: usr_np_001
x-user-role: np
x-user-name: Sarah Chen, NP
```

**Roles & Hierarchy:**

| Role | Description | Admin Override |
|------|-------------|----------------|
| `admin` | Full system access, configuration, user management | Is the override |
| `supervisor` | Review queue, sign-off, quality adjudication | Admin can act as |
| `compliance` | Audit assignments, sampling, access logs, outcomes | Admin can act as |
| `np` | Clinical documentation, visit workflow, voice capture | Admin can act as |
| `care_coordinator` | Care gap management, task routing, alerts | Admin can act as |

### Base URL & Conventions

- **Base URL:** `https://<hostname>/api/`
- **Content-Type:** `application/json` for all request/response bodies
- **Date format:** ISO 8601 (`2026-02-18T14:30:00.000Z`)
- **IDs:** UUID v4 strings
- **Error shape:** `{ "message": "Human-readable error description" }`
- **Visit locking:** Finalized visits with a supervisor sign-off are locked. Any mutation attempt returns `403` with a lock message.

---

## RBAC Role-to-Endpoint Group Permissions

| Endpoint Group | Admin | Supervisor | NP | Care Coordinator | Compliance |
|---|:---:|:---:|:---:|:---:|:---:|
| Authentication & Security | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ | — |
| Visit Management | ✅ | ✅ | ✅ | ✅ | — |
| Identity & Consent | ✅ | ✅ | ✅ | — | — |
| Clinical Intake | ✅ | ✅ | ✅ | — | — |
| Assessment Engine | ✅ | ✅ | ✅ | — | — |
| HEDIS Measures | ✅ | ✅ | ✅ | — | — |
| Clinical Decision Support | ✅ | ✅ | ✅ | — | — |
| Progress Notes | ✅ | ✅ | ✅ | — | — |
| Supervisor Review | ✅ | ✅ | — | — | — |
| Care Coordination | ✅ | ✅ | ✅ | ✅ | — |
| Voice Capture & AI | ✅ | ✅ | ✅ | — | — |
| FHIR R4 Interoperability | ✅ | ✅ | ✅ | — | — |
| HIE Pre-Visit Intelligence | ✅ | ✅ | ✅ | — | — |
| Administration | ✅ | — | — | — | — |
| Compliance & Audit | ✅ | ✅ (read) | — | — | ✅ |
| Demo & Testing | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 1. Authentication & Security

### 1.1 POST /api/auth/login

**Why This Exists:** Authenticates an NP, supervisor, or admin and creates a session. Returns user profile and determines whether MFA is required before granting full access.

**Authorization:** Public (no session required)

**Request:**
```json
{
  "username": "sarah.chen",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "usr_np_001",
    "username": "sarah.chen",
    "fullName": "Sarah Chen, NP",
    "role": "np",
    "email": "sarah.chen@easyhealth.com",
    "npiNumber": "1234567890",
    "mfaEnabled": true,
    "mfaVerified": false,
    "isLocked": false,
    "credentials": "FNP-BC",
    "licenseState": "CA"
  },
  "requiresMfa": true
}
```

**Validation Rules:**
- `username`: Required, non-empty string
- `password`: Required, non-empty string

**Error Responses:**
- 401: `"Invalid credentials"` — username/password mismatch or user not found
- 403: `"Account is locked"` — account locked after failed attempts; use session unlock
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: valid credentials return user object with correct role
- [ ] Invalid password returns 401
- [ ] Locked account returns 403
- [ ] MFA-enabled user gets `requiresMfa: true`
- [ ] Audit event is created for login attempt
- [ ] HIPAA: verify login events are logged with timestamp and IP

---

### 1.2 POST /api/auth/mfa/verify

**Why This Exists:** Completes the second factor of authentication. NPs and supervisors handling PHI must verify via MFA before accessing clinical data.

**Authorization:** Session required (post-login, pre-MFA)

**Request:**
```json
{
  "userId": "usr_np_001",
  "code": "482917"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "usr_np_001",
    "username": "sarah.chen",
    "fullName": "Sarah Chen, NP",
    "role": "np",
    "mfaVerified": true
  }
}
```

**Validation Rules:**
- `userId`: Required, must match an existing user
- `code`: Required, 6-digit string, must match the stored/generated MFA code or the demo bypass code `"123456"`

**Error Responses:**
- 401: `"Invalid MFA code"` — code does not match
- 404: `"User not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: valid code sets `mfaVerified: true`
- [ ] Invalid code returns 401
- [ ] Demo bypass code `"123456"` works in demo mode
- [ ] HIPAA: MFA verification event is audit-logged

---

### 1.3 POST /api/auth/mfa/resend

**Why This Exists:** Allows users to request a new MFA code if the original expired or was not received.

**Authorization:** Session required (post-login, pre-MFA)

**Request:**
```json
{
  "userId": "usr_np_001"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "MFA code resent"
}
```

**Error Responses:**
- 404: `"User not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: resend succeeds and new code is generated
- [ ] Non-existent userId returns 404

---

### 1.4 POST /api/auth/unlock

**Why This Exists:** Unlocks an account that was locked due to repeated failed login attempts. Typically used by an admin or the user themselves after a cooldown period.

**Authorization:** Session required

**Request:**
```json
{
  "userId": "usr_np_001"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "usr_np_001",
    "isLocked": false
  }
}
```

**Error Responses:**
- 404: `"User not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: locked user becomes unlocked
- [ ] Unlock of already-unlocked user succeeds idempotently
- [ ] HIPAA: unlock event is audit-logged

---

### 1.5 GET /api/auth/security-settings/:userId

**Why This Exists:** Retrieves the current security configuration for a user, including MFA status, session timeout settings, and password policy compliance.

**Authorization:** Session required

**Request:**
- Path params: `userId` (string) — the user ID

**Response (200):**
```json
{
  "userId": "usr_np_001",
  "mfaEnabled": true,
  "sessionTimeoutMinutes": 30,
  "passwordLastChanged": "2026-01-15T10:00:00.000Z",
  "passwordExpiryDays": 90,
  "failedLoginAttempts": 0,
  "isLocked": false
}
```

**Error Responses:**
- 404: `"User not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: returns security settings for valid user
- [ ] Non-existent user returns 404

---

### 1.6 PUT /api/auth/security-settings/:userId

**Why This Exists:** Updates security settings for a user (e.g., enabling MFA, changing session timeout). Used by admins managing compliance requirements.

**Authorization:** Session required

**Request:**
- Path params: `userId` (string)
```json
{
  "mfaEnabled": true,
  "sessionTimeoutMinutes": 15
}
```

**Response (200):**
```json
{
  "userId": "usr_np_001",
  "mfaEnabled": true,
  "sessionTimeoutMinutes": 15,
  "updatedAt": "2026-02-18T14:30:00.000Z"
}
```

**Error Responses:**
- 404: `"User not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: settings are updated and persisted
- [ ] Audit event is created for security settings change
- [ ] HIPAA: verify settings changes are audit-logged

---

### 1.7 GET /api/users

**Why This Exists:** Returns all platform users. Used by admin dashboards for user management and by supervisor views to see available NPs.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "usr_np_001",
    "username": "sarah.chen",
    "fullName": "Sarah Chen, NP",
    "role": "np",
    "email": "sarah.chen@easyhealth.com",
    "npiNumber": "1234567890",
    "credentials": "FNP-BC",
    "licenseState": "CA",
    "isActive": true
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns array of all users
- [ ] Users include role, NPI, credentials fields

---

### 1.8 GET /api/users/:id

**Why This Exists:** Retrieves a specific user profile. Used to display NP credentials on clinical notes and for user profile views.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — user ID

**Response (200):**
```json
{
  "id": "usr_np_001",
  "username": "sarah.chen",
  "fullName": "Sarah Chen, NP",
  "role": "np",
  "email": "sarah.chen@easyhealth.com",
  "npiNumber": "1234567890",
  "credentials": "FNP-BC",
  "licenseState": "CA"
}
```

**Error Responses:**
- 404: `"User not found"`

**Testing Checklist:**
- [ ] Happy path: returns user by ID
- [ ] Non-existent ID returns 404

---

## 2. Dashboard

### 2.1 GET /api/dashboard/np

**Why This Exists:** Provides the NP's daily view: today's visits, pending tasks, quality metrics, and care gap alerts. This is the home screen after login for NP users.

**Authorization:** Session required | Role: NP, Admin

**Response (200):**
```json
{
  "todayVisits": [
    {
      "id": "visit_001",
      "memberId": "mbr_001",
      "memberName": "Margaret Thompson",
      "scheduledDate": "2026-02-18",
      "scheduledTime": "09:00",
      "status": "scheduled",
      "visitType": "AWV",
      "address": "1234 Oak Street, Sacramento, CA 95814"
    }
  ],
  "pendingCount": 3,
  "completedToday": 2,
  "careGapAlerts": 5,
  "qualityMetrics": {
    "assessmentCompletionRate": 0.94,
    "hedisComplianceRate": 0.87,
    "avgVisitDuration": 45
  }
}
```

**Testing Checklist:**
- [ ] Happy path: returns dashboard data for current NP
- [ ] Visits are filtered to today's date
- [ ] Quality metrics are calculated from actual visit data

---

### 2.2 GET /api/dashboard/supervisor

**Why This Exists:** Shows the supervisor's oversight view: visits pending review, NP productivity metrics, quality flags, and rework rates.

**Authorization:** Session required | Role: Supervisor, Admin

**Response (200):**
```json
{
  "pendingReviews": 12,
  "approvedToday": 5,
  "returnedForRework": 2,
  "npProductivity": [
    {
      "npId": "usr_np_001",
      "npName": "Sarah Chen, NP",
      "visitsCompleted": 8,
      "avgQualityScore": 92,
      "pendingReview": 3
    }
  ],
  "qualityFlags": [
    {
      "visitId": "visit_003",
      "flag": "Missing depression screening",
      "severity": "warning"
    }
  ]
}
```

**Testing Checklist:**
- [ ] Happy path: returns supervisor metrics
- [ ] NP productivity reflects actual visit data
- [ ] Quality flags are generated from completeness rules

---

### 2.3 GET /api/dashboard/coordinator

**Why This Exists:** Displays the care coordinator's view: open care gaps, pending tasks, member outreach queue, and alert summaries.

**Authorization:** Session required | Role: Care Coordinator, Admin

**Response (200):**
```json
{
  "openCareGaps": 23,
  "pendingTasks": 8,
  "memberOutreachQueue": [
    {
      "memberId": "mbr_002",
      "memberName": "Robert Williams",
      "reason": "Missed AWV appointment",
      "priority": "high",
      "lastContact": "2026-02-10T14:00:00.000Z"
    }
  ],
  "alertSummary": {
    "critical": 2,
    "warning": 5,
    "informational": 12
  }
}
```

**Testing Checklist:**
- [ ] Happy path: returns coordinator dashboard
- [ ] Care gaps reflect current member data
- [ ] Tasks include priority and assignment info

---

## 3. Visit Management

### 3.1 GET /api/visits

**Why This Exists:** Returns all visits across the system. Used by dashboards, review queues, and reporting. Supports filtering by status, date, and NP assignment.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "visit_001",
    "memberId": "mbr_001",
    "scheduledDate": "2026-02-18",
    "scheduledTime": "09:00",
    "status": "scheduled",
    "visitType": "AWV",
    "npId": "usr_np_001",
    "npName": "Sarah Chen, NP",
    "planId": "plan_ma_001",
    "createdAt": "2026-02-15T10:00:00.000Z"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns array of all visits
- [ ] Visits include member and NP associations
- [ ] Status values are valid enum entries

---

### 3.2 GET /api/visits/:id

**Why This Exists:** Retrieves complete details for a single visit. This is the primary data load when an NP opens a visit in the clinical workflow.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "id": "visit_001",
  "memberId": "mbr_001",
  "scheduledDate": "2026-02-18",
  "scheduledTime": "09:00",
  "status": "in_progress",
  "visitType": "AWV",
  "npId": "usr_np_001",
  "npName": "Sarah Chen, NP",
  "planId": "plan_ma_001",
  "chiefComplaint": "Annual wellness visit",
  "startedAt": "2026-02-18T09:05:00.000Z",
  "completedAt": null,
  "address": "1234 Oak Street, Sacramento, CA 95814",
  "notes": null
}
```

**Error Responses:**
- 404: `"Visit not found"`

**Testing Checklist:**
- [ ] Happy path: returns complete visit object
- [ ] Non-existent visit returns 404

---

### 3.3 POST /api/visits

**Why This Exists:** Creates a new visit record. Used when scheduling an in-home NP visit for a member, typically by a care coordinator or admin.

**Authorization:** Session required | Any authenticated user

**Request:**
```json
{
  "memberId": "mbr_001",
  "scheduledDate": "2026-02-20",
  "scheduledTime": "10:00",
  "visitType": "AWV",
  "npId": "usr_np_001",
  "npName": "Sarah Chen, NP",
  "planId": "plan_ma_001",
  "address": "1234 Oak Street, Sacramento, CA 95814"
}
```

**Response (200):**
```json
{
  "id": "visit_new_001",
  "memberId": "mbr_001",
  "scheduledDate": "2026-02-20",
  "status": "scheduled",
  "visitType": "AWV",
  "createdAt": "2026-02-18T14:30:00.000Z"
}
```

**Validation Rules:**
- `memberId`: Required, must reference an existing member
- `scheduledDate`: Required, ISO date string
- `visitType`: Required, one of `["AWV", "IHE", "SNP", "ACA_HRA"]`

**Error Responses:**
- 400: Validation failure (missing required fields)
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates visit with status `"scheduled"`
- [ ] Missing memberId returns 400
- [ ] Created visit appears in GET /api/visits
- [ ] HIPAA: visit creation is audit-logged

---

### 3.4 PATCH /api/visits/:id

**Why This Exists:** Updates visit fields during the clinical workflow — status transitions (scheduled → in_progress → completed → finalized), chief complaint, notes, and completion timestamps.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "status": "in_progress",
  "startedAt": "2026-02-18T09:05:00.000Z",
  "chiefComplaint": "Annual wellness visit, patient reports knee pain"
}
```

**Response (200):**
```json
{
  "id": "visit_001",
  "status": "in_progress",
  "startedAt": "2026-02-18T09:05:00.000Z",
  "chiefComplaint": "Annual wellness visit, patient reports knee pain"
}
```

**Validation Rules:**
- Visit must not be locked (finalized with supervisor sign-off)
- `status`: Must be one of `["scheduled", "in_progress", "completed", "finalized", "cancelled"]`

**Error Responses:**
- 403: `"Visit is locked after supervisor sign-off"` — visit has been signed off and cannot be modified
- 404: `"Visit not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: updates status from scheduled to in_progress
- [ ] Locked visit returns 403
- [ ] Non-existent visit returns 404
- [ ] Status transitions follow valid workflow

---

### 3.5 GET /api/visits/:id/overview

**Why This Exists:** Returns a comprehensive summary of all clinical data captured for a visit — vitals, assessments, measures, medications, codes, notes, and consent status. Used by the visit summary panel and progress note generation.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "visit": {
    "id": "visit_001",
    "status": "in_progress",
    "visitType": "AWV",
    "scheduledDate": "2026-02-18"
  },
  "member": {
    "id": "mbr_001",
    "firstName": "Margaret",
    "lastName": "Thompson",
    "dateOfBirth": "1948-03-15",
    "memberId": "MA-2026-001"
  },
  "vitals": {
    "systolicBp": 138,
    "diastolicBp": 82,
    "heartRate": 72,
    "temperature": 98.6,
    "respiratoryRate": 16,
    "oxygenSaturation": 97,
    "weight": 165,
    "height": 64,
    "bmi": 28.3
  },
  "assessments": [
    {
      "instrumentId": "phq2",
      "instrumentName": "PHQ-2 Depression Screening",
      "status": "complete",
      "score": 2,
      "severity": "minimal"
    }
  ],
  "measures": [
    {
      "measureId": "COL",
      "measureName": "Colorectal Cancer Screening",
      "status": "met",
      "result": "Colonoscopy completed 2024"
    }
  ],
  "medications": [
    {
      "medicationName": "Lisinopril 10mg",
      "status": "verified",
      "source": "hie_import"
    }
  ],
  "codes": [
    {
      "code": "G0438",
      "codeType": "CPT",
      "description": "Initial AWV including PPPS"
    }
  ],
  "consents": [],
  "notes": null,
  "identityVerification": null,
  "requiredChecklists": [],
  "carePlanTasks": [],
  "exclusions": []
}
```

**Error Responses:**
- 404: `"Visit not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: returns aggregated visit data
- [ ] All sub-sections are populated when data exists
- [ ] Empty sections return empty arrays/null (not omitted)
- [ ] Member demographics are included

---

### 3.6 GET /api/visits/:id/bundle

**Why This Exists:** Generates a complete data bundle for a visit including all clinical artifacts. Used for export, review preparation, and FHIR bundle generation.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "visit": { "id": "visit_001", "status": "in_progress" },
  "member": { "id": "mbr_001", "firstName": "Margaret", "lastName": "Thompson" },
  "vitals": { "systolicBp": 138, "diastolicBp": 82 },
  "assessmentResponses": [],
  "measureResults": [],
  "codes": [],
  "clinicalNotes": [],
  "recommendations": [],
  "overrides": [],
  "reviewDecisions": [],
  "signOffs": [],
  "medReconciliation": [],
  "requiredChecklists": [],
  "carePlanTasks": [],
  "exclusions": [],
  "recordings": [],
  "transcripts": [],
  "extractedFields": [],
  "alerts": [],
  "noteEdits": [],
  "noteSignatures": []
}
```

**Error Responses:**
- 404: `"Visit not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: returns all 18 data sections
- [ ] Bundle reflects current state of all clinical data
- [ ] No data is omitted even when empty

---

### 3.7 POST /api/visits/:id/finalize

**Why This Exists:** Executes finalization gating logic for a visit. Checks whether all required clinical elements are complete before allowing the NP to submit for supervisor review. Returns a detailed gate status with pass/fail for each requirement.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "visitId": "visit_001",
  "canFinalize": false,
  "gates": [
    {
      "gate": "vitals_complete",
      "label": "Vitals Documented",
      "passed": true,
      "details": "All required vitals recorded"
    },
    {
      "gate": "assessments_complete",
      "label": "Required Assessments Complete",
      "passed": true,
      "details": "2/2 assessments completed"
    },
    {
      "gate": "measures_evaluated",
      "label": "HEDIS Measures Evaluated",
      "passed": false,
      "details": "1 of 3 measures not yet evaluated"
    },
    {
      "gate": "identity_verified",
      "label": "Member Identity Verified",
      "passed": true,
      "details": "Photo ID verified"
    },
    {
      "gate": "consent_obtained",
      "label": "Consent Obtained",
      "passed": true,
      "details": "Visit consent signed"
    },
    {
      "gate": "medications_reconciled",
      "label": "Medication Reconciliation",
      "passed": false,
      "details": "2 medications in 'new' status require verification"
    },
    {
      "gate": "required_checklists",
      "label": "Required Checklists Complete",
      "passed": true,
      "details": "All checklist items addressed"
    }
  ],
  "autoGeneratedCodes": [
    {
      "code": "G0438",
      "codeType": "CPT",
      "description": "Initial AWV including PPPS"
    }
  ]
}
```

**Finalization Gating Rules:**
1. **vitals_complete** — Vitals record must exist for the visit
2. **assessments_complete** — All required assessments for the visit type must have `status: "complete"`
3. **measures_evaluated** — All HEDIS measures assigned to the visit must have results
4. **identity_verified** — Identity verification record must exist
5. **consent_obtained** — At least one consent record must exist
6. **medications_reconciled** — No medication reconciliation entries may remain in `"new"` status (all must be `"verified"`, `"discontinued"`, or `"modified"`)
7. **required_checklists** — All required checklist items must be complete

**Auto-Coding Logic (triggered on finalize):**
- Visit type `AWV` → CPT `G0438` (initial) or `G0439` (subsequent)
- Visit type `IHE` → CPT `99345` (new) or `99350` (established)
- PHQ-2/PHQ-9 completed → CPT `96127` (screening instrument)
- Vitals with BMI > 30 → ICD-10 `E66.9` (Obesity, unspecified)
- Vitals with systolic > 140 or diastolic > 90 → ICD-10 `I10` (Essential hypertension)
- PRAPARE with social risk factors → ICD-10 `Z59.7` (Insufficient social insurance/welfare support)
- HbA1c measure met → ICD-10 `E11.9` (Type 2 diabetes mellitus)
- Depression screening score ≥ 3 on PHQ-2 → ICD-10 `F32.9` (Major depressive disorder)

**Error Responses:**
- 404: `"Visit not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: all gates pass, `canFinalize: true`
- [ ] Missing vitals: `vitals_complete` gate fails
- [ ] Unverified medications: `medications_reconciled` gate fails
- [ ] Auto-generated codes include CPT for visit type
- [ ] BMI > 30 generates E66.9 auto-code
- [ ] HIPAA: finalization attempt is audit-logged

---

### 3.8 GET /api/members

**Why This Exists:** Returns all members (patients) in the system. Used by scheduling, care coordination, and member lookup screens.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "mbr_001",
    "memberId": "MA-2026-001",
    "firstName": "Margaret",
    "lastName": "Thompson",
    "dateOfBirth": "1948-03-15",
    "gender": "female",
    "planId": "plan_ma_001",
    "planName": "Medicare Advantage Gold",
    "phone": "916-555-0142",
    "email": "margaret.thompson@email.com",
    "address": "1234 Oak Street, Sacramento, CA 95814",
    "pcp": "Dr. James Wilson",
    "riskScore": 1.45,
    "lineOfBusiness": "MA"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all members with demographics
- [ ] Members include plan and risk score information

---

### 3.9 GET /api/members/:id

**Why This Exists:** Retrieves a specific member's demographics and plan information. Loaded when an NP begins a visit to display patient context.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — member ID

**Response (200):**
```json
{
  "id": "mbr_001",
  "memberId": "MA-2026-001",
  "firstName": "Margaret",
  "lastName": "Thompson",
  "dateOfBirth": "1948-03-15",
  "gender": "female",
  "planId": "plan_ma_001",
  "planName": "Medicare Advantage Gold",
  "phone": "916-555-0142",
  "address": "1234 Oak Street, Sacramento, CA 95814",
  "pcp": "Dr. James Wilson",
  "riskScore": 1.45
}
```

**Error Responses:**
- 404: `"Member not found"`

**Testing Checklist:**
- [ ] Happy path: returns member by ID
- [ ] Non-existent member returns 404

---

### 3.10 GET /api/members/:memberId/visits

**Why This Exists:** Retrieves all visits for a specific member. Used in member history views and for longitudinal care tracking.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — the member's internal ID

**Response (200):**
```json
[
  {
    "id": "visit_001",
    "scheduledDate": "2026-02-18",
    "status": "in_progress",
    "visitType": "AWV",
    "npName": "Sarah Chen, NP"
  },
  {
    "id": "visit_prev_001",
    "scheduledDate": "2025-02-15",
    "status": "finalized",
    "visitType": "AWV",
    "npName": "Sarah Chen, NP"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all visits for member
- [ ] Returns empty array for member with no visits

---

## 4. Identity & Consent

### 4.1 GET /api/visits/:id/identity-verification

**Why This Exists:** Retrieves the identity verification record for a visit. NPs must verify member identity (photo ID) before beginning clinical documentation to comply with CMS requirements.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "id": "idv_001",
  "visitId": "visit_001",
  "verificationType": "photo_id",
  "verifiedBy": "usr_np_001",
  "verifiedByName": "Sarah Chen, NP",
  "verifiedAt": "2026-02-18T09:10:00.000Z",
  "idType": "drivers_license",
  "idLastFour": "5678",
  "matchConfidence": "high",
  "notes": "ID matches member, photo confirmed"
}
```

**Error Responses:**
- 404: Returns `null` if no verification exists yet
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: returns verification for verified visit
- [ ] Unverified visit returns null
- [ ] Verification record includes verifier identity

---

### 4.2 POST /api/visits/:id/identity-verification

**Why This Exists:** Records that the NP has verified the member's identity using a government-issued photo ID. This is a finalization gate requirement.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "verificationType": "photo_id",
  "verifiedBy": "usr_np_001",
  "verifiedByName": "Sarah Chen, NP",
  "idType": "drivers_license",
  "idLastFour": "5678",
  "matchConfidence": "high",
  "notes": "California DL verified, photo matches member"
}
```

**Response (200):**
```json
{
  "id": "idv_001",
  "visitId": "visit_001",
  "verificationType": "photo_id",
  "verifiedAt": "2026-02-18T09:10:00.000Z"
}
```

**Validation Rules:**
- Visit must not be locked
- `verificationType`: Required
- `verifiedBy`: Required

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates identity verification record
- [ ] Locked visit returns 403
- [ ] Finalization gate now passes for identity
- [ ] HIPAA: verification event is audit-logged

---

### 4.3 GET /api/visits/:id/consents

**Why This Exists:** Retrieves all consent records for a visit. Members must consent to treatment, data sharing, and/or telehealth before clinical services begin.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "consent_001",
    "visitId": "visit_001",
    "consentType": "treatment",
    "status": "obtained",
    "obtainedBy": "usr_np_001",
    "obtainedByName": "Sarah Chen, NP",
    "obtainedAt": "2026-02-18T09:12:00.000Z",
    "memberSignature": true,
    "witnessName": "Sarah Chen, NP"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns consent records for visit
- [ ] Returns empty array when no consents exist

---

### 4.4 POST /api/visits/:id/consents

**Why This Exists:** Records a consent obtained from the member. Required before clinical documentation begins and is a finalization gate.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "consentType": "treatment",
  "status": "obtained",
  "obtainedBy": "usr_np_001",
  "obtainedByName": "Sarah Chen, NP",
  "memberSignature": true,
  "witnessName": "Sarah Chen, NP",
  "notes": "Member verbally consented, signature captured on tablet"
}
```

**Response (200):**
```json
{
  "id": "consent_001",
  "visitId": "visit_001",
  "consentType": "treatment",
  "status": "obtained",
  "obtainedAt": "2026-02-18T09:12:00.000Z"
}
```

**Validation Rules:**
- Visit must not be locked
- `consentType`: Required, one of `["treatment", "data_sharing", "telehealth", "hipaa_notice"]`
- `status`: Required, one of `["obtained", "refused", "unable"]`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates consent record
- [ ] Locked visit returns 403
- [ ] Refused consent records member's refusal
- [ ] Finalization gate now passes for consent
- [ ] HIPAA: consent event is audit-logged

---

## 5. Clinical Intake

### 5.1 GET /api/visits/:id/vitals

**Why This Exists:** Retrieves the vitals record for a visit. Vitals are a core clinical requirement and feed into auto-coding logic (e.g., hypertension, obesity).

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "id": "vit_001",
  "visitId": "visit_001",
  "systolicBp": 138,
  "diastolicBp": 82,
  "heartRate": 72,
  "temperature": 98.6,
  "respiratoryRate": 16,
  "oxygenSaturation": 97,
  "weight": 165,
  "height": 64,
  "bmi": 28.3,
  "painLevel": 3,
  "recordedAt": "2026-02-18T09:15:00.000Z",
  "recordedBy": "usr_np_001",
  "voiceInferredFields": ["systolicBp", "diastolicBp", "heartRate"]
}
```

**FHIR Mapping:** Maps to FHIR R4 `Observation` resources — one per vital sign with appropriate LOINC codes. See `docs/fhir-api-reference.md` for detailed mappings.

**Error Responses:**
- Returns `null` if no vitals have been recorded yet
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: returns vitals for visit with recorded data
- [ ] Returns null for visit without vitals
- [ ] BMI is calculated from weight/height
- [ ] voiceInferredFields tracks AI-populated values

---

### 5.2 POST /api/visits/:id/vitals

**Why This Exists:** Records vital signs during the clinical visit. Vitals drive auto-coding (hypertension if BP > 140/90, obesity if BMI > 30) and are required for finalization.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "systolicBp": 142,
  "diastolicBp": 88,
  "heartRate": 76,
  "temperature": 98.4,
  "respiratoryRate": 18,
  "oxygenSaturation": 96,
  "weight": 185,
  "height": 66,
  "painLevel": 2,
  "recordedBy": "usr_np_001"
}
```

**Response (200):**
```json
{
  "id": "vit_001",
  "visitId": "visit_001",
  "systolicBp": 142,
  "diastolicBp": 88,
  "bmi": 29.9,
  "recordedAt": "2026-02-18T09:15:00.000Z"
}
```

**Validation Rules:**
- Visit must not be locked
- `systolicBp`: Integer, typically 70–250
- `diastolicBp`: Integer, typically 40–150
- `heartRate`: Integer, typically 40–200
- `temperature`: Float, typically 95.0–105.0
- `oxygenSaturation`: Integer, typically 70–100
- `weight`: Float (lbs)
- `height`: Float (inches)
- BMI is auto-calculated: `(weight / (height * height)) * 703`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**FHIR Mapping:** Maps to FHIR R4 `Observation` — see `docs/fhir-api-reference.md`

**Testing Checklist:**
- [ ] Happy path: creates vitals record with auto-calculated BMI
- [ ] Locked visit returns 403
- [ ] BMI calculation is correct
- [ ] Vitals appear in visit overview

---

### 5.3 PUT /api/visits/:id/vitals

**Why This Exists:** Updates existing vitals during the visit (e.g., re-check blood pressure after rest period). Preserves the vitals record ID.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "systolicBp": 132,
  "diastolicBp": 80,
  "notes": "Re-checked after 5 minutes rest"
}
```

**Response (200):** Updated vitals record.

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: updates existing vitals
- [ ] Locked visit returns 403
- [ ] BMI recalculated if weight/height changed

---

### 5.4 GET /api/visits/:id/vitals/validate

**Why This Exists:** Validates recorded vitals against clinical rules and returns warnings for out-of-range values. Alerts the NP to potentially erroneous readings or clinically significant findings.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "valid": false,
  "warnings": [
    {
      "field": "systolicBp",
      "value": 182,
      "message": "Systolic BP is critically elevated (>180 mmHg)",
      "severity": "critical",
      "clinicalRule": "hypertensive_crisis"
    },
    {
      "field": "oxygenSaturation",
      "value": 89,
      "message": "Oxygen saturation below 90% - immediate attention required",
      "severity": "critical",
      "clinicalRule": "hypoxemia"
    }
  ],
  "autoCodeSuggestions": [
    {
      "code": "I10",
      "codeType": "ICD-10",
      "description": "Essential (primary) hypertension",
      "reason": "Systolic BP > 140 mmHg"
    }
  ]
}
```

**Testing Checklist:**
- [ ] Happy path: returns validation with no warnings for normal vitals
- [ ] High BP triggers hypertension warning
- [ ] Low O2 sat triggers hypoxemia warning
- [ ] Auto-code suggestions generated for abnormal values

---

### 5.5 GET /api/visits/:id/med-reconciliation

**Why This Exists:** Retrieves medication reconciliation entries for a visit. Medications may come from HIE pre-visit data, voice capture, or manual NP entry. All medications must be reconciled (verified/discontinued/modified) before finalization.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "med_001",
    "visitId": "visit_001",
    "medicationName": "Lisinopril 10mg",
    "dosage": "10mg daily",
    "frequency": "once daily",
    "route": "oral",
    "status": "verified",
    "source": "hie_import",
    "prescriber": "Dr. James Wilson",
    "startDate": "2024-06-15",
    "verifiedBy": "usr_np_001",
    "verifiedAt": "2026-02-18T09:20:00.000Z",
    "notes": "Patient confirms taking as prescribed"
  },
  {
    "id": "med_002",
    "visitId": "visit_001",
    "medicationName": "Metformin 500mg",
    "dosage": "500mg twice daily",
    "frequency": "twice daily",
    "route": "oral",
    "status": "new",
    "source": "voice_capture",
    "notes": null
  }
]
```

**FHIR Mapping:** Maps to FHIR R4 `MedicationStatement` — see `docs/fhir-api-reference.md`

**Testing Checklist:**
- [ ] Happy path: returns all medications for visit
- [ ] Includes medications from multiple sources (HIE, voice, manual)
- [ ] Status reflects reconciliation state

---

### 5.6 POST /api/visits/:id/med-reconciliation

**Why This Exists:** Adds a medication to the reconciliation list. NPs add medications reported by the member or discovered during the visit that weren't in the HIE pre-visit data.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "medicationName": "Atorvastatin 20mg",
  "dosage": "20mg daily",
  "frequency": "once daily at bedtime",
  "route": "oral",
  "status": "new",
  "source": "patient_reported",
  "prescriber": "Dr. James Wilson",
  "startDate": "2025-08-01"
}
```

**Response (200):**
```json
{
  "id": "med_003",
  "visitId": "visit_001",
  "medicationName": "Atorvastatin 20mg",
  "status": "new",
  "createdAt": "2026-02-18T09:22:00.000Z"
}
```

**Validation Rules:**
- Visit must not be locked
- `medicationName`: Required
- `status`: One of `["new", "verified", "discontinued", "modified"]`
- `source`: One of `["patient_reported", "hie_import", "voice_capture", "manual"]`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates medication entry
- [ ] Locked visit returns 403
- [ ] New medications require verification before finalization

---

### 5.7 PATCH /api/med-reconciliation/:id

**Why This Exists:** Updates a medication reconciliation entry — primarily used to change status from `"new"` to `"verified"`, `"discontinued"`, or `"modified"` during the reconciliation process.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — med reconciliation entry ID
```json
{
  "status": "verified",
  "verifiedBy": "usr_np_001",
  "verifiedAt": "2026-02-18T09:25:00.000Z",
  "notes": "Patient confirms current use, no side effects"
}
```

**Response (200):** Updated medication reconciliation entry.

**Error Responses:**
- 404: `"Medication not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: updates status to verified
- [ ] Non-existent medication returns 404
- [ ] Discontinued medication records reason

---

### 5.8 GET /api/visits/:id/required-checklists

**Why This Exists:** Retrieves required checklist items for a visit, driven by plan pack configuration. These are compliance-required documentation items that must be completed for finalization.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "chk_001",
    "visitId": "visit_001",
    "itemName": "Fall Risk Assessment",
    "category": "safety",
    "isRequired": true,
    "isCompleted": true,
    "completedAt": "2026-02-18T09:30:00.000Z",
    "completedBy": "usr_np_001"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all checklist items
- [ ] Incomplete items block finalization

---

### 5.9 POST /api/visits/:id/required-checklists

**Why This Exists:** Creates a required checklist item for a visit. Typically auto-generated from plan pack configuration but can be added manually.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "itemName": "Home Safety Assessment",
  "category": "safety",
  "isRequired": true
}
```

**Response (200):** Created checklist item.

**Error Responses:**
- 403: Visit is locked
- 500: Server error

---

### 5.10 PATCH /api/required-checklists/:id

**Why This Exists:** Updates a checklist item, primarily to mark it as completed.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — checklist item ID
```json
{
  "isCompleted": true,
  "completedBy": "usr_np_001",
  "completedAt": "2026-02-18T09:30:00.000Z"
}
```

**Response (200):** Updated checklist item.

**Error Responses:**
- 404: `"Checklist item not found"`
- 500: Server error

---

### 5.11 GET /api/visits/:id/care-plan-tasks

**Why This Exists:** Retrieves care plan tasks generated for a visit. Care plans are created based on clinical findings and include follow-up actions, referrals, and education items.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "cpt_001",
    "visitId": "visit_001",
    "taskType": "referral",
    "description": "Refer to ophthalmology for diabetic retinopathy screening",
    "priority": "high",
    "status": "pending",
    "assignedTo": "Dr. James Wilson",
    "dueDate": "2026-03-18"
  }
]
```

---

### 5.12 POST /api/visits/:id/care-plan-tasks

**Why This Exists:** Creates a care plan task based on clinical findings during the visit.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "taskType": "referral",
  "description": "Refer to podiatry for diabetic foot exam",
  "priority": "medium",
  "status": "pending",
  "assignedTo": "PCP - Dr. James Wilson",
  "dueDate": "2026-04-01"
}
```

**Error Responses:**
- 403: Visit is locked
- 500: Server error

---

### 5.13 PATCH /api/care-plan-tasks/:id

**Why This Exists:** Updates a care plan task status or details.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — task ID
```json
{
  "status": "completed",
  "completedAt": "2026-02-20T10:00:00.000Z"
}
```

**Error Responses:**
- 404: `"Task not found"`
- 500: Server error

---

### 5.14 GET /api/visits/:id/exclusions

**Why This Exists:** Retrieves objective exclusions for a visit. When a member cannot complete a measure or assessment for a valid clinical reason, the NP documents an exclusion rather than leaving it incomplete.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "exc_001",
    "visitId": "visit_001",
    "objectiveType": "measure",
    "objectiveId": "BCS",
    "reason": "Male patient - breast cancer screening not applicable",
    "excludedBy": "usr_np_001",
    "excludedAt": "2026-02-18T09:35:00.000Z"
  }
]
```

---

### 5.15 POST /api/visits/:id/exclusions

**Why This Exists:** Records a clinical exclusion for a measure or assessment that cannot be performed.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "objectiveType": "measure",
  "objectiveId": "BCS",
  "reason": "Male patient - breast cancer screening not applicable",
  "excludedBy": "usr_np_001"
}
```

**Error Responses:**
- 403: Visit is locked
- 500: Server error

---

## 6. Assessment Engine

### 6.1 GET /api/assessment-definitions

**Why This Exists:** Returns all configured assessment instruments (PHQ-2, PHQ-9, PRAPARE, etc.). Each definition includes questions, scoring logic, and conditional branching rules. Used to render assessment forms dynamically.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "phq2",
    "name": "PHQ-2 Depression Screening",
    "description": "Two-item Patient Health Questionnaire for depression screening",
    "category": "behavioral_health",
    "version": "1.0",
    "scoringMethod": "sum",
    "maxScore": 6,
    "cutoffs": [
      { "label": "Minimal", "min": 0, "max": 2 },
      { "label": "Moderate", "min": 3, "max": 6 }
    ],
    "questions": [
      {
        "id": "q1",
        "text": "Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?",
        "type": "likert",
        "options": [
          { "value": 0, "label": "Not at all" },
          { "value": 1, "label": "Several days" },
          { "value": 2, "label": "More than half the days" },
          { "value": 3, "label": "Nearly every day" }
        ]
      },
      {
        "id": "q2",
        "text": "Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?",
        "type": "likert",
        "options": [
          { "value": 0, "label": "Not at all" },
          { "value": 1, "label": "Several days" },
          { "value": 2, "label": "More than half the days" },
          { "value": 3, "label": "Nearly every day" }
        ]
      }
    ],
    "conditionalLogic": {
      "triggerScore": 3,
      "action": "escalate",
      "targetInstrument": "phq9"
    },
    "isActive": true
  }
]
```

**Scoring Algorithms:**
- **PHQ-2:** Sum of 2 items, range 0–6. Score ≥ 3 triggers PHQ-9 escalation
- **PHQ-9:** Sum of 9 items, range 0–27. Severity: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 moderately severe, 20–27 severe
- **PRAPARE:** Social risk factor count across housing, food, transportation, utilities, safety, and employment domains
- **AWV HRA:** Structured wellness assessment covering functional status, cognitive screening, fall risk, advance directives, and preventive care

**Testing Checklist:**
- [ ] Happy path: returns all active assessment definitions
- [ ] Definitions include questions with options
- [ ] Scoring cutoffs are properly structured
- [ ] Conditional logic references valid target instruments

---

### 6.2 GET /api/assessment-definitions/:id

**Why This Exists:** Retrieves a single assessment definition by ID. Used when rendering a specific assessment form.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — assessment definition ID (e.g., `"phq2"`, `"phq9"`, `"prapare"`)

**Response (200):** Single assessment definition object (same shape as array item above).

**Error Responses:**
- 404: `"Assessment definition not found"`

---

### 6.3 GET /api/visits/:id/assessment-responses

**Why This Exists:** Returns all assessment responses submitted for a visit. Shows which assessments are complete, in-progress, or pending.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "ar_001",
    "visitId": "visit_001",
    "instrumentId": "phq2",
    "instrumentName": "PHQ-2 Depression Screening",
    "status": "complete",
    "responses": {
      "q1": 1,
      "q2": 0
    },
    "score": 1,
    "severity": "minimal",
    "scoringDetails": {
      "method": "sum",
      "maxPossible": 6,
      "interpretation": "Minimal depression symptoms"
    },
    "completedAt": "2026-02-18T09:40:00.000Z",
    "completedBy": "usr_np_001",
    "escalationTriggered": false,
    "unableToPerform": false,
    "unableToPerformReason": null,
    "provenance": "structured_entry"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all assessment responses
- [ ] Scores are correctly calculated
- [ ] Escalation flag is set when PHQ-2 ≥ 3

---

### 6.4 POST /api/visits/:id/assessment-responses

**Why This Exists:** Submits an assessment response with answers. The server calculates the score, determines severity, and checks for conditional logic triggers (e.g., PHQ-2 ≥ 3 escalates to PHQ-9).

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "instrumentId": "phq2",
  "responses": {
    "q1": 2,
    "q2": 1
  },
  "completedBy": "usr_np_001",
  "provenance": "structured_entry"
}
```

**Response (200):**
```json
{
  "id": "ar_002",
  "visitId": "visit_001",
  "instrumentId": "phq2",
  "status": "complete",
  "responses": { "q1": 2, "q2": 1 },
  "score": 3,
  "severity": "moderate",
  "escalationTriggered": true,
  "escalationTarget": "phq9",
  "completedAt": "2026-02-18T09:42:00.000Z"
}
```

**Validation Rules:**
- Visit must not be locked
- `instrumentId`: Required, must match an existing assessment definition
- `responses`: Required, object with question IDs as keys and numeric values
- Server-side scoring: sum of response values, compared against definition cutoffs
- `provenance`: One of `["structured_entry", "voice_capture", "hie_import", "mixed"]`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates response with calculated score
- [ ] PHQ-2 score ≥ 3 sets `escalationTriggered: true`
- [ ] Locked visit returns 403
- [ ] Score matches sum of responses
- [ ] Severity label matches cutoff ranges

---

### 6.5 PUT /api/assessment-responses/:id

**Why This Exists:** Updates an existing assessment response (e.g., correcting a response value or completing a partially saved response).

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — assessment response ID
```json
{
  "responses": {
    "q1": 1,
    "q2": 1
  },
  "status": "complete"
}
```

**Response (200):** Updated assessment response with recalculated score.

**Error Responses:**
- 404: `"Assessment response not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: updates response and recalculates score
- [ ] Score recalculation reflects new response values

---

### 6.6 POST /api/visits/:id/assessment-responses/:responseId/unable-to-perform

**Why This Exists:** Records that an assessment could not be performed for a valid clinical reason (e.g., patient too confused for PHQ-2, language barrier). Creates audit trail for why the assessment was skipped.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID, `responseId` (string) — assessment response ID
```json
{
  "reason": "Patient demonstrates significant cognitive impairment, unable to reliably answer screening questions",
  "documentedBy": "usr_np_001",
  "documentedByName": "Sarah Chen, NP"
}
```

**Response (200):**
```json
{
  "id": "ar_001",
  "status": "unable_to_perform",
  "unableToPerform": true,
  "unableToPerformReason": "Patient demonstrates significant cognitive impairment, unable to reliably answer screening questions",
  "unableToPerformBy": "usr_np_001",
  "unableToPerformAt": "2026-02-18T09:45:00.000Z"
}
```

**Error Responses:**
- 403: Visit is locked
- 404: `"Assessment response not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: marks assessment as unable to perform
- [ ] Audit event is created
- [ ] Assessment no longer blocks finalization
- [ ] HIPAA: reason is documented and audit-logged

---

### 6.7 GET /api/visits/:id/assessment-scoring

**Why This Exists:** Returns calculated scoring details for all assessments in a visit. Shows the scoring method, current score, maximum possible, severity classification, and whether conditional escalation was triggered.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "instrumentId": "phq2",
    "instrumentName": "PHQ-2 Depression Screening",
    "score": 1,
    "maxScore": 6,
    "severity": "minimal",
    "scoringMethod": "sum",
    "interpretation": "No significant depressive symptoms detected",
    "escalationTriggered": false,
    "completedAt": "2026-02-18T09:40:00.000Z"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns scoring for all completed assessments
- [ ] Score interpretation matches clinical guidelines

---

## 7. HEDIS Measures

### 7.1 GET /api/measure-definitions

**Why This Exists:** Returns all configured HEDIS measure definitions. Measures define quality metrics that must be captured or evaluated during visits (e.g., colorectal cancer screening, HbA1c control).

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "COL",
    "name": "Colorectal Cancer Screening",
    "description": "Patients 45-75 who had appropriate colorectal cancer screening",
    "category": "cancer_screening",
    "ageRange": { "min": 45, "max": 75 },
    "gender": "all",
    "hedisCode": "COL",
    "evaluationCriteria": {
      "colonoscopy": "within 10 years",
      "fitTest": "within 1 year",
      "cologuard": "within 3 years"
    },
    "isActive": true
  },
  {
    "id": "BCS",
    "name": "Breast Cancer Screening",
    "description": "Women 50-74 who had a mammogram within the past 2 years",
    "category": "cancer_screening",
    "ageRange": { "min": 50, "max": 74 },
    "gender": "female",
    "hedisCode": "BCS",
    "isActive": true
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all active measure definitions
- [ ] Definitions include age/gender eligibility criteria
- [ ] Evaluation criteria specify required evidence

---

### 7.2 GET /api/measure-definitions/:id

**Why This Exists:** Retrieves a specific HEDIS measure definition.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — measure definition ID (e.g., `"COL"`, `"BCS"`, `"CDC"`)

**Response (200):** Single measure definition object.

**Error Responses:**
- 404: `"Measure definition not found"`

---

### 7.3 GET /api/visits/:id/measure-results

**Why This Exists:** Returns all HEDIS measure results for a visit, showing which measures were evaluated, met, not met, or excluded.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "mr_001",
    "visitId": "visit_001",
    "measureId": "COL",
    "measureName": "Colorectal Cancer Screening",
    "status": "met",
    "result": "Colonoscopy performed 03/2024 at Kaiser Sacramento",
    "evidenceDate": "2024-03-15",
    "evaluatedBy": "usr_np_001",
    "evaluatedAt": "2026-02-18T09:50:00.000Z",
    "source": "patient_reported",
    "notes": "Patient confirms colonoscopy with no abnormal findings"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all measure results for visit
- [ ] Status values are valid: `"met"`, `"not_met"`, `"excluded"`, `"pending"`

---

### 7.4 POST /api/visits/:id/measure-results

**Why This Exists:** Records a HEDIS measure evaluation result. The NP determines whether the measure is met based on member-reported information, chart review, or HIE data.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "measureId": "BCS",
  "status": "met",
  "result": "Mammogram completed 09/2025 at Sutter Health Imaging",
  "evidenceDate": "2025-09-20",
  "evaluatedBy": "usr_np_001",
  "source": "patient_reported",
  "notes": "Annual mammogram, results normal per patient"
}
```

**Response (200):**
```json
{
  "id": "mr_002",
  "visitId": "visit_001",
  "measureId": "BCS",
  "status": "met",
  "evaluatedAt": "2026-02-18T09:52:00.000Z"
}
```

**Validation Rules:**
- Visit must not be locked
- `measureId`: Required, must match an existing measure definition
- `status`: Required, one of `["met", "not_met", "excluded", "pending"]`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates measure result
- [ ] Locked visit returns 403
- [ ] Measure result appears in visit overview

---

### 7.5 PUT /api/measure-results/:id

**Why This Exists:** Updates an existing measure result (e.g., changing status from pending to met after verifying evidence).

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — measure result ID
```json
{
  "status": "met",
  "result": "FIT test confirmed via lab report from 01/2026",
  "evidenceDate": "2026-01-10"
}
```

**Response (200):** Updated measure result.

**Error Responses:**
- 404: `"Measure result not found"`

---

### 7.6 POST /api/visits/:id/evaluate-measures

**Why This Exists:** Triggers automated evaluation of all applicable HEDIS measures for a visit based on the member's age, gender, and plan configuration. Creates pending measure results for measures that need NP evaluation.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "evaluated": 5,
  "results": [
    {
      "measureId": "COL",
      "status": "pending",
      "reason": "Member eligible for colorectal cancer screening"
    },
    {
      "measureId": "BCS",
      "status": "excluded",
      "reason": "Male patient - not applicable"
    }
  ]
}
```

**Testing Checklist:**
- [ ] Happy path: evaluates all measures for member demographics
- [ ] Gender-specific measures are appropriately excluded
- [ ] Age-range filtering works correctly

---

## 8. Clinical Decision Support

### 8.1 GET /api/clinical-rules

**Why This Exists:** Returns all configured clinical decision support rules. Rules define thresholds, alerts, and auto-coding triggers based on vitals, assessments, and clinical findings.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "rule_bp_critical",
    "name": "Critical Blood Pressure",
    "category": "vitals",
    "triggerField": "systolicBp",
    "operator": "greater_than",
    "threshold": 180,
    "severity": "critical",
    "alertMessage": "Systolic BP > 180 mmHg - hypertensive crisis, immediate action required",
    "autoCode": "I16.0",
    "isActive": true
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all active clinical rules
- [ ] Rules include trigger conditions and actions

---

### 8.2 PUT /api/clinical-rules/:id

**Why This Exists:** Updates a clinical rule's configuration. Used by admins to adjust thresholds, enable/disable rules, or modify alert messages.

**Authorization:** Session required | Role: Admin

**Request:**
- Path params: `id` (string) — rule ID
```json
{
  "threshold": 160,
  "severity": "warning",
  "isActive": true
}
```

**Response (200):** Updated clinical rule.

**Error Responses:**
- 404: `"Rule not found"`
- 500: Server error

---

### 8.3 GET /api/visits/:id/recommendations

**Why This Exists:** Retrieves clinical recommendations generated for a visit based on clinical rules evaluation. Recommendations suggest diagnoses, referrals, or follow-up actions based on the clinical data captured.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "rec_001",
    "visitId": "visit_001",
    "ruleId": "rule_bp_elevated",
    "type": "diagnosis",
    "recommendation": "Consider adding ICD-10 I10 Essential hypertension based on elevated BP readings",
    "severity": "warning",
    "autoCode": "I10",
    "status": "pending",
    "createdAt": "2026-02-18T09:55:00.000Z"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns recommendations for visit
- [ ] Recommendations reference originating rules

---

### 8.4 POST /api/visits/:id/recommendations

**Why This Exists:** Creates a clinical recommendation for a visit. Can be auto-generated by rules or manually added by the NP.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "ruleId": "rule_diabetes_screening",
  "type": "referral",
  "recommendation": "Refer to endocrinology for diabetes management optimization",
  "severity": "informational",
  "status": "pending"
}
```

**Error Responses:**
- 403: Visit is locked
- 500: Server error

---

### 8.5 GET /api/visits/:id/overrides

**Why This Exists:** Retrieves validation overrides for a visit. When the NP disagrees with a clinical rule alert or auto-code suggestion, they can override it with a documented clinical rationale.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "ovr_001",
    "visitId": "visit_001",
    "ruleId": "rule_bp_elevated",
    "overrideType": "clinical_judgment",
    "reason": "Patient has white coat hypertension, home BP readings consistently normal per log",
    "overriddenBy": "usr_np_001",
    "overriddenByName": "Sarah Chen, NP",
    "overriddenAt": "2026-02-18T10:00:00.000Z"
  }
]
```

---

### 8.6 POST /api/visits/:id/overrides

**Why This Exists:** Records a clinical override with documented rationale. Overrides create an audit trail for compliance review and must include a clinical justification.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "ruleId": "rule_bp_elevated",
  "overrideType": "clinical_judgment",
  "reason": "Patient has documented white coat hypertension. Home BP log reviewed - average 128/78",
  "overriddenBy": "usr_np_001",
  "overriddenByName": "Sarah Chen, NP"
}
```

**Response (200):**
```json
{
  "id": "ovr_002",
  "visitId": "visit_001",
  "overrideType": "clinical_judgment",
  "overriddenAt": "2026-02-18T10:02:00.000Z"
}
```

**Validation Rules:**
- Visit must not be locked
- `reason`: Required, must be a meaningful clinical rationale
- `overriddenBy`: Required

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates override with rationale
- [ ] Audit event is created for the override
- [ ] Override is visible in supervisor review
- [ ] HIPAA: override with clinical rationale is audit-logged

---

### 8.7 GET /api/visits/:id/codes

**Why This Exists:** Returns all CPT, HCPCS, and ICD-10 codes associated with a visit. Codes are either auto-generated during finalization or manually added by the NP.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "code_001",
    "visitId": "visit_001",
    "code": "G0438",
    "codeType": "CPT",
    "description": "Annual wellness visit, initial",
    "source": "auto",
    "isAutoGenerated": true,
    "meatDocumentation": "Vitals documented, PHQ-2 completed, PRAPARE completed, care plan created",
    "removedByNp": false,
    "removedReason": null
  },
  {
    "id": "code_002",
    "visitId": "visit_001",
    "code": "E11.9",
    "codeType": "ICD-10",
    "description": "Type 2 diabetes mellitus without complications",
    "source": "auto",
    "isAutoGenerated": true,
    "removedByNp": false
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all codes for visit
- [ ] Auto-generated codes include MEAT documentation
- [ ] Removed codes have reason documented

---

### 8.8 POST /api/visits/:id/codes

**Why This Exists:** Manually adds a CPT, HCPCS, or ICD-10 code to a visit. Used when the NP identifies a condition or service not captured by auto-coding.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "code": "M17.11",
  "codeType": "ICD-10",
  "description": "Primary osteoarthritis, right knee",
  "source": "manual",
  "meatDocumentation": "Patient reports chronic right knee pain, observed crepitus on exam, limited ROM"
}
```

**Validation Rules:**
- Visit must not be locked
- `code`: Required, valid CPT/HCPCS/ICD-10 code
- `codeType`: Required, one of `["CPT", "HCPCS", "ICD-10"]`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

---

### 8.9 PATCH /api/codes/:id

**Why This Exists:** Updates a code entry — primarily used by NPs to remove an auto-generated code with a documented reason, or to update the MEAT documentation.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — code ID
```json
{
  "removedByNp": true,
  "removedReason": "Diagnosis was previously resolved, no longer active"
}
```

**Response (200):** Updated code entry.

**Error Responses:**
- 404: `"Code not found"`

---

### 8.10 POST /api/visits/:id/auto-code

**Why This Exists:** Triggers the auto-coding engine for a visit. Analyzes vitals, assessments, measures, and medications to generate appropriate CPT, HCPCS, and ICD-10 codes with MEAT documentation.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "generated": 4,
  "codes": [
    {
      "code": "G0438",
      "codeType": "CPT",
      "description": "Annual wellness visit, initial",
      "reason": "Visit type: AWV",
      "meatDocumentation": "M: Vitals indicate elevated BP. E: PHQ-2 score 1 (minimal). A: BMI 28.3, borderline overweight. T: Care plan includes dietary counseling and PCP follow-up."
    },
    {
      "code": "96127",
      "codeType": "CPT",
      "description": "Brief emotional/behavioral assessment",
      "reason": "PHQ-2 screening completed"
    },
    {
      "code": "I10",
      "codeType": "ICD-10",
      "description": "Essential (primary) hypertension",
      "reason": "Systolic BP 142 > 140 threshold"
    },
    {
      "code": "E11.9",
      "codeType": "ICD-10",
      "description": "Type 2 diabetes mellitus without complications",
      "reason": "HbA1c measure met, diabetes monitoring documented"
    }
  ]
}
```

**Auto-Coding Decision Logic:**
| Trigger | Code | Type | Condition |
|---------|------|------|-----------|
| Visit type AWV (initial) | G0438 | CPT | First AWV for member |
| Visit type AWV (subsequent) | G0439 | CPT | Subsequent AWV |
| Visit type IHE (new patient) | 99345 | CPT | New home visit |
| Visit type IHE (established) | 99350 | CPT | Established home visit |
| PHQ-2 or PHQ-9 completed | 96127 | CPT | Any screening instrument |
| Systolic > 140 OR Diastolic > 90 | I10 | ICD-10 | Hypertension |
| BMI > 30 | E66.9 | ICD-10 | Obesity |
| BMI 25–29.9 | E66.3 | ICD-10 | Overweight |
| PHQ-2 ≥ 3 or PHQ-9 ≥ 10 | F32.9 | ICD-10 | Depression |
| PRAPARE social risk factors | Z59.7 | ICD-10 | Social determinant |
| HbA1c measure met | E11.9 | ICD-10 | Diabetes |

**Testing Checklist:**
- [ ] Happy path: generates codes based on clinical data
- [ ] AWV visit type generates G0438 or G0439
- [ ] High BP generates I10
- [ ] High BMI generates E66.9
- [ ] Depression screening generates 96127

---

### 8.11 GET /api/visits/:id/code-evidence

**Why This Exists:** Returns all codes for a visit enriched with evidence mapping — which clinical evidence supports each code and what evidence is missing. Used by supervisors during review to validate coding accuracy.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "code_001",
    "code": "G0438",
    "codeType": "CPT",
    "description": "Annual wellness visit, initial",
    "evidenceMap": {
      "requirements": ["Health Risk Assessment", "Depression screening", "Functional assessment"],
      "satisfiedBy": ["Depression screening", "Health Risk Assessment"],
      "missing": ["Functional assessment"]
    },
    "evidenceStatus": "partially_supported"
  },
  {
    "id": "code_002",
    "code": "99345",
    "codeType": "CPT",
    "description": "Home visit, new patient",
    "evidenceMap": {
      "requirements": ["Vitals documented", "Assessment completed", "Care plan created"],
      "satisfiedBy": ["Vitals documented", "Assessment completed"],
      "missing": ["Care plan created"]
    },
    "evidenceStatus": "partially_supported"
  }
]
```

**Evidence Status Values:**
- `"fully_supported"` — All evidence requirements are met
- `"partially_supported"` — Some but not all requirements met
- `"missing_evidence"` — No supporting evidence found

**Testing Checklist:**
- [ ] Happy path: returns codes with evidence maps
- [ ] CPT G0438/G0439 requires HRA, depression screening, functional assessment
- [ ] Evidence status accurately reflects satisfaction
- [ ] ICD-10 codes check for vitals and assessment support

---

### 8.12 GET /api/diagnosis-rules

**Why This Exists:** Returns all diagnosis validation rules that define what clinical evidence is required to support each ICD-10 diagnosis code.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "diag_rule_001",
    "icdCode": "E11.9",
    "icdDescription": "Type 2 diabetes mellitus without complications",
    "requiredEvidence": [
      { "type": "vitals", "field": "weight", "description": "Weight documented" },
      { "type": "medication", "description": "Diabetes medication documented" },
      { "type": "lab", "testName": "HbA1c", "description": "HbA1c lab result available" }
    ],
    "isActive": true
  }
]
```

---

### 8.13 POST /api/visits/:id/diagnoses/validate

**Why This Exists:** Validates all ICD-10 diagnoses on a visit against diagnosis rules. Checks whether sufficient clinical evidence (vitals, assessments, medications, labs) supports each diagnosis code. Used during supervisor review.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "results": [
    {
      "icdCode": "E11.9",
      "icdDescription": "Type 2 diabetes mellitus without complications",
      "status": "supported",
      "evidenceItems": [
        { "description": "Weight documented", "met": true },
        { "description": "Diabetes medication documented", "met": true },
        { "description": "HbA1c lab result available", "met": true }
      ],
      "missingEvidence": []
    },
    {
      "icdCode": "I10",
      "icdDescription": "Essential (primary) hypertension",
      "status": "partial",
      "evidenceItems": [
        { "description": "Blood pressure documented", "met": true },
        { "description": "Hypertension medication documented", "met": false }
      ],
      "missingEvidence": ["Hypertension medication documented"]
    }
  ],
  "summary": {
    "total": 2,
    "supported": 1,
    "partial": 1,
    "unsupported": 0,
    "noRule": 0
  }
}
```

**Validation Status Values:**
- `"supported"` — All required evidence is present
- `"partial"` — Some evidence present but not all
- `"unsupported"` — No supporting evidence found
- `"no_rule"` — No validation rule exists for this ICD-10 code

**Testing Checklist:**
- [ ] Happy path: validates all ICD-10 codes against rules
- [ ] Supported status when all evidence present
- [ ] Partial status with missing evidence listed
- [ ] Codes without rules get `no_rule` status
- [ ] Summary counts are accurate

---

## 9. Progress Notes

### 9.1 GET /api/visits/:id/clinical-notes

**Why This Exists:** Retrieves generated clinical/progress notes for a visit. Notes are structured in MEAT/TAMPER-compliant format with sections for subjective, objective, assessment, and plan documentation.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "note_001",
    "visitId": "visit_001",
    "noteType": "progress_note",
    "content": "SUBJECTIVE: 78-year-old female presents for annual wellness visit...",
    "sections": {
      "subjective": "78-year-old female presents for annual wellness visit. Chief complaint: routine preventive care. Patient reports compliance with current medications including Lisinopril 10mg daily and Metformin 500mg BID.",
      "objective": "Vitals: BP 138/82, HR 72, Temp 98.6F, RR 16, O2 Sat 97%, Weight 165 lbs, Height 64 in, BMI 28.3. PHQ-2 Score: 1/6 (minimal depression).",
      "assessment": "1. Essential hypertension (I10) - controlled on current regimen. 2. Type 2 diabetes (E11.9) - HbA1c monitoring indicated.",
      "plan": "1. Continue Lisinopril 10mg daily. 2. Continue Metformin 500mg BID. 3. Order HbA1c lab. 4. Refer to ophthalmology for diabetic retinopathy screening. 5. Follow up in 12 months for next AWV."
    },
    "completenessScore": 92,
    "provenance": "mixed",
    "generatedAt": "2026-02-18T10:15:00.000Z",
    "generatedBy": "system"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns clinical notes with structured sections
- [ ] Note content includes realistic clinical language
- [ ] Completeness score reflects documentation quality

---

### 9.2 POST /api/visits/:id/clinical-notes

**Why This Exists:** Generates a new clinical note for a visit by assembling data from vitals, assessments, measures, medications, and codes into a structured SOAP-format note.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "noteType": "progress_note",
  "generatedBy": "usr_np_001",
  "includeVoiceData": true
}
```

**Response (200):** Generated clinical note with assembled content from all visit data.

**Validation Rules:**
- Visit must not be locked
- `noteType`: One of `["progress_note", "addendum", "summary"]`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: generates note from visit data
- [ ] Note includes vitals, assessments, medications, codes
- [ ] Completeness score is calculated
- [ ] Provenance tracks data sources

---

### 9.3 GET /api/visits/:id/note-edits

**Why This Exists:** Returns the edit history for a visit's progress notes. Every edit to a clinical note is tracked for audit and compliance purposes.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "edit_001",
    "visitId": "visit_001",
    "section": "assessment",
    "previousContent": "1. Essential hypertension (I10)",
    "newContent": "1. Essential hypertension (I10) - controlled on current regimen",
    "editedBy": "usr_np_001",
    "editedByName": "Sarah Chen, NP",
    "editedAt": "2026-02-18T10:20:00.000Z",
    "reason": "Added treatment status clarification"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all edits for visit notes
- [ ] Each edit includes before/after content
- [ ] Edit reason is documented

---

### 9.4 POST /api/visits/:id/note-edits

**Why This Exists:** Records an edit to a progress note section. Creates an immutable audit trail of all changes to clinical documentation.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "section": "plan",
  "previousContent": "1. Continue Lisinopril 10mg daily.",
  "newContent": "1. Continue Lisinopril 10mg daily. 2. Increase Metformin to 1000mg BID pending lab results.",
  "editedBy": "usr_np_001",
  "editedByName": "Sarah Chen, NP",
  "reason": "Updated medication plan based on patient discussion"
}
```

**Response (200):** Created note edit record.

**Validation Rules:**
- Visit must not be locked

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates edit record with audit trail
- [ ] Audit event is created for note edit
- [ ] HIPAA: all note modifications are logged

---

### 9.5 GET /api/visits/:id/note-signatures

**Why This Exists:** Returns signature records for a visit's progress notes. Both the NP and supervisor must sign notes as part of the documentation workflow.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "sig_001",
    "visitId": "visit_001",
    "signatureType": "np_attestation",
    "signedBy": "usr_np_001",
    "signedByName": "Sarah Chen, NP",
    "role": "np",
    "signedAt": "2026-02-18T10:25:00.000Z",
    "attestationText": "I attest that this documentation accurately reflects the services provided during this visit."
  }
]
```

---

### 9.6 POST /api/visits/:id/note-signatures

**Why This Exists:** Records a signature on a progress note. NPs sign to attest to documentation accuracy; supervisors sign during the review process.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "signatureType": "np_attestation",
  "signedBy": "usr_np_001",
  "signedByName": "Sarah Chen, NP",
  "role": "np",
  "attestationText": "I attest that this documentation accurately reflects the services provided."
}
```

**Response (200):** Created signature record.

**Validation Rules:**
- `signatureType`: One of `["np_attestation", "supervisor_cosign", "addendum_sign"]`
- `role`: Must match the signer's role

**Error Responses:**
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates signature with attestation
- [ ] Audit event is created for note signature
- [ ] HIPAA: signature event is immutably logged

---

### 9.7 POST /api/visits/:id/export

**Why This Exists:** Exports the visit's progress note and clinical data as a structured document. Generates a PDF-ready export artifact for printing, faxing to PCP, or submission to the health plan.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "format": "pdf",
  "includeAttachments": true,
  "exportedBy": "usr_np_001",
  "exportedByName": "Sarah Chen, NP"
}
```

**Response (200):**
```json
{
  "id": "exp_001",
  "visitId": "visit_001",
  "format": "pdf",
  "fileName": "visit_001_progress_note_20260218.pdf",
  "content": "<structured note content>",
  "exportedAt": "2026-02-18T10:30:00.000Z",
  "exportedBy": "usr_np_001"
}
```

**Error Responses:**
- 403: Visit is locked
- 404: `"Visit not found"`
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: generates export artifact
- [ ] Audit event is created for export (HIPAA requirement)
- [ ] Export includes all clinical data sections
- [ ] HIPAA: PHI export is logged with user, timestamp, and format

---

## 10. Supervisor Review

### 10.1 GET /api/reviews

**Why This Exists:** Returns all visits that are in review-ready status. Supervisors use this queue to review completed visits before final sign-off.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "visit_001",
    "memberId": "mbr_001",
    "memberName": "Margaret Thompson",
    "npName": "Sarah Chen, NP",
    "status": "completed",
    "visitType": "AWV",
    "scheduledDate": "2026-02-18",
    "completedAt": "2026-02-18T10:30:00.000Z"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns visits pending review
- [ ] Only completed/finalized visits appear in queue

---

### 10.2 GET /api/reviews/enhanced

**Why This Exists:** Returns an enriched review queue with quality scores, rework history, diagnosis support scores, and quality flags. Enables supervisors to prioritize reviews based on risk indicators.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "visit_001",
    "memberId": "mbr_001",
    "status": "completed",
    "visitType": "AWV",
    "npName": "Sarah Chen, NP",
    "reworkCount": 0,
    "completenessScore": 92,
    "diagnosisSupportScore": 85,
    "flagCount": 1,
    "hieDataAvailable": true,
    "lastReturnReasons": null,
    "lastReturnComments": null,
    "lastReviewDate": null
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns enriched review data
- [ ] Rework count reflects return history
- [ ] Completeness and diagnosis scores are present
- [ ] HIE data availability flag is accurate

---

### 10.3 GET /api/visits/:id/review-decisions

**Why This Exists:** Returns all review decisions made for a visit. Shows the history of supervisor reviews including approvals, returns for rework, and comments.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "rd_001",
    "visitId": "visit_001",
    "decision": "return",
    "reviewedBy": "usr_sup_001",
    "reviewedByName": "Dr. Michael Torres",
    "reviewedAt": "2026-02-18T11:00:00.000Z",
    "comments": "Please add clinical rationale for hypertension diagnosis. BP readings need to be confirmed with second reading.",
    "returnReasons": ["insufficient_documentation", "coding_query"]
  }
]
```

---

### 10.4 POST /api/visits/:id/review-decisions

**Why This Exists:** Records a supervisor's review decision — approve the visit or return it for NP rework with specific reasons and comments.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "decision": "approve",
  "reviewedBy": "usr_sup_001",
  "reviewedByName": "Dr. Michael Torres",
  "comments": "Documentation is complete and accurate. Coding supported by clinical evidence.",
  "qualityScore": 95
}
```

**Response (200):**
```json
{
  "id": "rd_002",
  "visitId": "visit_001",
  "decision": "approve",
  "reviewedAt": "2026-02-18T11:05:00.000Z"
}
```

**Validation Rules:**
- Visit must not be locked
- `decision`: Required, one of `["approve", "return", "escalate"]`
- `returnReasons`: Required when decision is `"return"` — array of reason codes
- `comments`: Recommended for all decisions, required for `"return"`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: creates review decision
- [ ] Return decision includes reasons and comments
- [ ] Audit event is created for review decision
- [ ] HIPAA: review decisions are audit-logged

---

### 10.5 GET /api/visits/:id/sign-offs

**Why This Exists:** Returns supervisor sign-off records for a visit. A sign-off finalizes the encounter and locks it from further modification.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "so_001",
    "visitId": "visit_001",
    "decision": "approve",
    "signedBy": "usr_sup_001",
    "signedByName": "Dr. Michael Torres",
    "signedAt": "2026-02-18T11:10:00.000Z",
    "completenessScore": 95,
    "diagnosisSupportScore": 90,
    "qualityFlags": [],
    "comments": "Excellent documentation quality.",
    "attestation": "I have reviewed this encounter and attest to the accuracy of the clinical documentation."
  }
]
```

---

### 10.6 POST /api/visits/:id/sign-offs

**Why This Exists:** Records a supervisor sign-off on a visit. This is the final step in the review workflow. An approved sign-off locks the encounter from further modification and makes it ready for submission to the health plan.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "decision": "approve",
  "signedBy": "usr_sup_001",
  "signedByName": "Dr. Michael Torres",
  "completenessScore": 95,
  "diagnosisSupportScore": 90,
  "qualityFlags": [],
  "comments": "All clinical elements properly documented.",
  "returnReasons": null,
  "attestation": "I have reviewed this encounter documentation and attest to its accuracy."
}
```

**Response (200):**
```json
{
  "id": "so_002",
  "visitId": "visit_001",
  "decision": "approve",
  "signedAt": "2026-02-18T11:10:00.000Z"
}
```

**Validation Rules:**
- `decision`: Required, one of `["approve", "return"]`
- `signedBy`: Required
- `completenessScore`: Integer 0–100
- `diagnosisSupportScore`: Integer 0–100
- `qualityFlags`: Array of flag objects
- When decision is `"return"`: `returnReasons` array is required
- When decision is `"approve"`: Visit status is updated to `"finalized"` and encounter is locked

**Error Responses:**
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: approve sign-off locks encounter
- [ ] Return sign-off increments rework count
- [ ] Visit status changes to "finalized" on approval
- [ ] Subsequent PATCH attempts on locked visit return 403
- [ ] Audit event is created
- [ ] HIPAA: sign-off is immutably logged

---

## 11. Care Coordination

### 11.1 GET /api/visits/:id/alerts

**Why This Exists:** Retrieves clinical alerts generated for a visit based on clinical rules evaluation (e.g., critical vitals, missing screenings, drug interactions).

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "alert_001",
    "visitId": "visit_001",
    "ruleName": "Critical Blood Pressure",
    "severity": "critical",
    "message": "Systolic BP 182 mmHg exceeds critical threshold of 180 mmHg",
    "status": "active",
    "triggeredAt": "2026-02-18T09:15:00.000Z",
    "acknowledgedAt": null,
    "dismissedAt": null
  }
]
```

---

### 11.2 POST /api/visits/:id/alerts

**Why This Exists:** Creates a clinical alert for a visit. Alerts can be auto-generated by rules or manually created by the NP when they identify a clinical concern.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "ruleName": "Fall Risk Identified",
  "severity": "warning",
  "message": "Patient reports 2 falls in the past 6 months. Fall risk assessment recommended.",
  "status": "active"
}
```

**Validation Rules:**
- Visit must not be locked
- `severity`: One of `["critical", "warning", "informational"]`
- `status`: One of `["active", "acknowledged", "dismissed"]`

**Error Responses:**
- 403: Visit is locked
- 500: Server error

---

### 11.3 PATCH /api/alerts/:id

**Why This Exists:** Updates an alert's status or details.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — alert ID
```json
{
  "status": "acknowledged",
  "acknowledgedBy": "usr_np_001"
}
```

**Error Responses:**
- 404: `"Alert not found"`

---

### 11.4 POST /api/alerts/:id/acknowledge

**Why This Exists:** Acknowledges a clinical alert, indicating the NP has seen and is aware of the clinical concern. Creates an audit event.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — alert ID
```json
{
  "userId": "usr_np_001",
  "userName": "Sarah Chen, NP"
}
```

**Response (200):**
```json
{
  "id": "alert_001",
  "status": "acknowledged",
  "acknowledgedBy": "usr_np_001",
  "acknowledgedByName": "Sarah Chen, NP",
  "acknowledgedAt": "2026-02-18T09:20:00.000Z"
}
```

**Testing Checklist:**
- [ ] Happy path: alert status changes to acknowledged
- [ ] Audit event is created
- [ ] HIPAA: clinical alert acknowledgment is logged

---

### 11.5 POST /api/alerts/:id/dismiss

**Why This Exists:** Dismisses a clinical alert with a documented reason and action taken. Used when the alert is not clinically relevant or has been addressed.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — alert ID
```json
{
  "userId": "usr_np_001",
  "userName": "Sarah Chen, NP",
  "reason": "White coat hypertension documented, home BP readings reviewed and normal",
  "actionTaken": "Home BP monitoring log reviewed, documented in chart"
}
```

**Response (200):**
```json
{
  "id": "alert_001",
  "status": "dismissed",
  "dismissedBy": "usr_np_001",
  "dismissedAt": "2026-02-18T09:22:00.000Z",
  "dismissReason": "White coat hypertension documented, home BP readings reviewed and normal",
  "actionTaken": "Home BP monitoring log reviewed, documented in chart"
}
```

**Testing Checklist:**
- [ ] Happy path: alert dismissed with reason
- [ ] Audit event captures reason and action taken
- [ ] HIPAA: dismissal with clinical rationale is logged

---

## 12. Voice Capture & AI

### 12.1 GET /api/ai-provider-config

**Why This Exists:** Returns the current AI provider configuration for voice transcription and clinical field extraction. Supports Azure Speech Services, Azure OpenAI, OpenAI, and Anthropic.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "aic_001",
    "providerType": "transcription",
    "providerName": "azure_speech",
    "model": "whisper",
    "isActive": true,
    "config": {
      "region": "westus2",
      "language": "en-US"
    },
    "priority": 1
  },
  {
    "id": "aic_002",
    "providerType": "extraction",
    "providerName": "openai",
    "model": "gpt-4o",
    "isActive": true,
    "config": {
      "temperature": 0.1,
      "maxTokens": 4096
    },
    "priority": 1
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all AI provider configs
- [ ] Configs include transcription and extraction providers

---

### 12.2 POST /api/ai-provider-config

**Why This Exists:** Creates a new AI provider configuration. Allows administrators to set up different AI services for transcription and clinical field extraction.

**Authorization:** Session required | Any authenticated user

**Request:**
```json
{
  "providerType": "transcription",
  "providerName": "openai",
  "model": "whisper-1",
  "isActive": true,
  "config": {
    "language": "en",
    "responseFormat": "json"
  },
  "priority": 2
}
```

**Validation Rules:**
- `providerType`: Required, one of `["transcription", "extraction"]`
- `providerName`: Required, one of `["azure_speech", "azure_openai", "openai", "anthropic"]`
- `model`: Required, valid model identifier for the provider

**Error Responses:**
- 500: Server error

---

### 12.3 PUT /api/ai-provider-config/:id

**Why This Exists:** Updates an existing AI provider configuration.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — config ID
```json
{
  "model": "gpt-4o-mini",
  "isActive": false
}
```

**Error Responses:**
- 404: `"AI provider config not found"`

---

### 12.4 GET /api/visits/:id/recordings

**Why This Exists:** Retrieves all voice recordings associated with a visit. NPs can record clinical encounters for AI-assisted documentation.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "rec_001",
    "visitId": "visit_001",
    "status": "transcribed",
    "duration": 345,
    "format": "webm",
    "fileSize": 2048576,
    "recordedAt": "2026-02-18T09:30:00.000Z",
    "recordedBy": "usr_np_001",
    "transcriptionStatus": "completed"
  }
]
```

---

### 12.5 POST /api/visits/:id/recordings

**Why This Exists:** Creates a voice recording entry for a visit. The recording metadata is stored, and the audio can then be submitted for transcription.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "duration": 345,
  "format": "webm",
  "fileSize": 2048576,
  "recordedBy": "usr_np_001",
  "audioData": "<base64-encoded-audio>"
}
```

**Validation Rules:**
- Visit must not be locked

**Error Responses:**
- 403: Visit is locked
- 500: Server error

---

### 12.6 GET /api/visits/:id/transcripts

**Why This Exists:** Retrieves transcription results for a visit's voice recordings. Transcripts are the raw text output from speech-to-text processing.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "tx_001",
    "visitId": "visit_001",
    "recordingId": "rec_001",
    "content": "Patient reports taking Lisinopril 10 milligrams daily for blood pressure. Blood pressure today is 138 over 82. Heart rate is 72. She reports no chest pain, no shortness of breath. She completed her colonoscopy last March at Kaiser. PHQ-2 scores are 1 for interest and 0 for feeling down.",
    "provider": "azure_speech",
    "model": "whisper",
    "confidence": 0.94,
    "duration": 345,
    "transcribedAt": "2026-02-18T09:35:00.000Z",
    "status": "completed"
  }
]
```

---

### 12.7 POST /api/visits/:id/transcripts

**Why This Exists:** Creates or submits a transcript for a recording. Can either store a pre-processed transcript or trigger server-side transcription.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "recordingId": "rec_001",
  "content": "Patient reports taking Lisinopril 10 milligrams daily...",
  "provider": "azure_speech",
  "model": "whisper",
  "confidence": 0.94,
  "duration": 345
}
```

**Validation Rules:**
- Visit must not be locked
- `recordingId`: Required
- `content`: Required, non-empty transcript text

**Error Responses:**
- 403: Visit is locked
- 500: Server error

---

### 12.8 POST /api/visits/:id/extract-fields

**Why This Exists:** Triggers AI-powered clinical field extraction from a transcript. An LLM analyzes the transcript text and extracts structured clinical data — vitals, medications, assessment scores, screening results, and conditions — with confidence scores.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "transcriptId": "tx_001",
  "transcriptContent": "Patient reports taking Lisinopril 10 milligrams daily for blood pressure. Blood pressure today is 138 over 82. Heart rate is 72. She completed her colonoscopy last March at Kaiser.",
  "provider": "openai",
  "model": "gpt-4o"
}
```

**Response (200):**
```json
{
  "extracted": 5,
  "fields": [
    {
      "id": "ef_001",
      "visitId": "visit_001",
      "fieldType": "vital",
      "fieldName": "systolicBp",
      "extractedValue": "138",
      "confidence": 0.95,
      "sourceText": "Blood pressure today is 138 over 82",
      "status": "pending"
    },
    {
      "id": "ef_002",
      "visitId": "visit_001",
      "fieldType": "vital",
      "fieldName": "diastolicBp",
      "extractedValue": "82",
      "confidence": 0.95,
      "sourceText": "Blood pressure today is 138 over 82",
      "status": "pending"
    },
    {
      "id": "ef_003",
      "visitId": "visit_001",
      "fieldType": "vital",
      "fieldName": "heartRate",
      "extractedValue": "72",
      "confidence": 0.92,
      "sourceText": "Heart rate is 72",
      "status": "pending"
    },
    {
      "id": "ef_004",
      "visitId": "visit_001",
      "fieldType": "medication",
      "fieldName": "medicationName",
      "extractedValue": "Lisinopril 10mg",
      "confidence": 0.98,
      "sourceText": "taking Lisinopril 10 milligrams daily",
      "status": "pending"
    },
    {
      "id": "ef_005",
      "visitId": "visit_001",
      "fieldType": "screening",
      "fieldName": "colonoscopy",
      "extractedValue": "completed",
      "confidence": 0.88,
      "sourceText": "completed her colonoscopy last March at Kaiser",
      "status": "pending"
    }
  ]
}
```

**Extracted Field Types:**
- `vital` — Blood pressure, heart rate, temperature, O2 sat, weight, height
- `medication` — Medication names, dosages, frequencies
- `assessment` — PHQ-2/PHQ-9 scores, PRAPARE responses
- `screening` — Colonoscopy, mammogram, diabetic eye exam status
- `condition` — Clinical conditions mentioned (e.g., hypertension, diabetes)

**Testing Checklist:**
- [ ] Happy path: extracts fields from transcript with confidence scores
- [ ] Each field includes source text reference
- [ ] Fields are created with "pending" status
- [ ] Confidence scores are between 0 and 1
- [ ] Multiple field types are extracted (vitals, meds, screenings)

---

### 12.9 GET /api/visits/:id/extracted-fields

**Why This Exists:** Returns all extracted fields for a visit across all transcripts. Shows the review status of each field (pending, accepted, rejected, edited).

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "ef_001",
    "visitId": "visit_001",
    "fieldType": "vital",
    "fieldName": "systolicBp",
    "extractedValue": "138",
    "confidence": 0.95,
    "sourceText": "Blood pressure today is 138 over 82",
    "status": "accepted",
    "reviewedBy": "usr_np_001",
    "reviewedAt": "2026-02-18T09:40:00.000Z",
    "appliedToVisit": true
  }
]
```

**Status Values:**
- `"pending"` — Awaiting NP review
- `"accepted"` — NP confirmed and value applied to visit
- `"rejected"` — NP rejected the extracted value
- `"edited"` — NP modified the value before accepting

---

### 12.10 PATCH /api/extracted-fields/:id

**Why This Exists:** Updates an extracted field's status — accept, reject, or edit the AI-extracted value.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — extracted field ID
```json
{
  "status": "accepted",
  "reviewedBy": "usr_np_001",
  "editedValue": null
}
```

**Error Responses:**
- 404: `"Extracted field not found"`

---

### 12.11 POST /api/visits/:id/extracted-fields/accept-all

**Why This Exists:** Bulk-accepts all pending extracted fields for a visit and applies their values to the visit data (vitals, medications, assessments). Streamlines the voice capture workflow when the NP trusts the AI extractions.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID
```json
{
  "fieldIds": ["ef_001", "ef_002", "ef_003", "ef_004"]
}
```

**Response (200):**
```json
{
  "accepted": 4,
  "fields": [
    {
      "id": "ef_001",
      "fieldName": "systolicBp",
      "status": "accepted",
      "appliedToVisit": true
    }
  ]
}
```

**Auto-Apply Logic:**
When fields are accepted, they are automatically applied to the visit:
- **Vital fields** → Update or create vitals record, track in `voiceInferredFields`
- **Medication fields** → Create medication reconciliation entry with source `"voice_capture"` and status `"new"`
- **Assessment fields** (e.g., PHQ-2 inferred scores) → Create assessment response with provenance `"voice_capture"`
- **Screening fields** (e.g., colonoscopy completed) → Create or update measure result

**Testing Checklist:**
- [ ] Happy path: bulk accepts and applies all fields
- [ ] Vitals are updated with voice-inferred values
- [ ] Medications are added to reconciliation
- [ ] voiceInferredFields array is populated

---

### 12.12 POST /api/visits/:id/extracted-fields/re-apply

**Why This Exists:** Re-applies all previously accepted/edited extracted fields to the visit data. Used when visit data has been reset or overwritten and the voice-captured values need to be restored.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
{
  "total": 4,
  "applied": 4
}
```

**Testing Checklist:**
- [ ] Happy path: re-applies accepted fields
- [ ] Only re-applies accepted and edited fields (not rejected)
- [ ] Fields that fail to apply are counted separately

---

## 13. FHIR R4 Interoperability

> For detailed FHIR resource mappings, data transformation logic, and FHIR bundle structures, see [`docs/fhir-api-reference.md`](./fhir-api-reference.md).

### 13.1 GET /api/fhir/Patient/:memberId

**Why This Exists:** Returns a member's demographics as a FHIR R4 Patient resource. Used for interoperability with health plan systems and HIE networks.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — the member's external member ID (e.g., `"MA-2026-001"`)

**Response (200):**
```json
{
  "resourceType": "Patient",
  "id": "mbr_001",
  "identifier": [
    {
      "system": "http://easyhealth.com/member-id",
      "value": "MA-2026-001"
    }
  ],
  "name": [
    {
      "use": "official",
      "family": "Thompson",
      "given": ["Margaret"]
    }
  ],
  "gender": "female",
  "birthDate": "1948-03-15",
  "telecom": [
    { "system": "phone", "value": "916-555-0142" }
  ],
  "address": [
    {
      "use": "home",
      "line": ["1234 Oak Street"],
      "city": "Sacramento",
      "state": "CA",
      "postalCode": "95814"
    }
  ]
}
```

**FHIR Mapping:** Maps Easy Health Member → FHIR R4 Patient resource. See `docs/fhir-api-reference.md` for complete field mapping.

**Error Responses:**
- 404: `"Member not found"`

**Testing Checklist:**
- [ ] Happy path: returns valid FHIR R4 Patient
- [ ] FHIR resource validates against R4 specification
- [ ] Identifier system matches organization convention

---

### 13.2 GET /api/fhir/Encounter/:visitId

**Why This Exists:** Returns a visit as a FHIR R4 Encounter resource. Encounters are the primary clinical context resource in FHIR.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `visitId` (string) — visit ID

**Response (200):**
```json
{
  "resourceType": "Encounter",
  "id": "visit_001",
  "status": "in-progress",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "HH",
    "display": "home health"
  },
  "type": [
    {
      "coding": [
        {
          "system": "http://www.ama-assn.org/go/cpt",
          "code": "G0438",
          "display": "Annual wellness visit, initial"
        }
      ]
    }
  ],
  "subject": {
    "reference": "Patient/mbr_001"
  },
  "period": {
    "start": "2026-02-18T09:05:00.000Z"
  }
}
```

**FHIR Mapping:** Maps Easy Health Visit → FHIR R4 Encounter. See `docs/fhir-api-reference.md`.

**Error Responses:**
- 404: `"Visit not found"`

---

### 13.3 GET /api/fhir/Observation/:visitId

**Why This Exists:** Returns vitals for a visit as FHIR R4 Observation resources. Each vital sign becomes a separate Observation with appropriate LOINC coding.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `visitId` (string) — visit ID

**Response (200):**
```json
[
  {
    "resourceType": "Observation",
    "id": "obs_bp_001",
    "status": "final",
    "category": [
      {
        "coding": [
          { "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs" }
        ]
      }
    ],
    "code": {
      "coding": [
        { "system": "http://loinc.org", "code": "85354-9", "display": "Blood pressure panel" }
      ]
    },
    "subject": { "reference": "Patient/mbr_001" },
    "encounter": { "reference": "Encounter/visit_001" },
    "component": [
      {
        "code": { "coding": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic BP" }] },
        "valueQuantity": { "value": 138, "unit": "mmHg" }
      },
      {
        "code": { "coding": [{ "system": "http://loinc.org", "code": "8462-4", "display": "Diastolic BP" }] },
        "valueQuantity": { "value": 82, "unit": "mmHg" }
      }
    ]
  }
]
```

**FHIR Mapping:** Maps Easy Health Vitals → FHIR R4 Observation resources (one per vital sign panel). See `docs/fhir-api-reference.md`.

**Error Responses:**
- 404: `"Visit not found"`

---

### 13.4 GET /api/fhir/Condition/:visitId

**Why This Exists:** Returns ICD-10 diagnoses for a visit as FHIR R4 Condition resources.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `visitId` (string) — visit ID

**Response (200):**
```json
[
  {
    "resourceType": "Condition",
    "id": "cond_001",
    "clinicalStatus": {
      "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active" }]
    },
    "code": {
      "coding": [
        { "system": "http://hl7.org/fhir/sid/icd-10-cm", "code": "E11.9", "display": "Type 2 diabetes mellitus without complications" }
      ]
    },
    "subject": { "reference": "Patient/mbr_001" },
    "encounter": { "reference": "Encounter/visit_001" }
  }
]
```

**FHIR Mapping:** Maps Easy Health Visit Codes (ICD-10) → FHIR R4 Condition. See `docs/fhir-api-reference.md`.

---

### 13.5 GET /api/fhir/MedicationStatement/:visitId

**Why This Exists:** Returns medication reconciliation entries as FHIR R4 MedicationStatement resources.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `visitId` (string) — visit ID

**Response (200):**
```json
[
  {
    "resourceType": "MedicationStatement",
    "id": "ms_001",
    "status": "active",
    "medicationCodeableConcept": {
      "text": "Lisinopril 10mg"
    },
    "subject": { "reference": "Patient/mbr_001" },
    "context": { "reference": "Encounter/visit_001" },
    "dosage": [
      {
        "text": "10mg daily",
        "route": { "coding": [{ "system": "http://snomed.info/sct", "code": "26643006", "display": "Oral" }] }
      }
    ]
  }
]
```

**FHIR Mapping:** Maps Easy Health Med Reconciliation → FHIR R4 MedicationStatement. See `docs/fhir-api-reference.md`.

---

### 13.6 GET /api/fhir/Coverage/:memberId

**Why This Exists:** Returns insurance coverage information for a member as a FHIR R4 Coverage resource.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — the member's external member ID

**Response (200):**
```json
{
  "resourceType": "Coverage",
  "id": "cov_001",
  "status": "active",
  "type": {
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "MCPOL", "display": "Medicare Advantage" }]
  },
  "subscriber": { "reference": "Patient/mbr_001" },
  "beneficiary": { "reference": "Patient/mbr_001" },
  "payor": [{ "display": "Medicare Advantage Gold" }]
}
```

**Error Responses:**
- 404: `"Member not found"`

---

### 13.7 GET /api/fhir/Appointment/:visitId

**Why This Exists:** Returns a visit as a FHIR R4 Appointment resource for scheduling interoperability.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `visitId` (string) — visit ID

**Response (200):**
```json
{
  "resourceType": "Appointment",
  "id": "visit_001",
  "status": "booked",
  "appointmentType": {
    "coding": [{ "system": "http://easyhealth.com/visit-type", "code": "AWV", "display": "Annual Wellness Visit" }]
  },
  "start": "2026-02-18T09:00:00.000Z",
  "participant": [
    {
      "actor": { "reference": "Patient/mbr_001" },
      "status": "accepted"
    }
  ]
}
```

**Error Responses:**
- 404: `"Visit not found"`

---

### 13.8 POST /api/fhir/Bundle

**Why This Exists:** Imports a FHIR R4 Bundle containing multiple resources. Used to ingest patient data from health plans, HIE networks, and other FHIR-compliant systems. Supports transaction and document bundle types.

**Authorization:** Session required | Any authenticated user

**Request:**
```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:patient-001",
      "resource": {
        "resourceType": "Patient",
        "name": [{ "family": "Thompson", "given": ["Margaret"] }],
        "gender": "female",
        "birthDate": "1948-03-15"
      }
    }
  ]
}
```

**Response (200):**
```json
{
  "resourceType": "Bundle",
  "type": "transaction-response",
  "entry": [
    {
      "response": {
        "status": "201 Created",
        "location": "Patient/mbr_new_001"
      }
    }
  ]
}
```

**Error Responses:**
- 400: `"Invalid FHIR Bundle"` — bundle fails validation
- 500: Server error

**Testing Checklist:**
- [ ] Happy path: imports bundle and creates resources
- [ ] Invalid bundle returns 400
- [ ] Audit event is created for FHIR import
- [ ] HIPAA: PHI import is logged

---

### 13.9 GET /api/fhir/Bundle/visit/:visitId

**Why This Exists:** Exports a complete visit as a FHIR R4 Bundle containing Patient, Encounter, Observation, Condition, and MedicationStatement resources. Used for health plan submission and interoperability.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `visitId` (string) — visit ID

**Response (200):**
```json
{
  "resourceType": "Bundle",
  "type": "document",
  "timestamp": "2026-02-18T14:30:00.000Z",
  "entry": [
    { "fullUrl": "urn:uuid:mbr_001", "resource": { "resourceType": "Patient" } },
    { "fullUrl": "urn:uuid:visit_001", "resource": { "resourceType": "Encounter" } },
    { "fullUrl": "urn:uuid:obs_001", "resource": { "resourceType": "Observation" } },
    { "fullUrl": "urn:uuid:cond_001", "resource": { "resourceType": "Condition" } }
  ]
}
```

**Error Responses:**
- 404: `"Visit not found"`

**Testing Checklist:**
- [ ] Happy path: exports complete FHIR bundle
- [ ] Bundle includes all resource types
- [ ] Audit event created for FHIR export
- [ ] HIPAA: PHI export is logged

---

### 13.10 POST /api/fhir/PrevisitContext

**Why This Exists:** Ingests a FHIR R4 Bundle containing pre-visit intelligence from an HIE (Health Information Exchange). Processes the bundle to create suspected conditions, medication reconciliation entries, and historical vitals/labs for the member.

**Authorization:** Session required | Any authenticated user

**Request:**
```json
{
  "resourceType": "Bundle",
  "type": "document",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "identifier": [{ "value": "MA-2026-001" }],
        "name": [{ "family": "Thompson", "given": ["Margaret"] }]
      }
    },
    {
      "resource": {
        "resourceType": "Condition",
        "code": { "coding": [{ "code": "E11.9", "display": "Type 2 diabetes" }] },
        "clinicalStatus": { "coding": [{ "code": "active" }] }
      }
    },
    {
      "resource": {
        "resourceType": "MedicationStatement",
        "medicationCodeableConcept": { "text": "Lisinopril 10mg" },
        "status": "active",
        "dosage": [{ "text": "10mg daily" }]
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "code": { "coding": [{ "code": "HbA1c" }] },
        "valueQuantity": { "value": 7.2, "unit": "%" }
      }
    }
  ]
}
```

**Response (200):**
```json
{
  "memberId": "mbr_001",
  "processed": {
    "conditions": 3,
    "medications": 5,
    "vitals": 2,
    "labs": 1
  },
  "suspectedConditions": [
    {
      "id": "sc_001",
      "icdCode": "E11.9",
      "description": "Type 2 diabetes mellitus",
      "source": "hie",
      "status": "pending",
      "confidence": "high"
    }
  ],
  "medicationsAdded": 5,
  "ingestionLogId": "hie_log_001"
}
```

**Processing Logic:**
1. Identifies member by matching Patient identifiers
2. Extracts Condition resources → creates suspected conditions with status `"pending"`
3. Extracts MedicationStatement resources → creates med reconciliation entries with source `"hie_import"` and status `"new"`
4. Extracts Observation resources with vital sign codes → stores as vitals history
5. Extracts Observation resources with lab codes → stores as lab results
6. Creates an HIE ingestion log entry for audit trail

**Testing Checklist:**
- [ ] Happy path: processes bundle and creates all resource types
- [ ] Conditions become suspected conditions
- [ ] Medications are added to reconciliation with hie_import source
- [ ] Vitals history is populated
- [ ] Lab results are stored
- [ ] Ingestion log is created
- [ ] HIPAA: HIE data import is fully audit-logged

---

## 14. HIE Pre-Visit Intelligence

### 14.1 GET /api/members/:memberId/suspected-conditions

**Why This Exists:** Returns suspected conditions for a member that were identified from HIE pre-visit data. NPs review these during the visit to confirm, dismiss, or investigate further.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member ID

**Response (200):**
```json
[
  {
    "id": "sc_001",
    "memberId": "mbr_001",
    "icdCode": "E11.9",
    "description": "Type 2 diabetes mellitus without complications",
    "source": "hie",
    "sourceDetail": "Claim history - 3 encounters in past 12 months",
    "status": "pending",
    "confidence": "high",
    "lastEvidenceDate": "2025-11-15",
    "hccCategory": "Diabetes without Complication",
    "hccWeight": 0.302,
    "createdAt": "2026-02-15T10:00:00.000Z"
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns suspected conditions from HIE data
- [ ] Conditions include HCC category and weight for risk adjustment
- [ ] Status is "pending" for unreviewed conditions

---

### 14.2 PATCH /api/suspected-conditions/:id

**Why This Exists:** Updates a suspected condition's status — confirmed (adding it as a diagnosis) or dismissed (with reason). Part of the NP's clinical workflow for validating HIE-sourced data.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — suspected condition ID
```json
{
  "status": "confirmed",
  "confirmedBy": "usr_np_001",
  "confirmedAt": "2026-02-18T09:45:00.000Z",
  "notes": "Patient confirms diabetes diagnosis, currently managed with Metformin"
}
```

**Response (200):** Updated suspected condition.

**Validation Rules:**
- `status`: One of `["pending", "confirmed", "dismissed"]`
- When status is `"dismissed"`: `dismissReason` is recommended

**Error Responses:**
- 404: `"Suspected condition not found"`

**Testing Checklist:**
- [ ] Happy path: confirms suspected condition
- [ ] Dismissed condition includes reason
- [ ] Confirmed condition can trigger auto-coding

---

### 14.3 GET /api/members/:memberId/previsit-summary

**Why This Exists:** Returns a comprehensive pre-visit intelligence summary for a member, aggregating suspected conditions, medication history, vitals history, and lab results from HIE data. NPs review this before arriving at the member's home.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member ID

**Response (200):**
```json
{
  "member": {
    "id": "mbr_001",
    "name": "Margaret Thompson",
    "dateOfBirth": "1948-03-15",
    "age": 77,
    "riskScore": 1.45
  },
  "suspectedConditions": [
    {
      "icdCode": "E11.9",
      "description": "Type 2 diabetes mellitus",
      "status": "pending",
      "confidence": "high"
    }
  ],
  "medicationHistory": [
    {
      "medicationName": "Lisinopril 10mg",
      "dosage": "10mg daily",
      "prescriber": "Dr. James Wilson",
      "lastFillDate": "2026-01-15"
    }
  ],
  "vitalsHistory": [
    {
      "date": "2025-11-15",
      "systolicBp": 142,
      "diastolicBp": 86,
      "source": "PCP visit"
    }
  ],
  "labResults": [
    {
      "testName": "HbA1c",
      "value": "7.2",
      "unit": "%",
      "date": "2025-10-20",
      "normalRange": "4.0-5.6%",
      "interpretation": "Above normal - diabetes monitoring"
    }
  ],
  "hieIngestionLogs": [
    {
      "id": "hie_log_001",
      "source": "Regional HIE",
      "ingestedAt": "2026-02-15T10:00:00.000Z",
      "resourceCount": 12
    }
  ]
}
```

**Testing Checklist:**
- [ ] Happy path: returns aggregated pre-visit data
- [ ] Includes data from all HIE sources
- [ ] Medication history shows recent fills
- [ ] Lab results include normal ranges and interpretation

---

### 14.4 GET /api/members/:memberId/medication-history

**Why This Exists:** Returns medication fill history from HIE data for a member. Shows medications dispensed through pharmacy claims.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member ID

**Response (200):**
```json
[
  {
    "id": "mh_001",
    "memberId": "mbr_001",
    "medicationName": "Lisinopril 10mg",
    "ndc": "00093-7180-01",
    "prescriber": "Dr. James Wilson",
    "pharmacy": "CVS Pharmacy #4521",
    "fillDate": "2026-01-15",
    "daysSupply": 30,
    "quantity": 30,
    "source": "pharmacy_claims"
  }
]
```

---

### 14.5 GET /api/members/:memberId/vitals-history

**Why This Exists:** Returns historical vital sign readings from HIE data. Shows trends over time for clinical decision-making.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member ID

**Response (200):**
```json
[
  {
    "id": "vh_001",
    "memberId": "mbr_001",
    "recordedDate": "2025-11-15",
    "systolicBp": 142,
    "diastolicBp": 86,
    "heartRate": 74,
    "weight": 168,
    "source": "PCP visit at Sutter Health",
    "provider": "Dr. James Wilson"
  }
]
```

---

### 14.6 GET /api/members/:memberId/lab-results

**Why This Exists:** Returns lab test results from HIE data for a member. Used for clinical decision support and care gap identification.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member ID

**Response (200):**
```json
[
  {
    "id": "lab_001",
    "memberId": "mbr_001",
    "testName": "HbA1c",
    "testCode": "4548-4",
    "value": "7.2",
    "unit": "%",
    "referenceRange": "4.0-5.6",
    "interpretation": "High",
    "collectedDate": "2025-10-20",
    "resultDate": "2025-10-22",
    "orderingProvider": "Dr. James Wilson",
    "performingLab": "Quest Diagnostics"
  }
]
```

---

### 14.7 POST /api/members/:memberId/simulate-hie

**Why This Exists:** Simulates an HIE data ingestion for demo and testing purposes. Generates realistic pre-visit intelligence data for a member including suspected conditions, medications, vitals, and lab results.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member ID
```json
{
  "simulationType": "full",
  "conditionCount": 3,
  "medicationCount": 5
}
```

**Response (200):**
```json
{
  "memberId": "mbr_001",
  "simulated": {
    "conditions": 3,
    "medications": 5,
    "vitals": 2,
    "labs": 3
  },
  "message": "HIE simulation complete for Margaret Thompson"
}
```

**Testing Checklist:**
- [ ] Happy path: creates simulated HIE data
- [ ] Suspected conditions are created with realistic ICD-10 codes
- [ ] Medications include common geriatric prescriptions
- [ ] Lab results include HbA1c, lipid panel, etc.

---

### 14.8 GET /api/visits/:id/hie-ingestion-logs

**Why This Exists:** Returns HIE ingestion log entries for a visit, showing when and what data was imported from external sources.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `id` (string) — visit ID

**Response (200):**
```json
[
  {
    "id": "hie_log_001",
    "visitId": "visit_001",
    "source": "Regional HIE",
    "bundleType": "previsit_context",
    "resourceCount": 12,
    "conditionsFound": 3,
    "medicationsFound": 5,
    "ingestedAt": "2026-02-15T10:00:00.000Z",
    "status": "success"
  }
]
```

---

### 14.9 GET /api/members/:memberId/plan-targets

**Why This Exists:** Returns health plan-specific quality targets for a member. These targets are set by the health plan and represent HEDIS or STARS measures that the plan is tracking for this member.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member ID

**Response (200):**
```json
[
  {
    "id": "pt_001",
    "memberId": "mbr_001",
    "measureCode": "COL",
    "measureName": "Colorectal Cancer Screening",
    "targetYear": 2026,
    "status": "open",
    "priority": "high",
    "planName": "Medicare Advantage Gold"
  }
]
```

---

### 14.10 POST /api/members/:memberId/plan-targets

**Why This Exists:** Creates a plan-specific quality target for a member.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member ID
```json
{
  "measureCode": "CDC",
  "measureName": "Comprehensive Diabetes Care",
  "targetYear": 2026,
  "status": "open",
  "priority": "medium",
  "planName": "Medicare Advantage Gold"
}
```

**Error Responses:**
- 500: Server error

---

## 15. Administration

### 15.1 GET /api/plan-packs

**Why This Exists:** Returns all plan pack configurations. Plan packs define the visit requirements (assessments, measures, checklists) for each health plan and visit type combination.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "pp_001",
    "planId": "plan_ma_001",
    "planName": "Medicare Advantage Gold",
    "visitType": "AWV",
    "requiredAssessments": ["phq2", "prapare"],
    "requiredMeasures": ["COL", "BCS", "CDC"],
    "requiredChecklists": ["fall_risk", "advance_directives", "home_safety"],
    "cptCodes": ["G0438", "G0439"],
    "isActive": true
  }
]
```

**Testing Checklist:**
- [ ] Happy path: returns all plan packs
- [ ] Plan packs include assessment, measure, and checklist requirements

---

### 15.2 PUT /api/plan-packs/:id

**Why This Exists:** Updates a plan pack configuration. Used by admins to modify visit requirements based on health plan contract changes.

**Authorization:** Session required | Role: Admin

**Request:**
- Path params: `id` (string) — plan pack ID
```json
{
  "requiredAssessments": ["phq2", "phq9", "prapare"],
  "requiredMeasures": ["COL", "BCS", "CDC", "CBP"]
}
```

**Response (200):** Updated plan pack.

**Error Responses:**
- 404: `"Plan pack not found"`

---

### 15.3 POST /api/assessment-definitions

**Why This Exists:** Creates a new assessment instrument definition. Used by admins to add new screening tools to the platform.

**Authorization:** Session required | Any authenticated user

**Request:**
```json
{
  "id": "gad7",
  "name": "GAD-7 Generalized Anxiety Disorder",
  "description": "Seven-item anxiety screening instrument",
  "category": "behavioral_health",
  "scoringMethod": "sum",
  "maxScore": 21,
  "cutoffs": [
    { "label": "Minimal", "min": 0, "max": 4 },
    { "label": "Mild", "min": 5, "max": 9 },
    { "label": "Moderate", "min": 10, "max": 14 },
    { "label": "Severe", "min": 15, "max": 21 }
  ],
  "questions": [],
  "isActive": true
}
```

**Response (200):** Created assessment definition.

---

### 15.4 POST /api/measure-definitions

**Why This Exists:** Creates a new HEDIS measure definition. Used by admins to add new quality measures to the platform.

**Authorization:** Session required | Any authenticated user

**Request:**
```json
{
  "id": "CBP",
  "name": "Controlling High Blood Pressure",
  "description": "Adults 18-85 with hypertension whose BP was adequately controlled",
  "category": "chronic_conditions",
  "hedisCode": "CBP",
  "isActive": true
}
```

**Response (200):** Created measure definition.

---

### 15.5 GET /api/demo-config

**Why This Exists:** Returns the current demo mode configuration including watermark text, restricted modules, and export limits.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
{
  "demoMode": true,
  "watermarkText": "DEMO MODE",
  "allowedRoles": null,
  "restrictedModules": null,
  "maxExportsPerDay": 10,
  "updatedAt": "2026-02-15T10:00:00.000Z",
  "updatedBy": "usr_admin_001"
}
```

---

### 15.6 PUT /api/demo-config

**Why This Exists:** Updates the demo mode configuration. Only admins can toggle demo mode and configure restrictions.

**Authorization:** Session required | Role: Admin (enforced by `requireRole`)

**Request:**
```json
{
  "demoMode": true,
  "watermarkText": "DEMO - NOT FOR CLINICAL USE",
  "maxExportsPerDay": 5,
  "restrictedModules": ["fhir_export", "audit"]
}
```

**Response (200):** Updated demo config.

**Error Responses:**
- 401: Not authenticated (missing x-user-role/x-user-id headers)
- 403: Insufficient permissions (non-admin role)

**Testing Checklist:**
- [ ] Happy path: admin updates demo config
- [ ] Non-admin role returns 403
- [ ] Audit event is created for config change
- [ ] HIPAA: configuration changes are logged

---

### 15.7 GET /api/access-log

**Why This Exists:** Returns filtered audit events focused on access governance — logins, access denials, exports, FHIR operations, and review decisions. Used by compliance officers to monitor system access.

**Authorization:** Session required | Role: Admin, Compliance (enforced by `requireRole`)

**Response (200):**
```json
[
  {
    "id": "ae_001",
    "eventType": "login",
    "userId": "usr_np_001",
    "userName": "Sarah Chen, NP",
    "userRole": "np",
    "details": "Successful login",
    "resourceType": null,
    "resourceId": null,
    "timestamp": "2026-02-18T08:55:00.000Z"
  },
  {
    "id": "ae_002",
    "eventType": "access_denied",
    "userId": "usr_np_001",
    "userName": "Sarah Chen, NP",
    "userRole": "np",
    "details": "Access denied to PUT /api/demo-config - required roles: admin",
    "timestamp": "2026-02-18T09:00:00.000Z"
  }
]
```

**Filtered Event Types:** `login`, `access_denied`, `demo_config_updated`, `export`, `fhir_export`, `review_decision`, `audit_assignment`, `audit_outcome`

**Error Responses:**
- 401: Not authenticated
- 403: Insufficient permissions (non-admin/non-compliance role)

**Testing Checklist:**
- [ ] Happy path: returns filtered access events
- [ ] Non-admin/non-compliance role returns 403
- [ ] Events are limited to 200 most recent
- [ ] All access event types are represented

---

### 15.8 GET /api/audit-events

**Why This Exists:** Returns all audit events across the platform. Used for comprehensive compliance reporting and HIPAA audit trail.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "ae_001",
    "eventType": "login",
    "userId": "usr_np_001",
    "userName": "Sarah Chen, NP",
    "userRole": "np",
    "details": "Successful login",
    "resourceType": null,
    "resourceId": null,
    "visitId": null,
    "timestamp": "2026-02-18T08:55:00.000Z"
  }
]
```

---

### 15.9 GET /api/completeness-rules

**Why This Exists:** Returns all completeness rules that define what constitutes a "complete" visit. Used by the finalization gating system.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "cr_001",
    "ruleName": "Vitals Required",
    "category": "documentation",
    "condition": "vitals_exist",
    "severity": "blocker",
    "message": "Vitals must be documented before finalization",
    "isActive": true
  }
]
```

---

### 15.10 GET /api/reason-codes

**Why This Exists:** Returns all configured reason codes used across the platform for review returns, overrides, dismissals, and exclusions.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "id": "rc_001",
    "category": "review_return",
    "code": "insufficient_documentation",
    "description": "Documentation does not meet minimum requirements",
    "isActive": true
  }
]
```

---

## 16. Compliance & Audit

### 16.1 GET /api/audit-assignments

**Why This Exists:** Returns all audit assignments — visits selected for quality audit review. Supports compliance workflows where a random sample of visits are reviewed for documentation accuracy and coding appropriateness.

**Authorization:** Session required | Role: Admin, Compliance, Supervisor (enforced by `requireRole`)

**Response (200):**
```json
[
  {
    "id": "aa_001",
    "visitId": "visit_001",
    "assignedTo": "usr_comp_001",
    "assignedToName": "Jennifer Adams, CPC",
    "status": "pending",
    "priority": "normal",
    "samplingReason": "Random 20% sample",
    "assignedAt": "2026-02-18T12:00:00.000Z",
    "completedAt": null,
    "memberName": "Margaret Thompson",
    "scheduledDate": "2026-02-18",
    "visitStatus": "finalized"
  }
]
```

**Error Responses:**
- 401: Not authenticated
- 403: Insufficient permissions

**Testing Checklist:**
- [ ] Happy path: returns enriched audit assignments
- [ ] Enrichment includes member name and visit details
- [ ] Role restriction enforced (admin, compliance, supervisor only)

---

### 16.2 POST /api/audit-assignments

**Why This Exists:** Creates a manual audit assignment for a specific visit.

**Authorization:** Session required | Role: Admin, Compliance (enforced by `requireRole`)

**Request:**
```json
{
  "visitId": "visit_001",
  "assignedTo": "usr_comp_001",
  "assignedToName": "Jennifer Adams, CPC",
  "status": "pending",
  "priority": "high",
  "samplingReason": "Supervisor referral - coding query"
}
```

**Response (200):** Created audit assignment.

**Error Responses:**
- 401: Not authenticated
- 403: Insufficient permissions

**Testing Checklist:**
- [ ] Happy path: creates assignment with audit trail
- [ ] Audit event is created for the assignment
- [ ] Non-compliance role returns 403

---

### 16.3 POST /api/audit-assignments/sample

**Why This Exists:** Performs automated random sampling of finalized visits for audit. Selects a configurable percentage of eligible visits that haven't already been assigned for audit.

**Authorization:** Session required | Role: Admin, Compliance (enforced by `requireRole`)

**Request:**
```json
{
  "samplePercent": 20,
  "criteria": "Q1 2026 finalized visits"
}
```

**Response (200):**
```json
{
  "sampled": 4,
  "total": 20,
  "assignments": [
    {
      "id": "aa_002",
      "visitId": "visit_003",
      "status": "pending",
      "samplingReason": "Random 20% sample - Q1 2026 finalized visits"
    }
  ]
}
```

**Validation Rules:**
- `samplePercent`: Integer, defaults to 20. Percentage of eligible visits to sample
- Eligible visits: status `"finalized"` or `"in_progress"` and not already assigned
- Sampling is random (Fisher-Yates shuffle)

**Testing Checklist:**
- [ ] Happy path: samples correct percentage of eligible visits
- [ ] Already-assigned visits are excluded
- [ ] Audit event is created for sampling action
- [ ] Sample size is at least 1

---

### 16.4 PUT /api/audit-assignments/:id

**Why This Exists:** Updates an audit assignment (e.g., changing status, reassigning).

**Authorization:** Session required | Role: Admin, Compliance (enforced by `requireRole`)

**Request:**
- Path params: `id` (string) — assignment ID
```json
{
  "status": "in_progress",
  "assignedTo": "usr_comp_002"
}
```

**Error Responses:**
- 404: `"Assignment not found"`

---

### 16.5 GET /api/audit-assignments/:id/outcomes

**Why This Exists:** Returns audit outcomes for a specific assignment. Shows the detailed findings from the compliance audit.

**Authorization:** Session required | Role: Admin, Compliance, Supervisor (enforced by `requireRole`)

**Request:**
- Path params: `id` (string) — assignment ID

**Response (200):**
```json
[
  {
    "id": "ao_001",
    "assignmentId": "aa_001",
    "visitId": "visit_001",
    "findings": [
      {
        "category": "coding",
        "finding": "ICD-10 E11.9 supported by HbA1c result and medication documentation",
        "severity": "none",
        "recommendation": "No action required"
      },
      {
        "category": "documentation",
        "finding": "MEAT criteria partially met for hypertension diagnosis - missing treatment plan",
        "severity": "minor",
        "recommendation": "Add treatment plan to progress note assessment section"
      }
    ],
    "overallSeverity": "minor",
    "recommendation": "return_for_correction",
    "completedBy": "usr_comp_001",
    "completedAt": "2026-02-19T14:00:00.000Z"
  }
]
```

---

### 16.6 POST /api/audit-outcomes

**Why This Exists:** Records the outcome of a compliance audit. Creates findings, severity assessment, and recommendations. Automatically marks the associated assignment as completed.

**Authorization:** Session required | Role: Admin, Compliance (enforced by `requireRole`)

**Request:**
```json
{
  "assignmentId": "aa_001",
  "visitId": "visit_001",
  "findings": [
    {
      "category": "coding",
      "finding": "CPT G0438 appropriately supported by AWV documentation",
      "severity": "none",
      "recommendation": "No action required"
    }
  ],
  "overallSeverity": "none",
  "recommendation": "approve",
  "completedBy": "usr_comp_001",
  "completedByName": "Jennifer Adams, CPC",
  "comments": "Visit documentation meets all quality and compliance requirements"
}
```

**Response (200):** Created audit outcome.

**Validation Rules:**
- `assignmentId`: Required, must reference existing assignment
- `overallSeverity`: One of `["none", "minor", "moderate", "major", "critical"]`
- `recommendation`: One of `["approve", "return_for_correction", "escalate", "flag_for_review"]`
- Assignment status is automatically updated to `"completed"`

**Error Responses:**
- 401: Not authenticated
- 403: Insufficient permissions

**Testing Checklist:**
- [ ] Happy path: creates outcome and completes assignment
- [ ] Assignment status changes to "completed"
- [ ] Audit event is created for the outcome
- [ ] HIPAA: audit outcomes are immutably logged

---

## 17. Demo & Testing Utilities

### 17.1 POST /api/demo/reset

**Why This Exists:** Resets the entire demo database by clearing all tables and re-seeding with sample data. Used to return the demo environment to a known state for presentations and testing.

**Authorization:** Session required | Any authenticated user

**Request:** No body required.

**Response (200):**
```json
{
  "success": true,
  "message": "Database reset and re-seeded successfully"
}
```

**Tables cleared (in order):**
`visit_alerts`, `note_edits`, `note_signatures`, `extracted_fields`, `transcripts`, `voice_recordings`, `ai_provider_config`, `review_sign_offs`, `visit_consents`, `audit_events`, `export_artifacts`, `review_decisions`, `validation_overrides`, `visit_recommendations`, `visit_codes`, `clinical_notes`, `vitals_records`, `measure_results`, `assessment_responses`, `required_checklists`, `care_plan_tasks`, `med_reconciliation`, `lab_results`, `medication_history`, `vitals_history`, `objective_exclusions`, `plan_targets`, `visits`, `members`, `clinical_rules`, `plan_packs`, `measure_definitions`, `assessment_definitions`, `users`, `reason_codes`, `completeness_rules`, `diagnosis_rules`

**Error Responses:**
- 500: Server error (database reset failure)

**Testing Checklist:**
- [ ] Happy path: all tables cleared and re-seeded
- [ ] Seed data includes users, members, visits, assessments, measures
- [ ] Application is functional after reset

---

### 17.2 GET /api/demo/fhir-bundles

**Why This Exists:** Generates FHIR R4 bundles for all members and their visits. Used for testing FHIR interoperability and demonstrating data export capabilities.

**Authorization:** Session required | Any authenticated user

**Response (200):**
```json
[
  {
    "memberId": "MA-2026-001",
    "memberName": "Margaret Thompson",
    "visitCount": 2,
    "bundle": {
      "resourceType": "Bundle",
      "type": "document",
      "timestamp": "2026-02-18T14:30:00.000Z",
      "entry": [
        { "fullUrl": "urn:uuid:mbr_001", "resource": { "resourceType": "Patient" } },
        { "fullUrl": "urn:uuid:visit_001", "resource": { "resourceType": "Encounter" } }
      ]
    }
  }
]
```

**Testing Checklist:**
- [ ] Happy path: generates bundles for all members
- [ ] Each bundle includes Patient, Encounter, and clinical resources
- [ ] Bundles are valid FHIR R4 format

---

### 17.3 GET /api/demo/fhir-bundle/:memberId

**Why This Exists:** Generates a FHIR R4 bundle for a specific member and all their visits.

**Authorization:** Session required | Any authenticated user

**Request:**
- Path params: `memberId` (string) — member's external member ID (e.g., `"MA-2026-001"`)

**Response (200):**
```json
{
  "resourceType": "Bundle",
  "type": "document",
  "timestamp": "2026-02-18T14:30:00.000Z",
  "entry": [
    { "fullUrl": "urn:uuid:mbr_001", "resource": { "resourceType": "Patient" } }
  ]
}
```

**Error Responses:**
- 404: `"Member not found"`

---

### 17.4 GET /api/demo/sample-import-bundle

**Why This Exists:** Returns a pre-built sample FHIR bundle from the server's demo data files. Used to demonstrate FHIR bundle import functionality without requiring external data.

**Authorization:** Session required | Any authenticated user

**Response (200):** A complete FHIR R4 Bundle loaded from `server/data/demo-fhir-bundle.json`.

**Error Responses:**
- 500: Server error (file not found or parse failure)

---

### 17.5 GET /api/fhir/demo-bundle

**Why This Exists:** Alias endpoint for the demo FHIR bundle, accessible under the FHIR namespace for consistency with other FHIR endpoints.

**Authorization:** Session required | Any authenticated user

**Response (200):** Same as `GET /api/demo/sample-import-bundle` — a pre-built FHIR R4 Bundle.

---

### 17.6 GET /api/fhir/demo-hie-bundle

**Why This Exists:** Returns a pre-built HIE pre-visit FHIR bundle for testing the PrevisitContext ingestion endpoint. Contains sample conditions, medications, vitals, and lab results.

**Authorization:** Session required | Any authenticated user

**Response (200):** A complete FHIR R4 Bundle loaded from `server/data/demo-hie-previsit-bundle.json`.

**Error Responses:**
- 500: Server error (file not found or parse failure)

---

## Appendix A: Common Error Response Shapes

All error responses follow this structure:

```json
{
  "message": "Human-readable error description"
}
```

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Missing required fields, invalid enum values, malformed JSON |
| 401 | Unauthorized | Missing `x-user-id` or `x-user-role` headers, invalid session |
| 403 | Forbidden | Insufficient role permissions, visit is locked after sign-off |
| 404 | Not Found | Resource ID does not exist in database |
| 500 | Internal Server Error | Database errors, unexpected exceptions, file system errors |

## Appendix B: Visit Status Lifecycle

```
scheduled → in_progress → completed → finalized
                                          ↓
                                    [supervisor sign-off]
                                          ↓
                                       locked
                                    (no further edits)
```

If returned for rework:
```
finalized → completed (rework) → finalized (resubmit) → locked
```

## Appendix C: Visit Locking Logic

A visit is considered **locked** when:
1. The visit has a supervisor sign-off record
2. AND the sign-off decision is `"approve"`

When locked, the following operations return `403`:
- PATCH /api/visits/:id
- POST /api/visits/:id/vitals
- POST /api/visits/:id/assessment-responses
- POST /api/visits/:id/measure-results
- POST /api/visits/:id/med-reconciliation
- POST /api/visits/:id/identity-verification
- POST /api/visits/:id/consents
- POST /api/visits/:id/recordings
- POST /api/visits/:id/transcripts
- POST /api/visits/:id/clinical-notes
- POST /api/visits/:id/note-edits
- POST /api/visits/:id/codes
- POST /api/visits/:id/overrides
- POST /api/visits/:id/recommendations
- POST /api/visits/:id/care-plan-tasks
- POST /api/visits/:id/required-checklists
- POST /api/visits/:id/exclusions
- POST /api/visits/:id/alerts
- POST /api/visits/:id/export

## Appendix D: Auto-Coding Reference

| Clinical Finding | Generated Code | Type | MEAT Requirement |
|-----------------|---------------|------|------------------|
| Visit type AWV (initial) | G0438 | CPT | HRA + depression screening + functional assessment |
| Visit type AWV (subsequent) | G0439 | CPT | HRA + depression screening + functional assessment |
| Visit type IHE (new) | 99345 | CPT | Vitals + assessment + care plan |
| Visit type IHE (established) | 99350 | CPT | Vitals + assessment + care plan |
| PHQ-2 or PHQ-9 completed | 96127 | CPT | Standardized screening instrument |
| Systolic > 140 or Diastolic > 90 | I10 | ICD-10 | BP readings documented |
| BMI > 30 | E66.9 | ICD-10 | Weight and height documented |
| BMI 25–29.9 | E66.3 | ICD-10 | Weight and height documented |
| PHQ-2 ≥ 3 or PHQ-9 ≥ 10 | F32.9 | ICD-10 | Screening score documented |
| PRAPARE social risk factors | Z59.7 | ICD-10 | SDOH assessment documented |
| HbA1c measure met | E11.9 | ICD-10 | Lab results or measure documentation |

## Appendix E: Assessment Scoring Quick Reference

| Instrument | Method | Range | Cutoffs |
|-----------|--------|-------|---------|
| PHQ-2 | Sum | 0–6 | ≥3: escalate to PHQ-9 |
| PHQ-9 | Sum | 0–27 | 0–4: minimal, 5–9: mild, 10–14: moderate, 15–19: moderately severe, 20–27: severe |
| PRAPARE | Count | Variable | Count of domains with social risk factors identified |
| AWV HRA | Structured | N/A | Structured assessment with completion tracking per domain |
| GAD-7 | Sum | 0–21 | 0–4: minimal, 5–9: mild, 10–14: moderate, 15–21: severe |

## Appendix F: RBAC requireRole Implementation

The `requireRole` middleware checks:
1. `x-user-role` and `x-user-id` headers are present (returns 401 if missing)
2. User's role is in the allowed roles list OR user's role is `"admin"` (admin bypasses all role checks)
3. If access is denied, an `"access_denied"` audit event is created with the attempted path and required roles
4. Returns 403 with `"Insufficient permissions"` message

**Role hierarchy (who can access what):**
```
admin → can access everything
supervisor → admin, supervisor endpoints
compliance → admin, compliance endpoints
np → admin, np endpoints
care_coordinator → admin, care_coordinator endpoints
```
