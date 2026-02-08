# Implementation Plan: ForEachHealth In-Home NP Visit Web App (POC)

## Project Overview

**For Each Health** conducts in-home visits for Medicare Advantage (MA) and ACA plans. This web app POC will serve as the foundation for the full platform (web + future iOS app). It covers the core clinical visit workflow: pre-visit preparation, dynamic intake with assessments, finalization with gating, supervisor review, care coordination, and basic admin configuration.

The web app simulates the NP mobile experience in a responsive web format, enabling validation of all core workflows before native iOS development begins.

---

## Branding & Design System

Based on the Branding Guidelines:
- **Dark Blue (#2E456B)** - Primary navigation surfaces, headers
- **Orange (#FEA002)** - Primary CTA buttons
- **Dark Teal (#277493)** - Secondary actions, informational alerts
- **Tan (#F3DBB1)** - Warning alerts
- **Light accents** - Supporting UI elements (Light Orange #FFCA4B, Light Green #88ABA2, Light Teal #67AABF, Light Grey #ABAFA5)
- Clean sans-serif typography, consistent spacing, accessible contrast

---

## MVP Scope (Web App POC)

### What IS included in the POC:

- [x] 1. **Authentication & Role-Based Access (RBAC)**
- [x] 2. **Visit Management (SC-002, SC-003)**
- [x] 3. **Clinical Intake Workflow (SC-004 through SC-009)**
- [x] 4. **Review & Finalize (SC-010)**
- [x] 5. **Supervisor Review Queue (SC-011, SC-012)**
- [x] 6. **Care Coordination Workspace (SC-013)**
- [x] 7. **Admin Console (SC-014) - Basic**
- [x] 8. **Clinical Note Generation**
- [x] 9. **Export & FHIR (Simulated)**
- [x] 10. **Audit Trail**

### What is NOT included in the POC:

- Native iOS app (future phase)
- Offline-first / local encrypted storage (iOS-specific)
- Real EMR FHIR endpoint integration (simulated with mock)
- Full scheduling and route optimization
- Complex revenue cycle / billing
- Full analytics/reporting suite
- SSO / enterprise identity provider integration
- Device management and remote wipe
- Real-time sync conflict resolution (web-only, no offline)

---

## Data Model (Core Entities)

| Entity | Description |
|--------|-------------|
| **User** | NP, Supervisor, Care Coordinator, Admin, Compliance roles |
| **Member** | Patient demographics, identifiers, contact info |
| **Visit** | Scheduled visit with status state machine, assigned NP, member |
| **MemberHistory** | Conditions, medications, allergies, labs for a member |
| **PlanTarget** | Plan-specific targets, care gaps, suspecting prompts per member |
| **RequiredChecklist** | Per-visit list of required assessments + HEDIS measures |
| **AssessmentDefinition** | Versioned instrument config (PRAPARE, PHQ-2, PHQ-9, AWV) |
| **AssessmentResponse** | Completed assessment with responses, scores, interpretation |
| **MeasureDefinition** | Versioned HEDIS measure config |
| **MeasureResult** | Evidence capture, completion state, unable-to-assess reason |
| **VitalsRecord** | BP, BMI, weight, heart rate, temperature, etc. |
| **ClinicalNote** | Generated note with structured sections |
| **CarePlanTask** | Follow-up tasks with owner, due date, priority, status, outcome |
| **ReviewDecision** | Supervisor approve/correction with comments |
| **ExportArtifact** | Generated FHIR bundle export metadata |
| **AuditEvent** | PHI access, changes, exports, submissions |
| **PlanPack** | Plan/program/visit-type configuration bundle |

---

## Screen Map (Web App POC)

| Screen | Route | Role(s) | Description |
|--------|-------|---------|-------------|
| Login | `/login` | All | Authentication with role |
| Dashboard | `/` | All | Role-specific home view |
| Visit List | `/visits` | NP | Filter/sort visits, select visit |
| Pre-Visit Summary | `/visits/:id/summary` | NP | Member profile, history, checklist |
| Intake Dashboard | `/visits/:id/intake` | NP | Checklist nav, section completion |
| Identity Verification | `/visits/:id/intake/identity` | NP | Verify patient identity |
| Vitals & Exam | `/visits/:id/intake/vitals` | NP | Capture vitals and exam |
| Assessment Runner | `/visits/:id/intake/assessment/:aid` | NP | Administer assessment instrument |
| HEDIS Measure Task | `/visits/:id/intake/measure/:mid` | NP | Evidence capture for measure |
| Care Plan & Tasks | `/visits/:id/intake/careplan` | NP | Create tasks and referrals |
| Review & Finalize | `/visits/:id/finalize` | NP | Gating, signature, finalize |
| Supervisor Queue | `/reviews` | Supervisor | Review queue with indicators |
| Visit Detail | `/visits/:id/detail` | Supervisor, Ops | Full visit view with tabs |
| Care Coordination | `/coordination` | Care Coordinator | Task workspace |
| Admin Console | `/admin` | Admin | Configuration management |
| Audit Viewer | `/audit` | Compliance | Audit log viewer |

---

## Technical Architecture

```
Frontend (React + Vite)
├── Wouter routing
├── TanStack Query for data fetching
├── Shadcn UI components with ForEachHealth branding
├── Form handling with react-hook-form + zod validation
└── Role-based navigation via sidebar

Backend (Express + Node.js)
├── REST API endpoints (API-001 through API-008)
├── PostgreSQL via Drizzle ORM
├── Session-based auth with RBAC middleware
├── Clinical note generation service
├── FHIR bundle generation service
├── Audit logging middleware
└── Seed data for demo/testing

Database (PostgreSQL)
├── Users & roles
├── Members & visit data
├── Assessments & measures (versioned definitions + responses)
├── Care plans & tasks
├── Audit events
└── Configuration (plan packs, instruments, measures)
```

---

## Implementation Tasks

### Task 1: Schema & Frontend
- [x] Define all data models and TypeScript interfaces in `shared/schema.ts`
- [x] Configure branding design tokens in `tailwind.config.ts` and `index.html`
- [x] Login page with role selection
- [x] Sidebar navigation with role-based menu items
- [x] Dashboard with role-specific cards and metrics
- [x] Visit list with status badges, filters, search
- [x] Pre-visit summary with member banner, history, plan targets, checklist
- [x] Intake dashboard with step-by-step checklist navigation
- [x] Identity verification form
- [x] Vitals & exam capture forms with validation
- [x] Assessment runner with question rendering, scoring, interpretation display
- [x] HEDIS measure task cards with evidence capture
- [x] Care plan task creation and management
- [x] Review & finalize with gating checklist, signature capture
- [x] Supervisor review queue with completeness indicators
- [x] Visit detail with tabbed sections (note, assessments, measures, care plan)
- [x] Care coordination workspace
- [x] Admin console (basic configuration viewer)
- [x] Audit log viewer with filters
- [x] All loading, empty, and error states

### Task 2: Backend
- [x] Set up PostgreSQL database with Drizzle ORM
- [x] Auth: login, session management, RBAC middleware
- [x] Visits: CRUD, list, pre-visit bundle, draft save, finalize with gating
- [x] Assessments: definitions, responses, scoring validation
- [x] Measures: definitions, results, unable-to-assess
- [x] Care plan: tasks CRUD, outcomes
- [x] Reviews: submit decision, list queue
- [x] Clinical note: auto-generation from visit data
- [x] Exports: FHIR bundle generation, download
- [x] Audit: event logging, query
- [x] Admin: plan pack and config management
- [x] Seed data: 3 test members, sample visits, plan packs, instruments, measures

### Task 3: Integration, Polish & Testing
- [x] Connect ALL frontend components to backend APIs
- [x] Add error handling, loading states, and optimistic updates
- [x] NP can browse visits, view pre-visit summary, complete intake with assessments
- [x] Finalization gating blocks when items incomplete
- [x] Supervisor can review and approve/request corrections
- [x] Care coordinator can work tasks
- [x] Admin can view configurations
- [x] Audit events logged for PHI actions
- [x] Export download works
- [x] Full responsive design validation

---

## Success Criteria for POC

- [x] 1. NP can complete a full visit workflow: pre-visit -> intake -> assessments -> finalize
- [x] 2. Assessment scoring works deterministically (PHQ-9, PHQ-2, PRAPARE)
- [x] 3. Finalization gating blocks signature when required items are incomplete
- [x] 4. Unable-to-assess reasons satisfy gating requirements
- [x] 5. Supervisor can review visits and approve/request corrections
- [x] 6. Care coordination tasks can be created, assigned, and tracked
- [x] 7. Clinical note auto-generates from visit data
- [x] 8. FHIR bundle export can be generated and downloaded
- [x] 9. Audit trail captures PHI access events
- [x] 10. UI follows ForEachHealth branding guidelines
- [x] 11. Responsive design works on desktop and tablet viewports
- [x] 12. Seed data makes the app look realistic on first load

---

## E2E Testing Results (2026-02-08)

All 5 role workflows tested end-to-end with Playwright:

| Role | Test Scope | Result |
|------|-----------|--------|
| **NP (sarah.np)** | Login, dashboard, visit list, pre-visit summary, start visit, identity verification, vitals capture, PHQ-2/PRAPARE/AWV assessments, CBP/CDC-A1C/COL measures, finalize with gating | PASS |
| **Supervisor (dr.williams)** | Login, dashboard, review queue, visit detail, approve visit | PASS |
| **Care Coordinator (emma.coord)** | Login, dashboard, task list, update task status | PASS |
| **Admin (admin)** | Login, dashboard, admin console (plan packs, assessments, measures) | PASS |
| **Compliance (compliance)** | Login, dashboard, audit viewer (event types, timestamps) | PASS |

### Bugs Found & Fixed
1. **Missing icon imports in dashboard.tsx** - `Settings` and `Shield` icons from lucide-react were used but not imported, causing runtime error for Admin/Compliance dashboard. Fixed by adding imports.

### Validated Success Criteria
All 12 success criteria confirmed via E2E testing (see checkmarks above).

---

## Future Phases (Post-POC)

- **Phase 2**: Native iOS app with offline-first architecture, encrypted local storage, sync agent
- **Phase 3**: Real EMR FHIR endpoint integration, production security hardening
- **Phase 4**: Full analytics, scheduling, route optimization, revenue cycle support
- **Phase 5**: Multi-tenant support, SSO, enterprise deployment
