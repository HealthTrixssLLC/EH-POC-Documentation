# Easy Health - In-Home Clinical Visit Platform

## Overview
Easy Health is a web application POC for managing in-home Nurse Practitioner visits for Medicare Advantage and ACA plans. The platform covers the full clinical visit lifecycle: pre-visit preparation, clinical intake with standardized assessments, HEDIS measure tracking, finalization with gating validation, supervisor review, care coordination, and FHIR export.

## Architecture
- **Frontend**: React + Vite + TypeScript with Wouter routing, TanStack Query, Shadcn UI
- **Backend**: Express + Node.js with REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based with role-based access control (client-side localStorage for POC)

## Key Design Decisions
- **Branding**: Easy Health palette - Dark Blue (#2E456B), Orange (#FEA002), Dark Teal (#277493), Tan (#F3DBB1)
- **RBAC**: 5 roles - NP, Supervisor, Care Coordinator, Admin, Compliance
- **Finalization Gating**: Visit cannot be signed unless all required assessments and measures are complete or have structured unable-to-assess reasons
- **Assessment Scoring**: Deterministic scoring for PHQ-2, PHQ-9, PRAPARE, AWV with interpretation bands
- **FHIR Export**: Generates a FHIR R4 bundle document for interoperability

## Seed Data Credentials
- NP: `sarah.np` / `password` or `michael.np` / `password`
- Supervisor: `dr.williams` / `password`
- Care Coordinator: `emma.coord` / `password`
- Admin: `admin` / `password`
- Compliance: `compliance` / `password`

## Project Structure
```
shared/schema.ts          - Database schema and types (Drizzle ORM)
server/db.ts              - Database connection
server/storage.ts         - Storage interface and implementation
server/routes.ts          - API endpoints
server/seed.ts            - Seed data for demo
client/src/App.tsx        - Main app with routing and layout
client/src/lib/auth.tsx   - Auth context (client-side)
client/src/lib/theme.tsx  - Theme provider (light/dark)
client/src/components/    - Shared components (sidebar, theme toggle)
client/src/pages/         - All page components
```

## Recent Changes
- 2026-02-08: Redesigned Intake Dashboard with task-driven UX and objective tracking
  - LEFT panel: NP Tasks (action items driving data entry) + Provider Tasks + Progress Notes (MEAT/TAMPER)
  - RIGHT panel: CDS at top, then Objectives (what we accomplished) with visual status, assessment results, meds, vitals, plan targets
  - Visual status indicators: green (completed), amber (excluded), gray (pending) with colored borders, badges, and icons
  - New objective_exclusions table for documenting why objectives could not be completed
  - Exclusion flow: XCircle button on pending tasks → dialog with 10 predefined reasons + optional notes → stored exclusion
  - Exclusion removal via trash button to revert objectives back to pending
  - Task completion = objectives met model; all tasks resolved (completed or excluded) = ready for finalization
  - Patient Context at /visits/:id/intake/patient-context (demographics, alerts, full vitals grid, assessments, meds)
  - GET /api/visits/:id/overview aggregates all visit data with vitals/assessment flags, progress note, and exclusions
  - CRUD API: GET/POST /api/visits/:id/exclusions, DELETE /api/exclusions/:id
  - Progress note is MEAT/TAMPER compliant for RADV & NCQA audit readiness
  - Note sections: Encounter Info, HPI, Physical Exam, Assessments, Med Recon, A&P with per-diagnosis MEAT, Quality Measures, CDS, Coding, Attestation
  - MEAT tags displayed as colored M/E/A/T indicators per section
  - Copy-to-clipboard produces formatted clinical note grouped by ENCOUNTER/SUBJECTIVE/OBJECTIVE/ASSESSMENT & PLAN/PLAN/QUALITY/ATTESTATION
- 2026-02-08: Added Medication Reconciliation feature
  - New med_reconciliation table with full CRUD API
  - Quick-add from patient medication history, manual entry for home meds
  - Client-side Beers Criteria (10 categories) and drug interaction (10 pairs) checking
  - Reconciliation status management (verified/new/modified/discontinued/held)
  - Integrated into intake dashboard as required step
- 2026-02-08: Added Demo Management page at /demo
  - Database reset with full re-seed (deletes 23 tables in dependency order)
  - FHIR Bundle export for all patients with download/copy functionality
  - Sample import bundle with 2 demo patients for testing FHIR inbound
  - 5 guided demo scenarios with step-by-step instructions
  - Demo credentials reference card
  - Accessible to ALL roles via sidebar "Support" section
- 2026-02-08: Added Help & Support page at /help
  - Comprehensive documentation covering all 12 feature areas
  - Searchable with real-time filtering across all topics
  - Tabbed navigation: All Topics, Workflows, Features, Testing
  - Step-by-step testing walkthroughs for every major workflow
  - Demo credentials reference and seed data documentation
  - Accessible to ALL user roles via sidebar "Support" section
- 2026-02-08: Added FHIR R4 Interoperability API and Admin Playground
  - Outbound endpoints: GET Patient, Encounter, Observation, Condition, Bundle
  - Inbound endpoints: POST Patient (create/update), POST Bundle (import Patient + Encounter)
  - FHIR R4 compliant with LOINC codes, OperationOutcome errors, proper resource mappings
  - Admin FHIR Playground at /admin/fhir with Export, Import (with sample data), and API Reference tabs
  - Added to admin sidebar and dashboard
- 2026-02-08: Added Patient Clinical Timeline visualization page
  - New tables: lab_results, medication_history, vitals_history
  - 2 years of longitudinal seed data for all 3 members (labs, vitals, Rx)
  - Vitals trend charts (BP, HR, SpO2, Weight/BMI) with Practice vs HIE source indicators
  - Lab results trend charts with reference ranges and source dots
  - Rx History Gantt-style medication timeline bars with 2-year lookback
  - Accessible from Intake Dashboard → "Patient Clinical Timeline" card
  - Route: /visits/:id/intake/timeline
- 2026-02-08: Added Clinical Decision Support (CDS), Data Validation with override tracking, and Auto-Coding (CPT/HCPCS/ICD-10)
  - New tables: clinical_rules, visit_recommendations, validation_overrides, visit_codes
  - 8 clinical rules seeded (PHQ-2→PHQ-9, BP, BMI, O2, pain, PRAPARE, heart rate)
  - Real-time rule evaluation after vitals save and assessment completion
  - Inline validation warnings with structured override reasons
  - Auto-generated codes visible on Review & Finalize page with verify/remove actions
- 2026-02-08: Added Technical Documentation page (Admin only)
  - Route: /admin/tech-docs with role guard (admin only, redirects others)
  - End-to-end workflow SVG diagram: member list input → visit lifecycle → FHIR export
  - Swim-lane activity diagram showing role handoffs (Admin, NP, Supervisor, Care Coordinator)
  - Detailed interface specs: inbound (FHIR Patient/Bundle import, CSV schema), internal (visit data model), outbound (FHIR R4 export endpoints)
  - Business rules docs: CDS rules, assessment scoring algorithms, medication safety checks
  - Tabbed layout: Workflow, Activity Diagram, Interface Specs
  - Added to Admin sidebar navigation and Admin Dashboard card grid
- 2026-02-08: Conditional assessment dependencies
  - PHQ-9 only appears as a task when PHQ-2 scores >= 3 (positive depression screen)
  - Dynamic checklist management: PHQ-9 auto-added on positive screen, auto-removed on negative
  - Re-scoring PHQ-2 correctly adds/removes PHQ-9; completed PHQ-9 preserved for clinical integrity
  - Vitals save now syncs to vitals_history for real-time clinical timeline updates
  - Fixed systolicBp/diastolicBp field name inconsistencies across overview, dashboard, and patient context
- 2026-02-09: HEDIS screening-specific documentation forms for BCS and COL
  - BCS: mammogram type picker (Screening, Diagnostic, Digital, 3D Tomosynthesis), date performed, optional result
  - COL: screening type picker with variable lookback periods (10yr colonoscopy, 5yr flex sig, etc.), date performed, recommended result
  - HEDIS guidance banners with age ranges and documentation requirements
  - Screening metadata (type, date, result) persisted in measure_results.evidenceMetadata JSONB
  - clinicalCriteria JSONB in measure_definitions stores screening types, lookback periods, hedisNote
  - Complete button validation requires screeningType + screeningDate + captureMethod for screening measures
  - Updated seed data with HEDIS-accurate age ranges (BCS: 40-74, COL: 45-75)
- 2026-02-10: CR-001 Phase 1 Implementation (9 items)
  - CR-001-01/02: Visit consent management (visit_consents table, NOPP acknowledgement, voice transcription consent gate)
  - CR-001-03: Configurable identity verification via planPacks flags (identityVerificationRequired, noppRequired)
  - CR-001-05: Standardized reason codes (reason_codes table, 45 codes across 8 categories, replaces hardcoded lists)
  - CR-001-09: Assessment/measure pages use DB reason codes, partial save/draft already supported
  - CR-001-04/06: Completeness engine (completeness_rules table, evaluation API, grouped completeness report on Review & Finalize)
  - CR-001-08: Diagnosis validation rules (diagnosis_rules table, 60 rules across 10 categories, evidence checking API)
  - CR-001-07: Enhanced supervisor sign-off (adjudication summary scorecard, structured return reasons, review_sign_offs table, encounter locking)
  - New tables: visit_consents, reason_codes, completeness_rules, diagnosis_rules, review_sign_offs
  - New routes: /visits/:id/consents, /reason-codes, /visits/:id/completeness, /diagnosis-rules, /visits/:id/diagnoses/validate, /visits/:id/adjudication-summary, /visits/:id/sign-offs
  - New page: /visits/:id/intake/consents (visit compliance/consent management)
- 2026-02-10: CR-001 Phase 2 Implementation (AI & Voice Capture)
  - CR-001-10: AI provider configuration (ai_provider_config table, CRUD API, Admin Console "AI Providers" tab, seed OpenAI defaults)
  - CR-001-11: Clinical voice capture workflow (voice_recordings, transcripts, extracted_fields tables)
  - Voice workflow: Record audio → upload → OpenAI Whisper transcription → GPT-4o structured field extraction → clinician review/accept/reject/edit → bulk accept
  - Consent gate enforced server-side (voice_transcription consent required before recording)
  - Visit locking enforced on all voice/transcript/extraction mutations
  - New routes: /api/ai-providers, /api/visits/:id/recordings, /api/visits/:id/transcribe, /api/visits/:id/extract, /api/visits/:id/extracted-fields, /api/extracted-fields/:id, /api/visits/:id/extracted-fields/bulk-accept
  - New page: /visits/:id/intake/voice-capture (Record/Transcripts/Review tabs)
  - Integrated into intake dashboard quick navigation
- 2026-02-07: Initial POC build - schema, frontend, backend, seed data

## User Preferences
- Web POC first, iOS native app later
- Focus on responsive web design
- Use Shadcn UI components with Easy Health branding
