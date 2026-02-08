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
