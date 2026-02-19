# Easy Health HIPAA Security & Privacy Implementation Guide

**Document Version:** 1.0
**Last Updated:** February 19, 2026
**Classification:** Internal — Engineering & Compliance
**Owner:** Easy Health Engineering & Compliance Teams

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [PHI Data Classification](#2-phi-data-classification)
3. [Encryption Requirements](#3-encryption-requirements)
4. [Access Control Model](#4-access-control-model)
5. [Audit Logging](#5-audit-logging)
6. [PHI Handling Policies](#6-phi-handling-policies)
7. [Breach Notification Procedures](#7-breach-notification-procedures)
8. [Business Associate Agreements](#8-business-associate-agreements)
9. [Developer Security Checklist](#9-developer-security-checklist)
10. [Incident Response Plan](#10-incident-response-plan)

---

## 1. Executive Summary

### 1.1 Why HIPAA Matters for Easy Health

Easy Health is an in-home clinical visit platform serving Medicare Advantage and ACA patients. Every transaction in the system involves Protected Health Information (PHI):

- **Patient demographics** flow through scheduling, visit assignment, and care coordination.
- **Clinical data** (vitals, diagnoses, medications, assessments) is captured during in-home NP visits.
- **Voice recordings and AI-generated transcripts** contain verbatim clinical conversations.
- **FHIR R4 bundles** exchange comprehensive patient records with Health Information Exchanges (HIEs) and payers.
- **Offline-cached data** on iOS devices stores PHI in IndexedDB for field use.

A single in-home visit generates PHI across 20+ database tables, external AI services, FHIR exports, and mobile device caches. HIPAA compliance is not optional — it is foundational to every feature we build.

### 1.2 Regulatory Framework

Easy Health must comply with three HIPAA rules:

| Rule | Scope | Key Requirements |
|---|---|---|
| **Privacy Rule** (45 CFR 164.500–534) | Governs use and disclosure of PHI | Minimum necessary standard, patient rights, Notice of Privacy Practices (NOPP) |
| **Security Rule** (45 CFR 164.302–318) | Protects electronic PHI (ePHI) | Administrative, physical, and technical safeguards |
| **Breach Notification Rule** (45 CFR 164.400–414) | Requires notification after breaches | 60-day notification to individuals, HHS, and media (if 500+ affected) |

Additionally, as a platform serving Medicare Advantage populations, Easy Health must align with CMS requirements and HEDIS/NCQA quality standards that impose their own data integrity and documentation expectations.

### 1.3 Compliance Posture

| Area | Status | Notes |
|---|---|---|
| Authentication & MFA | **Implemented** | Session-based auth with admin-configurable 6-digit OTP MFA |
| Role-Based Access Control | **Implemented** | 5 roles with `requireRole` middleware; admin implicit bypass |
| Biometric Authentication | **Implemented** | iOS Face ID/Touch ID via Capacitor NativeBiometric plugin |
| Session Timeout & Auto-Lock | **Implemented** | Configurable timeout (default 30 min) with lock screen |
| Audit Logging | **Implemented** | `audit_events` table captures login, access denied, PHI operations |
| Voice Consent Gate | **Implemented** | Recording blocked without explicit `voice_transcription` consent |
| Data Encryption in Transit | **Implemented** | TLS for all API traffic; base64 audio in POST body over HTTPS |
| Data Encryption at Rest | **Managed** | Neon PostgreSQL (AES-256), iOS Data Protection, Azure SSE |
| Password Complexity Enforcement | **Gap** | No server-side password policy enforcement (plaintext comparison) |
| PHI in Application Logs | **Gap** | MFA codes logged to console; AI extraction results logged |
| Session Server-Side Storage | **Gap** | Sessions stored client-side in `localStorage` |
| Log Retention Policy | **Gap** | No automated 6-year retention or archival |
| Remote Device Wipe | **Gap** | No mechanism to remotely clear IndexedDB on lost devices |
| BAAs | **Organizational** | Must be executed with Neon, Azure, HIE partners |
| Risk Assessment | **Organizational** | Annual HIPAA risk assessment required |
| Workforce Training | **Organizational** | Security awareness training required for all users |

---

## 2. PHI Data Classification

### 2.1 Comprehensive PHI Inventory

#### Patient Demographics (High Sensitivity)

| Data Element | DB Table / Column | Storage Location | PHI Category | Sensitivity | Access Control |
|---|---|---|---|---|---|
| First Name | `members.first_name` | PostgreSQL | Demographics | High | All authenticated roles |
| Last Name | `members.last_name` | PostgreSQL | Demographics | High | All authenticated roles |
| Date of Birth | `members.dob` | PostgreSQL | Demographics | High | All authenticated roles |
| Gender | `members.gender` | PostgreSQL | Demographics | Medium | All authenticated roles |
| Phone Number | `members.phone` | PostgreSQL | Demographics | High | All authenticated roles |
| Email | `members.email` | PostgreSQL | Demographics | Medium | All authenticated roles |
| Street Address | `members.address` | PostgreSQL | Demographics | High | All authenticated roles |
| City / State / ZIP | `members.city`, `state`, `zip` | PostgreSQL | Demographics | High | All authenticated roles |
| Medicare/Member ID | `members.member_id` | PostgreSQL | Demographics | High | All authenticated roles |
| Insurance Plan | `members.insurance_plan` | PostgreSQL | Financial | High | All authenticated roles |
| PCP Name | `members.pcp` | PostgreSQL | Clinical | Medium | All authenticated roles |

#### Clinical Data (High Sensitivity)

| Data Element | DB Table / Column | Storage Location | PHI Category | Sensitivity | Access Control |
|---|---|---|---|---|---|
| Vital Signs (BP, HR, RR, Temp, SpO2, Weight, Height, BMI, Pain) | `vitals_records.*` | PostgreSQL, IndexedDB | Clinical | High | NP (record), Supervisor (review), All (view) |
| Vitals History | `vitals_history.*` | PostgreSQL | Clinical | High | All authenticated roles |
| Diagnoses / Conditions | `members.conditions`, `visit_codes` | PostgreSQL | Clinical | High | NP, Supervisor, Admin |
| Medications | `members.medications`, `medication_history` | PostgreSQL | Clinical | High | All authenticated roles |
| Medication Reconciliation | `med_reconciliation.*` | PostgreSQL | Clinical | High | NP, Supervisor |
| Allergies | `members.allergies` | PostgreSQL | Clinical | High | All authenticated roles |
| Risk Flags | `members.risk_flags` | PostgreSQL | Clinical | High | All authenticated roles |
| Lab Results | `lab_results.*` | PostgreSQL | Clinical | High | All authenticated roles |
| Assessment Responses (PHQ-2, PHQ-9, PRAPARE) | `assessment_responses.*` | PostgreSQL | Clinical | High | NP, Supervisor |
| Clinical Notes (HPI, ROS, Exam, Assessment, Plan) | `clinical_notes.*` | PostgreSQL | Clinical | High | NP, Supervisor |
| Chief Complaint | `clinical_notes.chief_complaint` | PostgreSQL | Clinical | High | NP, Supervisor |
| Care Plan Tasks | `care_plan_tasks.*` | PostgreSQL | Clinical | Medium | NP, Supervisor, Care Coordinator |
| Plan Targets | `plan_targets.*` | PostgreSQL | Clinical | Medium | All authenticated roles |
| Suspected Conditions (HIE) | `suspected_conditions.*` | PostgreSQL | Clinical | High | NP, Supervisor |
| Visit Recommendations | `visit_recommendations.*` | PostgreSQL | Clinical | Medium | NP, Supervisor |
| Visit Codes (CPT, HCPCS, ICD-10) | `visit_codes.*` | PostgreSQL | Clinical/Financial | High | NP, Supervisor, Compliance |
| Measure Results (HEDIS) | `measure_results.*` | PostgreSQL | Clinical | Medium | NP, Supervisor, Compliance |

#### Visit Data (Medium–High Sensitivity)

| Data Element | DB Table / Column | Storage Location | PHI Category | Sensitivity | Access Control |
|---|---|---|---|---|---|
| Scheduled Date/Time | `visits.scheduled_date`, `scheduled_time` | PostgreSQL, IndexedDB | Clinical | Medium | All authenticated roles |
| Visit Status | `visits.status` | PostgreSQL, IndexedDB | Clinical | Medium | All authenticated roles |
| Visit Type | `visits.visit_type` | PostgreSQL | Clinical | Medium | All authenticated roles |
| NP Assignment | `visits.np_user_id` | PostgreSQL | Clinical | Medium | All authenticated roles |
| Identity Verification Status | `visits.identity_verified`, `identity_method` | PostgreSQL | Clinical | Medium | NP, Supervisor |
| Attestation/Signature | `visits.signed_at`, `signed_by`, `attestation_text` | PostgreSQL | Clinical | High | NP, Supervisor |
| Travel/Safety Notes | `visits.travel_notes`, `safety_notes` | PostgreSQL | Clinical | Medium | NP, Care Coordinator |
| Lock Status | `visits.locked_at`, `locked_by` | PostgreSQL | Administrative | Low | Supervisor, Admin |

#### Voice / AI Data (High Sensitivity)

| Data Element | DB Table / Column | Storage Location | PHI Category | Sensitivity | Access Control |
|---|---|---|---|---|---|
| Audio Recording (base64) | `voice_recordings.audio_data` | PostgreSQL, Azure (in-transit) | Clinical/Biometric | High | NP (create), Supervisor (review) |
| Recording Metadata | `voice_recordings.*` (duration, mime, consent) | PostgreSQL | Clinical | Medium | NP, Supervisor |
| Transcript Text | `transcripts.text` | PostgreSQL | Clinical | High | NP, Supervisor |
| Transcript AI Provider/Model | `transcripts.provider_type`, `model` | PostgreSQL | Administrative | Low | Admin |
| Extracted Clinical Fields | `extracted_fields.*` | PostgreSQL | Clinical | High | NP, Supervisor |
| AI Extraction Confidence | `extracted_fields.confidence` | PostgreSQL | Administrative | Low | NP, Supervisor |
| Source Snippets | `extracted_fields.source_snippet` | PostgreSQL | Clinical | High | NP, Supervisor |

#### FHIR / Exchange Data (High Sensitivity)

| Data Element | DB Table / Column | Storage Location | PHI Category | Sensitivity | Access Control |
|---|---|---|---|---|---|
| FHIR Bundle JSON | `export_artifacts.file_data` | PostgreSQL | Comprehensive PHI | High | NP, Supervisor, Admin |
| HIE Inbound Bundles | `hie_ingestion_log.*` | PostgreSQL | Clinical | High | System, NP, Supervisor |
| FHIR Patient Resource | In-memory / API | In-transit | Demographics | High | API consumers |
| FHIR Encounter Resource | In-memory / API | In-transit | Clinical | High | API consumers |
| FHIR Observation Resources | In-memory / API | In-transit | Clinical | High | API consumers |
| FHIR Condition Resources | In-memory / API | In-transit | Clinical | High | API consumers |

#### Consent & Administrative Records

| Data Element | DB Table / Column | Storage Location | PHI Category | Sensitivity | Access Control |
|---|---|---|---|---|---|
| Voice Transcription Consent | `visit_consents.*` | PostgreSQL | Administrative | Medium | NP, Supervisor, Compliance |
| NOPP Acknowledgement | `visit_consents.*` (type=nopp) | PostgreSQL | Administrative | Medium | NP, Supervisor, Compliance |
| Note Edits / Amendments | `note_edits.*` | PostgreSQL | Clinical | High | NP, Supervisor |
| Note Signatures | `note_signatures.*` | PostgreSQL | Administrative | Medium | NP, Supervisor |
| Review Decisions | `review_decisions.*` | PostgreSQL | Administrative | Medium | Supervisor, Admin |
| Review Sign-Offs | `review_sign_offs.*` | PostgreSQL | Administrative | Medium | Supervisor, Compliance |
| Audit Assignments / Outcomes | `audit_assignments.*`, `audit_outcomes.*` | PostgreSQL | Administrative | Medium | Admin, Compliance |
| Validation Overrides | `validation_overrides.*` | PostgreSQL | Clinical | Medium | NP |

### 2.2 PHI in Transit Flows

```
[iOS Device] --HTTPS/TLS 1.2+--> [Easy Health API Server]
      |                                    |
      |-- IndexedDB (cached PHI)           |-- PostgreSQL (Neon, AES-256 at rest)
      |-- Capacitor Bridge                 |-- Azure Speech Services (audio → text)
      |                                    |-- Azure OpenAI (text → structured fields)
      |                                    |-- FHIR API (inbound/outbound bundles)
```

---

## 3. Encryption Requirements

### 3.1 Data at Rest

| Storage Layer | Encryption Method | Key Management | Status |
|---|---|---|---|
| **PostgreSQL (Neon)** | AES-256 transparent data encryption | Neon-managed keys | Active (managed service) |
| **IndexedDB (iOS devices)** | iOS Data Protection (file-level encryption tied to device passcode) | Apple Secure Enclave | Active (OS-level) |
| **IndexedDB (Web browsers)** | Browser-managed; no guaranteed encryption | N/A | Risk: Data may be accessible if device is compromised |
| **Azure Blob Storage** (if used for audio) | Azure Storage Service Encryption (SSE) with Microsoft-managed keys | Azure Key Vault (recommended: customer-managed keys) | Verify with Azure config |
| **Backups (Neon)** | Neon encrypts backups at rest | Neon-managed | Active (managed service) |
| **Export Artifacts** | Stored as JSON text in `export_artifacts.file_data` | PostgreSQL encryption applies | Active |

**Recommendations:**
- Enable customer-managed keys (CMK) in Azure Key Vault for Azure storage if audio files are persisted in Blob Storage.
- Evaluate whether `voice_recordings.audio_data` (base64 audio stored directly in PostgreSQL) should be migrated to Azure Blob Storage with CMK for defense-in-depth.
- Implement application-level encryption for highly sensitive fields (SSN, if ever collected) using envelope encryption.

### 3.2 Data in Transit

| Communication Path | Protocol | Implementation | Status |
|---|---|---|---|
| **iOS App → API Server** | HTTPS (TLS 1.2+) | Enforced by Capacitor HTTP plugin and server config | Active |
| **Web Browser → API Server** | HTTPS (TLS 1.2+) | Enforced by hosting infrastructure | Active |
| **API Server → Neon PostgreSQL** | TLS (Neon enforces TLS connections) | `DATABASE_URL` uses `sslmode=require` | Active |
| **API Server → Azure Speech Services** | HTTPS (TLS 1.2+) | Azure SDK enforces TLS | Active |
| **API Server → Azure OpenAI** | HTTPS (TLS 1.2+) | `fetch()` calls to Azure endpoints over HTTPS | Active |
| **API Server → OpenAI API** | HTTPS (TLS 1.2+) | OpenAI SDK enforces TLS | Active |
| **FHIR API (inbound/outbound)** | HTTPS (TLS 1.2+) | Server-to-server REST calls | Active |
| **Audio Upload (base64)** | HTTPS POST body | Audio encoded as base64 string in JSON body, transmitted over TLS | Active |
| **WebSocket (if used)** | WSS (TLS-encrypted WebSocket) | Ensure `wss://` protocol | Verify |
| **Capacitor Native Bridge** | In-process communication | No network transit; data stays within app sandbox | Active (iOS sandbox) |

**Critical Controls:**
- API keys are transmitted in HTTP headers (`api-key`, `x-api-key`) or request body — never in URL query parameters. Verified in `routes.ts` lines 5232–5236.
- The `x-user-id`, `x-user-name`, `x-user-role` headers are used for authentication context. These headers should only be trusted from the application's own frontend; in production, implement server-side session validation rather than relying on client-supplied headers.

### 3.3 Key Management

| Secret | Storage Method | Rotation | Status |
|---|---|---|---|
| **Database credentials** (`DATABASE_URL`) | Environment variable (Replit Secrets) | Manual rotation; update connection string | Active |
| **Azure Speech API Key** | Environment variable (configurable via `ai_provider_config.api_key_secret_name`) | Manual rotation; update env var | Active |
| **Azure OpenAI API Key** | Environment variable (`AZURE_OPENAI_API_KEY`) | Manual rotation | Active |
| **OpenAI API Key** | Environment variable (`OPENAI_API_KEY`) | Manual rotation | Active |
| **Session Secret** | Not currently implemented (no express-session with secret) | N/A | Gap: Implement server-side sessions |
| **MFA Codes** | Stored in `mfa_codes` table with TTL and attempt limits | Auto-expire per `mfaCodeTtlSeconds` | Active |

**Recommendations:**
- Migrate secrets to Azure Key Vault in production deployments for centralized rotation, auditing, and access control.
- Implement automated key rotation schedules (90-day rotation for API keys).
- Never log secrets or API keys. Current gap: MFA codes are logged to console (`console.log(\`[MFA] Code for ${user.username}: ${code}\``)) in `routes.ts` lines 90, 206. This must be removed before production deployment.
- Conduct periodic secret scanning of codebase and environment.

---

## 4. Access Control Model

### 4.1 Authentication

#### 4.1.1 Authentication Flow

```
1. User submits username + password to POST /api/auth/login
2. Server looks up user by username, compares password (plaintext comparison)
3. If MFA is enabled (admin-configurable):
   a. Server checks if user's role is in the MFA bypass list
   b. If MFA required: Generate 6-digit OTP, store in mfa_codes table, return mfaRequired=true
   c. User submits OTP to POST /api/auth/verify-mfa
   d. Server validates code, checks expiry, checks attempt count
4. On success: Return user object (without password field)
5. Client stores user in localStorage as "feh_user"
6. Subsequent requests include x-user-id, x-user-name, x-user-role headers
```

**Current Implementation Notes:**
- Passwords are stored and compared in plaintext (`routes.ts` line 57: `user.password !== password`). **This is a critical gap.** Production deployment must use bcrypt or Argon2 for password hashing.
- Authentication state is maintained client-side in `localStorage`. The server does not maintain sessions. This means the server trusts the `x-user-id` and `x-user-role` headers sent by the client, which could be spoofed. **Production must implement server-side session management** (e.g., `express-session` with `connect-pg-simple`).

#### 4.1.2 Multi-Factor Authentication (MFA)

MFA is fully implemented with admin-configurable settings:

| Setting | DB Column | Default | Description |
|---|---|---|---|
| MFA Required | `security_settings.mfa_required` | `false` | Global MFA toggle |
| Biometric Required | `security_settings.biometric_required` | `false` | iOS biometric gate toggle |
| Session Timeout | `security_settings.session_timeout_minutes` | `30` | Inactivity timeout in minutes |
| MFA Code TTL | `security_settings.mfa_code_ttl_seconds` | `300` | OTP validity window (5 minutes) |
| Max MFA Attempts | `security_settings.max_mfa_attempts` | `5` | Lockout after N failed attempts |
| Bypass Roles | `security_settings.bypass_roles` | `[]` | Roles exempt from MFA |

**MFA Flow Details:**
- OTP is a 6-digit numeric code generated via `Math.floor(100000 + Math.random() * 900000)`.
- Code is stored in the `mfa_codes` table with `expires_at` timestamp and `attempts` counter.
- Each verification attempt increments the counter; exceeding `maxMfaAttempts` returns HTTP 429.
- Expired codes return HTTP 400 with a message to request a new code.
- Successfully verified codes are marked `verified=true` to prevent reuse.
- Resend functionality generates a new code via `POST /api/auth/resend-mfa`.
- Masked phone number (`***1234`) is shown to the user for delivery confirmation.

**Recommendation:** Replace `Math.random()` with a cryptographically secure random number generator (`crypto.randomInt()`) for OTP generation.

#### 4.1.3 Password Requirements

| Requirement | Current Status | HIPAA Recommendation |
|---|---|---|
| Minimum length | Not enforced | 12+ characters |
| Complexity (upper, lower, digit, special) | Not enforced | Required |
| Password history | Not tracked | Prevent reuse of last 6 passwords |
| Expiration | Not implemented | 90-day rotation for privileged accounts |
| Hashing algorithm | None (plaintext) | bcrypt with cost factor 12+ or Argon2id |
| Account lockout | Partial (MFA attempts only) | Lock after 5 failed login attempts for 30 minutes |

#### 4.1.4 Biometric Authentication (iOS)

Biometric authentication is implemented using the Capacitor `NativeBiometric` plugin:

- Availability is checked on app load via `NativeBiometric.isAvailable()`.
- When `biometricRequired` is enabled in security settings, a biometric gate (`BiometricGate` component) presents before the main app content.
- Authentication uses `NativeBiometric.verifyIdentity()` with configurable prompts.
- Falls back gracefully to password authentication if biometrics are unavailable or fail.
- Biometric state is managed per-session (does not persist across app restarts).

### 4.2 Authorization (RBAC)

#### 4.2.1 Role Definitions

| Role | Key | Description |
|---|---|---|
| **Nurse Practitioner** | `np` | Primary clinical user; conducts in-home visits, records data, manages patient encounters |
| **Supervisor** | `supervisor` | Physician/supervisor who reviews and approves NP visit documentation |
| **Care Coordinator** | `care_coordinator` | Manages care plans, follow-up tasks, and member coordination |
| **Admin** | `admin` | System administrator; manages security settings, demo config, user accounts |
| **Compliance** | `compliance` | Reviews audit logs, manages audit assignments, ensures regulatory compliance |

#### 4.2.2 Comprehensive Permissions Matrix

| Capability | NP | Supervisor | Care Coord | Admin | Compliance |
|---|---|---|---|---|---|
| **Visit Management** | | | | | |
| View own visits | Y | - | - | - | - |
| View all visits | Y | Y | Y | Y | Y |
| Create/schedule visits | Y | Y | - | Y | - |
| Update visit status | Y | Y | - | Y | - |
| Lock/approve visits | - | Y | - | Y | - |
| **Clinical Documentation** | | | | | |
| Record vitals | Y | - | - | - | - |
| Edit clinical notes | Y | - | - | - | - |
| Complete assessments (PHQ-2, PHQ-9, PRAPARE) | Y | - | - | - | - |
| Record measure results | Y | - | - | - | - |
| Perform medication reconciliation | Y | - | - | - | - |
| Override validation warnings | Y | - | - | - | - |
| Sign/attest visit documentation | Y | Y | - | - | - |
| **Voice / AI** | | | | | |
| Create voice recordings | Y | - | - | - | - |
| Trigger transcription | Y | - | - | - | - |
| Trigger AI field extraction | Y | - | - | - | - |
| Accept/reject extracted fields | Y | - | - | - | - |
| View transcripts | Y | Y | - | - | - |
| **Review & Approval** | | | | | |
| Submit visit for review | Y | - | - | - | - |
| Review and approve/return visits | - | Y | - | Y | - |
| Sign off with quality scoring | - | Y | - | - | - |
| View review history | Y | Y | - | Y | Y |
| **Care Coordination** | | | | | |
| View care plan tasks | Y | Y | Y | Y | - |
| Create/update care plan tasks | Y | Y | Y | - | - |
| Manage member records | Y | Y | Y | Y | - |
| **FHIR / Export** | | | | | |
| Export FHIR bundle | Y | Y | - | Y | - |
| Access FHIR API endpoints | Y | Y | - | Y | - |
| Import FHIR bundles | - | - | - | Y | - |
| View export artifacts | Y | Y | - | Y | Y |
| **Administration** | | | | | |
| Update security settings (MFA, timeout) | - | - | - | Y | - |
| Update demo configuration | - | - | - | Y | - |
| View access logs | - | - | - | Y | Y |
| Manage audit assignments | - | - | - | Y | Y |
| Create audit outcomes | - | - | - | Y | Y |
| View audit assignments | - | Y | - | Y | Y |
| Configure AI providers | - | - | - | Y | - |
| Manage plan packs | - | - | - | Y | - |
| **Identity Verification** | | | | | |
| Verify patient identity | Y | - | - | - | - |
| **Consent Management** | | | | | |
| Capture consent (voice, NOPP) | Y | - | - | - | - |
| View consent status | Y | Y | - | Y | Y |

#### 4.2.3 How RBAC Is Implemented

**`requireRole` Middleware** (`routes.ts` lines 6460–6479):

```typescript
function requireRole(allowedRoles: string[]) {
  return (req, res, next) => {
    const userRole = req.headers["x-user-role"];
    const userId = req.headers["x-user-id"];
    if (!userRole || !userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!allowedRoles.includes(userRole) && userRole !== "admin") {
      // Audit log the access denial
      storage.createAuditEvent({
        eventType: "access_denied",
        userId, userName: req.headers["x-user-name"],
        userRole,
        details: `Access denied to ${req.method} ${req.path} - required roles: ${allowedRoles.join(", ")}`,
      });
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
```

Key behaviors:
- The `admin` role implicitly bypasses all role checks (`userRole !== "admin"` condition).
- Access denials are automatically logged to the `audit_events` table.
- Role information comes from the `x-user-role` HTTP header, set by the client from the stored user object.

**Endpoints Protected by `requireRole`:**

| Endpoint | Allowed Roles |
|---|---|
| `PUT /api/security-settings` | `admin` |
| `PUT /api/demo-config` | `admin` |
| `GET /api/access-log` | `admin`, `compliance` |
| `GET /api/audit-assignments` | `admin`, `compliance`, `supervisor` |
| `POST /api/audit-assignments` | `admin`, `compliance` |
| `POST /api/audit-assignments/sample` | `admin`, `compliance` |
| `PUT /api/audit-assignments/:id` | `admin`, `compliance` |
| `GET /api/audit-assignments/:id/outcomes` | `admin`, `compliance`, `supervisor` |
| `POST /api/audit-outcomes` | `admin`, `compliance` |

**Gap:** Most clinical endpoints (visits, vitals, assessments, voice recordings) do not use `requireRole` middleware and are accessible to any authenticated user. This is partially by design (NPs need broad clinical access), but should be reviewed to ensure Care Coordinators and Compliance users cannot modify clinical data.

#### 4.2.4 Default Demo User Accounts

| Username | Full Name | Role | Purpose |
|---|---|---|---|
| `sarah.np` | Sarah Johnson, NP | `np` | Primary NP demo user |
| `michael.np` | Michael Chen, NP | `np` | Secondary NP demo user |
| `dr.williams` | Dr. Lisa Williams | `supervisor` | Supervisor/physician reviewer |
| `emma.coord` | Emma Davis | `care_coordinator` | Care coordination workflows |
| `admin` | System Admin | `admin` | System administration |
| `compliance` | Robert Taylor | `compliance` | Compliance and audit workflows |

All demo accounts use the password `password`. **These must be changed or disabled before production deployment.**

#### 4.2.5 Role Escalation Prevention

- Users cannot change their own role; roles are assigned at account creation.
- The `requireRole` middleware prevents unauthorized access to admin/compliance endpoints.
- Access denials are audit-logged for review.
- **Gap:** There is no endpoint to modify user roles, which means role changes require direct database modification. In production, implement a dedicated user management API with appropriate admin-only access controls.

### 4.3 Session Security

#### 4.3.1 Session Timeout and Auto-Lock

Implemented in `client/src/lib/auth.tsx`:

- **Configurable timeout:** Retrieved from `GET /api/security-settings` (`sessionTimeoutMinutes`, default: 30 minutes).
- **Activity tracking:** Monitors `mousedown`, `keydown`, `touchstart`, and `scroll` events to reset the inactivity timer.
- **Auto-lock behavior:** When timeout expires, `sessionLocked` state is set to `true`, triggering the `SessionLockScreen` component.
- **Unlock flow:** User must re-enter their password via `POST /api/auth/unlock`, which validates credentials server-side.
- **Persistence:** Last activity timestamp is stored in `localStorage` as `feh_last_activity` to maintain timeout state across page reloads.
- **Logout option:** Users can choose to fully log out from the lock screen instead of unlocking.

#### 4.3.2 Session Storage

| Aspect | Current Implementation | HIPAA Recommendation |
|---|---|---|
| Session location | Client-side `localStorage` (`feh_user`) | Server-side session store (PostgreSQL via `connect-pg-simple`) |
| Session identifier | None (full user object stored client-side) | Cryptographically random session ID in HTTP-only, secure cookie |
| Session validation | Client-side only (headers sent on each request) | Server validates session ID on every request |
| Concurrent sessions | Not restricted | Limit to 1 active session per user |
| Session invalidation | `localStorage.removeItem()` on logout | Server-side session destruction + cookie clearing |
| CSRF protection | Not implemented | Implement CSRF tokens or SameSite cookies |

#### 4.3.3 Critical Session Security Recommendations

1. **Implement server-side sessions** using `express-session` with `connect-pg-simple` for PostgreSQL-backed session storage.
2. **Use HTTP-only, Secure, SameSite cookies** for session identifiers to prevent XSS-based session theft.
3. **Validate sessions server-side** on every API request instead of trusting client-supplied headers.
4. **Implement session revocation** to allow admins to forcefully terminate active sessions.
5. **Add concurrent session limits** to prevent credential sharing.

---

## 5. Audit Logging

### 5.1 Audit Event Schema

The `audit_events` table captures security and PHI access events:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key (auto-generated) |
| `event_type` | text | Category of event (see below) |
| `user_id` | varchar | ID of the acting user |
| `user_name` | text | Display name of the acting user |
| `user_role` | text | Role of the acting user |
| `patient_id` | varchar | ID of the affected patient (if applicable) |
| `visit_id` | varchar | ID of the affected visit (if applicable) |
| `resource_type` | text | Type of resource accessed (e.g., `voice_recording`, `transcript`) |
| `resource_id` | varchar | ID of the specific resource |
| `details` | text | Human-readable description of the event |
| `ip_address` | text | Client IP address (currently not populated) |
| `timestamp` | timestamp | Auto-generated server timestamp |

### 5.2 Logged Event Types

| Event Type | When Triggered | PHI Involved? |
|---|---|---|
| `login` | Successful login, MFA code sent, MFA verified, failed MFA | No (user identity only) |
| `access_denied` | `requireRole` middleware blocks unauthorized access | No (path and role logged) |
| `voice_recording_created` | NP creates a voice recording for a visit | Yes (visit ID, recording ID) |
| `transcription_completed` | AI transcription finishes processing | Yes (recording ID, transcript ID) |
| `extraction_completed` | AI field extraction completes | Yes (transcript ID, field count) |
| `visit_exported` | FHIR bundle exported for a visit | Yes (visit ID) |
| `fhir_bundle_imported` | Inbound FHIR bundle processed | Yes (resource count) |
| `fhir_patient_created` | Patient created via FHIR API | Yes (patient ID) |
| `fhir_patient_updated` | Patient updated via FHIR API | Yes (patient ID) |
| `demo_config_updated` | Admin changes demo or security settings | No |
| `review_decision` | Supervisor approves/returns a visit | Yes (visit ID) |
| `audit_assignment` | Compliance assigns an audit | Yes (visit ID) |
| `audit_outcome` | Compliance records audit outcome | Yes (visit ID, severity) |
| `audit_sampling` | Automated audit sampling run | No (aggregate count) |

### 5.3 Logging Gaps

| Gap | Description | Recommendation |
|---|---|---|
| **Per-request PHI access** | Not every API request that returns PHI is logged (e.g., `GET /api/visits/:id/bundle` returns comprehensive PHI but is not audit-logged) | Implement middleware to log all PHI-accessing endpoints |
| **IP address** | `ip_address` column exists but is not populated | Capture `req.ip` or `x-forwarded-for` header |
| **Read access logging** | Only write operations and auth events are logged; read access to PHI is not captured | Add read-access audit events for PHI endpoints |
| **User-agent tracking** | Not captured | Log device/browser for suspicious activity detection |
| **PHI in log details** | Some `details` fields may contain patient names or visit specifics | Review and sanitize log content |

### 5.4 Log Retention

HIPAA requires documentation retention for **6 years** from the date of creation or last effective date (45 CFR 164.530(j)).

| Requirement | Current Status | Recommendation |
|---|---|---|
| Retention period | No automated retention policy | Implement 6-year minimum retention with archival to cold storage |
| Tamper protection | No write-once guarantee | Consider append-only tables or external log aggregation (e.g., Azure Monitor, Splunk) |
| Log backup | Relies on Neon PostgreSQL backups | Implement separate log export/backup pipeline |
| Log review | `GET /api/access-log` API (admin/compliance only) | Implement scheduled log review procedures and anomaly alerting |
| Log search | Filters by event type, returns latest 200 events | Implement full-text search, date range filtering, and pagination |

### 5.5 Access Log API

The compliance review API at `GET /api/access-log` is protected by `requireRole(["admin", "compliance"])` and returns the latest 200 events filtered to security-relevant event types:
- `login`, `access_denied`, `demo_config_updated`, `export`, `fhir_export`, `review_decision`, `audit_assignment`, `audit_outcome`

---

## 6. PHI Handling Policies

### 6.1 Minimum Necessary Standard

The HIPAA Minimum Necessary Standard (45 CFR 164.502(b)) requires that access to PHI be limited to the minimum necessary to accomplish the intended purpose.

**Current Implementation:**

| Area | Implementation | Status |
|---|---|---|
| Dashboard endpoints | Return aggregate counts (e.g., `todayVisits`, `inProgress`, `completed`) without individual PHI | Compliant |
| Visit list endpoint | Returns enriched visit data with member names | Review: Consider whether full names are necessary in list views |
| Recording list | Audio data replaced with `[base64_audio]` placeholder in list responses (`routes.ts` line 4833) | Compliant |
| Password exclusion | Password field is explicitly excluded from all user API responses (`const { password: _, ...safeUser } = user`) | Compliant |
| FHIR bundles | Contain comprehensive PHI (demographics, vitals, conditions, observations); unavoidable for interoperability | Compliant (FHIR standard requires complete data) |
| Visit overview | Aggregates 17+ data queries into a single response with full clinical detail | Review: Large payload may exceed minimum necessary for some use cases |

**Recommendations:**
- Implement field-level filtering based on user role (e.g., Care Coordinators may not need lab result details).
- Add query parameters to control response verbosity (e.g., `?fields=summary` vs `?fields=full`).
- Ensure error responses never contain PHI (review all `catch` blocks for potential PHI leakage through `err.message`).

### 6.2 Voice Recording PHI

Voice recordings represent some of the highest-risk PHI in the system because they contain verbatim clinical conversations.

#### 6.2.1 Consent Gate

Before any recording can be created, the system enforces a consent check (`routes.ts` lines 4844–4848):

```typescript
const consents = await storage.getConsentsByVisit(req.params.id);
const voiceConsent = consents.find(
  (c) => c.consentType === "voice_transcription" && c.status === "granted"
);
if (!voiceConsent) {
  return res.status(403).json({
    message: "Voice transcription consent not granted. Recording is not permitted."
  });
}
```

This consent gate is enforced at:
- `POST /api/visits/:id/recordings` (recording creation)
- `POST /api/visits/:id/extract-assessment` (assessment extraction from transcript)

The `consentId` of the granting consent record is stored on the recording for traceability.

#### 6.2.2 Audio Data Lifecycle

| Stage | Location | PHI Risk | Control |
|---|---|---|---|
| **Capture** | iOS device microphone → in-memory buffer | High | Consent gate required; recording only during active visit |
| **Transmission** | Base64-encoded in HTTPS POST body | High | TLS 1.2+ encryption in transit |
| **Storage** | `voice_recordings.audio_data` (PostgreSQL TEXT column) | High | Neon AES-256 at rest |
| **Transcription** | Sent to Azure Speech Services or OpenAI Whisper | High | BAA required with AI provider; temp file on server during conversion |
| **Temp Files** | Server `/tmp` directory during ffmpeg conversion | High | Files are deleted immediately after use (`fs.unlinkSync`) |
| **Purge** | Not currently implemented | High | Implement retention policy: purge audio after transcription + review period |

**Recommendations:**
- Implement automated audio purge after a configurable retention period (e.g., 90 days post-visit finalization).
- Ensure `/tmp` files are cleaned up even on process crash (consider `tmp-promise` or OS-level tmpdir cleanup).
- Add file size limits for audio uploads to prevent DoS.

#### 6.2.3 AI Processing (PHI in Transit to Third Parties)

| AI Service | Data Sent | PHI Content | BAA Status |
|---|---|---|---|
| **Azure Speech Services** | WAV audio (converted from webm/mp4) | Verbatim clinical conversation | Required |
| **Azure OpenAI** | Transcript text + extraction prompt | Verbatim clinical text, patient conditions, vitals | Required |
| **OpenAI API** | Audio file (Whisper) or transcript text (GPT) | Same as above | Required |
| **Anthropic API** | Transcript text + extraction prompt | Same as above | Required |

**Critical:** A Business Associate Agreement (BAA) must be in place with every AI service provider that processes PHI. Azure offers BAAs through their enterprise agreements. OpenAI offers BAAs for API customers. Verify BAA status with Anthropic if used.

### 6.3 FHIR Data Exchange

#### 6.3.1 PHI in FHIR Bundles

A single visit export generates a comprehensive FHIR R4 Bundle containing:

- **Patient Resource:** Full demographics (name, DOB, gender, address, phone, member ID, insurance)
- **Encounter Resource:** Visit type, status, date, provider assignment
- **Observation Resources:** All vital signs (BP, HR, RR, Temp, SpO2, Weight, Height, BMI, Pain)
- **Condition Resources:** All ICD-10 diagnoses with evidence mapping
- **MedicationStatement Resources:** Active medications with dosage
- **QuestionnaireResponse Resources:** PHQ-2, PHQ-9, PRAPARE assessment responses
- **DocumentReference Resources:** Clinical notes, progress notes
- **Procedure Resources:** Services performed during visit
- **Claim Resources:** CPT/HCPCS codes for billing

A typical visit bundle contains 80+ FHIR entries.

#### 6.3.2 Inbound FHIR Data (HIE)

The `POST /api/fhir/Bundle` endpoint accepts inbound FHIR bundles from HIEs:

- Processes Patient, Condition, Observation, MedicationStatement, AllergyIntolerance resources.
- Tracks provenance via `hie_ingestion_log` table (source system, resource count, processing status).
- Creates `suspected_conditions` from imported Condition resources for NP review.
- Logs ingestion events to `audit_events`.

#### 6.3.3 Export Controls

| Control | Implementation | Status |
|---|---|---|
| Export trigger | `POST /api/visits/:id/export` | No role restriction (gap) |
| Export audit | Logged as `visit_exported` event | Active |
| Export count tracking | `export_artifacts.download_count` | Active |
| Demo mode export limit | `demo_config.max_exports_per_day` (default 10) | Active |
| Export artifact storage | Full FHIR JSON stored in `export_artifacts.file_data` | Active |

**Recommendation:** Add `requireRole(["np", "supervisor", "admin"])` to the export endpoint.

### 6.4 Offline Data (IndexedDB)

#### 6.4.1 What Gets Cached

The `offline-db.ts` module stores PHI in three IndexedDB object stores:

| Store | Key Path | Content | PHI Level |
|---|---|---|---|
| `apiCache` | `url` | Cached API responses (visit bundles, member data, vitals) | High |
| `mutationQueue` | Auto-increment `id` | Pending write operations (vitals, assessments, notes) | High |
| `blobStore` | `id` | Audio recordings (Blob objects) | High |

All cached data includes `visitId` for scoping and `createdAt` for staleness tracking.

#### 6.4.2 Device Loss/Theft Risk

| Risk | Mitigation | Status |
|---|---|---|
| Unauthorized access to cached PHI | iOS Data Protection encrypts files at rest; device passcode required | Active (iOS only) |
| Web browser IndexedDB exposure | No encryption beyond browser sandboxing | Risk on non-iOS devices |
| Stale data accumulation | `clearCacheForVisit()` and `clearAllCache()` functions available | Manual only |
| Lost/stolen device | No remote wipe capability | Gap |
| Shared device scenarios | Session lock screen requires password to unlock | Active |

#### 6.4.3 Recommendations

- **Implement remote wipe:** Add a server-side "device revocation" flag that triggers IndexedDB clearing on next app open.
- **Implement TTL-based cache purge:** Automatically clear cached data older than 24 hours.
- **Limit offline data scope:** Only cache data for today's scheduled visits, not all visits.
- **Use iOS Keychain** for storing session tokens and sensitive authentication data instead of `localStorage`.
- **Encrypt IndexedDB data** at the application level using Web Crypto API before storing.

---

## 7. Breach Notification Procedures

### 7.1 What Constitutes a Breach

Under HIPAA, a breach is the acquisition, access, use, or disclosure of unsecured PHI in a manner not permitted by the Privacy Rule that compromises the security or privacy of the PHI (45 CFR 164.402).

**Examples relevant to Easy Health:**

| Scenario | Breach? | Notes |
|---|---|---|
| Lost/stolen iOS device with cached PHI in IndexedDB | Potential | If device is passcode-protected and data is encrypted, presumption of breach may be rebutted |
| Unauthorized API access due to spoofed headers | Yes | Current header-based auth is vulnerable |
| AI provider data breach (Azure/OpenAI) | Yes | PHI was shared with BA; BA's breach triggers notification |
| MFA code logged to console and exposed in server logs | Potential | Could allow unauthorized access |
| FHIR bundle sent to wrong recipient | Yes | Unauthorized disclosure of comprehensive PHI |
| NP accessing patient records outside their assignment | Potential | Depends on whether access was within treatment scope |
| Database backup compromised | Yes (if unencrypted) | Neon encrypts backups; breach risk is low |

### 7.2 Breach Assessment (4-Factor Test)

For each suspected breach, conduct the following risk assessment (45 CFR 164.402(2)):

1. **Nature and extent of PHI involved** — What types of identifiers and clinical data were exposed?
2. **Unauthorized person** — Who accessed or received the PHI?
3. **Whether PHI was actually acquired or viewed** — Was data merely accessible, or actually accessed?
4. **Extent of risk mitigation** — What steps were taken to reduce harm?

### 7.3 Notification Timeline

| Notification | Deadline | Recipient | Trigger |
|---|---|---|---|
| **Individual Notice** | Within 60 days of discovery | Each affected individual | Any breach of unsecured PHI |
| **HHS Secretary** | Within 60 days (if 500+ affected) or annual log (if <500) | U.S. Department of HHS | Any breach |
| **Media Notice** | Within 60 days (if 500+ in a single state/jurisdiction) | Prominent media outlets in affected area | Breach affecting 500+ individuals in one state |

### 7.4 Breach Log Template

Maintain a breach log with the following fields:

| Field | Description |
|---|---|
| Incident ID | Unique identifier |
| Date Discovered | When the breach was identified |
| Date of Breach | When the breach occurred (if different) |
| Description | Nature of the breach |
| PHI Types Involved | Categories of PHI exposed (demographics, clinical, financial) |
| Number of Individuals | Count of affected patients |
| Source of Breach | System, device, or person involved |
| Action Taken | Mitigation and remediation steps |
| Individuals Notified | Date and method of notification |
| HHS Notified | Date reported to HHS |
| Root Cause | Technical or procedural failure |
| Corrective Actions | Changes implemented to prevent recurrence |
| Responsible Party | Person managing the incident |

### 7.5 Documentation Requirements

All breach-related documentation must be retained for **6 years** (45 CFR 164.530(j)), including:
- Risk assessments
- Notification letters
- Mitigation evidence
- Corrective action plans
- Investigation reports

---

## 8. Business Associate Agreements (BAA)

### 8.1 Required BAAs

Any third party that creates, receives, maintains, or transmits PHI on behalf of Easy Health is a Business Associate and requires a BAA.

| Business Associate | Service | PHI Exposure | BAA Status |
|---|---|---|---|
| **Neon (PostgreSQL)** | Database hosting | All ePHI stored in PostgreSQL | Required — Verify with Neon |
| **Microsoft Azure (Cognitive Services)** | Speech-to-text transcription | Audio recordings containing clinical conversations | Required — Available through Azure Enterprise Agreement |
| **Microsoft Azure (OpenAI Service)** | Clinical data extraction | Transcript text with patient health information | Required — Available through Azure Enterprise Agreement |
| **OpenAI** | Whisper transcription, GPT extraction (if used) | Audio files and transcript text | Required — Available for API customers |
| **Anthropic** | Claude extraction (if configured) | Transcript text with PHI | Required — Verify availability |
| **HIE Partners** | Health information exchange | FHIR bundles with comprehensive patient data | Required — Data use agreements per partner |
| **Hosting Provider (Production)** | Application hosting | All data in transit and at rest | Required — Depends on production hosting choice |
| **Apple (App Store / TestFlight)** | App distribution | No PHI in app binary; device-local only | Not required (no PHI access) |

### 8.2 BAA Checklist

Each BAA must include the following provisions (45 CFR 164.504(e)):

- [ ] Permitted uses and disclosures of PHI
- [ ] Obligation not to use or disclose PHI other than as permitted
- [ ] Implementation of appropriate safeguards (administrative, physical, technical)
- [ ] Reporting of any security incidents or breaches
- [ ] Ensuring any subcontractors also agree to BAA terms
- [ ] Making PHI available to individuals exercising their access rights
- [ ] Making PHI available for amendment by individuals
- [ ] Providing an accounting of disclosures
- [ ] Making internal practices and records available to HHS for compliance review
- [ ] Return or destruction of PHI upon contract termination
- [ ] Breach notification obligations and timeline (within 60 days)

### 8.3 BAA Management

| Action | Frequency | Responsible |
|---|---|---|
| Inventory all BAs | Annually | Compliance Officer |
| Verify BAA execution | Before service deployment | Legal / Compliance |
| Review BAA terms | Annually or upon contract renewal | Legal |
| Assess BA compliance | Annually | Compliance Officer |
| Update BAA for service changes | As needed | Legal / Compliance |

---

## 9. Developer Security Checklist

Use this checklist when building any new feature for Easy Health:

### Pre-Development

- [ ] **PHI Impact Assessment:** Does this feature create, read, update, or delete PHI? If yes, document the PHI types involved and update the PHI Data Classification table (Section 2).
- [ ] **Role Requirements:** Which roles should have access to this feature? Document and implement using `requireRole` middleware.
- [ ] **Data Flow Diagram:** If PHI crosses system boundaries (device → server → third party), document the flow.

### Implementation

- [ ] **Authentication Required:** Is every new API endpoint authenticated? No unauthenticated endpoints should return PHI.
- [ ] **Role Restrictions Applied:** Are `requireRole()` guards applied to all sensitive endpoints?
- [ ] **Input Validation:** Is user input validated using Zod schemas before processing?
- [ ] **No PHI in Logs:** Does `console.log()`, `console.error()`, or any logging framework avoid outputting PHI (patient names, member IDs, clinical data, MFA codes)?
- [ ] **Safe Error Messages:** Do error responses avoid leaking PHI? (No patient data in `err.message` sent to clients.)
- [ ] **Password Handling:** Are passwords hashed (not compared in plaintext)?
- [ ] **Secrets Management:** Are API keys, database credentials, and other secrets accessed via environment variables (never hardcoded)?
- [ ] **TLS Enforcement:** Is all data transmitted over HTTPS/TLS?
- [ ] **Encryption at Rest:** Is any new data store encrypted at rest?
- [ ] **Audit Logging:** Are PHI access events logged to the `audit_events` table with appropriate event type, user, and resource details?
- [ ] **Consent Verification:** If the feature involves voice/recording, is consent verified before data capture?
- [ ] **Visit Lock Check:** If modifying visit data, does the endpoint check for visit lock status (`checkVisitLock()`)?

### Testing

- [ ] **Multi-Role Testing:** Has the feature been tested with all 5 roles to verify access controls?
- [ ] **Unauthorized Access Testing:** Does the feature correctly return 401/403 for unauthorized users?
- [ ] **Audit Log Verification:** Do audit events appear correctly in the access log?
- [ ] **Error Path Testing:** Do error scenarios avoid PHI exposure?

### Offline & Mobile

- [ ] **Offline Caching:** If the feature is available offline, what PHI is cached in IndexedDB?
- [ ] **Cache Scope:** Is cached data scoped to the minimum necessary (specific visit, not all visits)?
- [ ] **Cache Purge:** Is there a mechanism to clear cached data when it's no longer needed?
- [ ] **Biometric Gate:** Does the feature respect the biometric authentication gate on iOS?

### Third-Party Integration

- [ ] **BAA Verification:** If using Azure AI or any external service that processes PHI, verify a BAA is in place.
- [ ] **Data Minimization:** Is only the minimum necessary PHI sent to external services?
- [ ] **Response Handling:** Is PHI returned from external services handled securely (not logged, stored with encryption)?
- [ ] **Temp File Cleanup:** If temporary files are created (e.g., audio conversion), are they deleted immediately after use?

### Documentation

- [ ] **PHI Inventory Updated:** Has the PHI Data Classification table been updated if new PHI types are introduced?
- [ ] **Permissions Matrix Updated:** Has the RBAC matrix been updated with new capabilities?
- [ ] **Audit Event Types Updated:** Are new audit event types documented?

---

## 10. Incident Response Plan

### 10.1 Security Incident Classification

| Severity | Classification | Examples | Response Time |
|---|---|---|---|
| **P1 — Critical** | Active breach with confirmed PHI exposure | Database compromise, stolen device with unencrypted PHI, unauthorized data exfiltration | Immediate (within 1 hour) |
| **P2 — High** | Potential breach requiring investigation | Suspicious login patterns, failed MFA brute force, unauthorized API access attempt | Within 4 hours |
| **P3 — Medium** | Security vulnerability without active exploitation | Missing role check on endpoint, PHI found in logs, unpatched dependency | Within 24 hours |
| **P4 — Low** | Security improvement opportunity | Configuration hardening, policy update needed, documentation gap | Within 1 week |

### 10.2 Escalation Procedures

```
1. Engineer discovers or is alerted to incident
   └→ 2. Notify Engineering Lead immediately
       └→ 3. Engineering Lead assesses severity
           ├→ P1/P2: Notify Compliance Officer + CTO within 1 hour
           │   └→ 4. Compliance Officer activates Breach Assessment (Section 7)
           │       └→ 5. Legal counsel engaged within 24 hours
           │           └→ 6. HHS notification if breach confirmed (within 60 days)
           └→ P3/P4: Track in incident log, schedule remediation
```

### 10.3 Containment Steps

**Immediate Actions (P1/P2):**

1. **Isolate the affected system** — If a server is compromised, restrict network access. If a device is lost, attempt remote lock.
2. **Revoke compromised credentials** — Rotate API keys, invalidate sessions, reset passwords for affected accounts.
3. **Preserve evidence** — Capture audit logs, server logs, database query logs before any cleanup.
4. **Block attack vector** — If the breach exploited a specific vulnerability, deploy an immediate fix or disable the affected feature.
5. **Notify affected users** — If their credentials may be compromised, force password reset.

**For Device Loss/Theft:**
1. Attempt remote device lock (iOS MDM if deployed).
2. Assess what PHI was cached in IndexedDB (based on recent sync logs).
3. If device is passcode-protected with iOS Data Protection, document the encryption status for breach risk assessment.
4. Invalidate any cached sessions/tokens.

### 10.4 Investigation Process

1. **Timeline reconstruction** — Use `audit_events` table to trace user actions leading to the incident.
2. **Scope assessment** — Identify all PHI potentially exposed (query `audit_events` by `user_id`, `patient_id`, `visit_id`).
3. **Root cause analysis** — Determine the technical or procedural failure.
4. **Impact quantification** — Count affected individuals and categorize PHI types exposed.
5. **Breach determination** — Apply the 4-factor risk assessment (Section 7.2).

### 10.5 Recovery Procedures

1. **Remediate the vulnerability** — Fix the root cause (code change, configuration update, process change).
2. **Verify the fix** — Test the remediation in a staging environment.
3. **Deploy the fix** — Push to production with verification.
4. **Monitor for recurrence** — Implement enhanced monitoring for the specific attack pattern.
5. **Update security controls** — Add new audit events, role checks, or encryption as needed.
6. **Document lessons learned** — Update this guide, the developer checklist, and training materials.
7. **Conduct post-incident review** — Within 2 weeks, hold a review meeting with engineering, compliance, and leadership.

### 10.6 Incident Log Template

| Field | Description |
|---|---|
| Incident ID | Unique identifier (e.g., INC-2026-001) |
| Date/Time Detected | When the incident was discovered |
| Date/Time of Incident | When the incident occurred |
| Detected By | Person or system that identified the incident |
| Severity | P1, P2, P3, or P4 |
| Description | Detailed description of the incident |
| Systems Affected | Specific components (API, database, mobile app, AI service) |
| PHI Exposure | Types and volume of PHI potentially exposed |
| Individuals Affected | Count and identification method |
| Containment Actions | Steps taken to stop the incident |
| Root Cause | Technical or procedural failure |
| Corrective Actions | Changes implemented |
| Breach Determination | Yes/No with rationale |
| Notifications Sent | To whom, when, and how |
| Status | Open, Investigating, Contained, Resolved, Closed |
| Resolved Date | When the incident was fully resolved |

---

## Appendix A: HIPAA Security Rule Safeguard Mapping

| HIPAA Requirement | 45 CFR Reference | Easy Health Implementation | Status |
|---|---|---|---|
| **Administrative Safeguards** | | | |
| Security Management Process | 164.308(a)(1) | Risk assessment, security policies (this document) | Partial |
| Assigned Security Responsibility | 164.308(a)(2) | Compliance Officer role defined | Organizational |
| Workforce Security | 164.308(a)(3) | RBAC with 5 roles, `requireRole` middleware | Implemented |
| Information Access Management | 164.308(a)(4) | Role-based permissions matrix | Implemented |
| Security Awareness Training | 164.308(a)(5) | Not yet implemented | Gap |
| Security Incident Procedures | 164.308(a)(6) | Incident Response Plan (Section 10) | Documented |
| Contingency Plan | 164.308(a)(7) | Neon managed backups; no application-level DR plan | Partial |
| Evaluation | 164.308(a)(8) | Annual security assessment | Organizational |
| BAA Contracts | 164.308(b)(1) | BAA requirements documented (Section 8) | Organizational |
| **Physical Safeguards** | | | |
| Facility Access Controls | 164.310(a)(1) | Cloud-hosted; Neon/Azure physical security | Managed |
| Workstation Use | 164.310(b) | Session timeout, auto-lock, biometric gate | Implemented |
| Workstation Security | 164.310(c) | iOS Data Protection, device passcode requirements | Partial |
| Device and Media Controls | 164.310(d)(1) | No remote wipe; no formal device disposal policy | Gap |
| **Technical Safeguards** | | | |
| Access Control | 164.312(a)(1) | Authentication, RBAC, session timeout | Implemented |
| Audit Controls | 164.312(b) | `audit_events` table, access log API | Implemented |
| Integrity Controls | 164.312(c)(1) | Visit lock mechanism, attestation signatures | Partial |
| Person or Entity Authentication | 164.312(d) | Username/password + configurable MFA + biometrics | Implemented |
| Transmission Security | 164.312(e)(1) | TLS 1.2+ for all communications | Implemented |

---

## Appendix B: Priority Remediation Roadmap

| Priority | Item | Effort | Impact |
|---|---|---|---|
| **P0 — Before Production** | Hash passwords with bcrypt/Argon2 | Small | Critical security gap |
| **P0 — Before Production** | Remove MFA code console logging | Small | PHI/credential exposure |
| **P0 — Before Production** | Implement server-side sessions | Medium | Prevents header spoofing |
| **P0 — Before Production** | Change all demo account passwords | Small | Prevents unauthorized access |
| **P1 — Production Launch** | Execute BAAs with Neon, Azure, OpenAI | Organizational | Legal compliance |
| **P1 — Production Launch** | Add password complexity enforcement | Small | Security hardening |
| **P1 — Production Launch** | Remove AI extraction raw response logging | Small | PHI in logs |
| **P1 — Production Launch** | Add `requireRole` to clinical endpoints | Medium | Access control |
| **P2 — Post-Launch** | Implement audit log retention (6 years) | Medium | HIPAA requirement |
| **P2 — Post-Launch** | Add IP address to audit events | Small | Investigation capability |
| **P2 — Post-Launch** | Implement remote device wipe | Medium | Device loss mitigation |
| **P2 — Post-Launch** | Add read-access PHI audit logging | Medium | Comprehensive audit trail |
| **P2 — Post-Launch** | Implement IndexedDB cache TTL/purge | Small | Data minimization |
| **P3 — Ongoing** | Annual HIPAA risk assessment | Organizational | Continuous compliance |
| **P3 — Ongoing** | Security awareness training program | Organizational | Workforce security |
| **P3 — Ongoing** | Conduct penetration testing | Organizational | Vulnerability discovery |

---

*This document should be reviewed and updated quarterly or whenever significant changes are made to the Easy Health platform's security architecture, data flows, or compliance requirements.*
