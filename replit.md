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
- 2026-02-07: Initial POC build - schema, frontend, backend, seed data

## User Preferences
- Web POC first, iOS native app later
- Focus on responsive web design
- Use Shadcn UI components with Easy Health branding
