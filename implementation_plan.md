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

1. **Authentication & Role-Based Access (RBAC)**
   - Login with role selection (NP, Supervisor, Care Coordinator, Admin)
   - Session management with role-based navigation
   - Audit logging for PHI access events

2. **Visit Management (SC-002, SC-003)**
   - Visit list with filtering by status, date, NP
   - Pre-visit summary with member demographics, history, plan targets, risk flags
   - Required assessments & measures checklist with status tracking

3. **Clinical Intake Workflow (SC-004 through SC-009)**
   - Identity verification step
   - Intake dashboard with checklist navigation
   - Vitals & exam capture with validation
   - Assessment runner for PRAPARE, PHQ-2, PHQ-9 with deterministic scoring
   - HEDIS measure tasks with evidence capture and unable-to-assess reasons
   - Care plan & task creation

4. **Review & Finalize (SC-010)**
   - Finalization gating - blocks signature if required items incomplete
   - Deep-links to missing/incomplete items
   - E-signature and attestation capture
   - Visit status state machine (Draft -> Finalized -> Synced)

5. **Supervisor Review Queue (SC-011, SC-012)**
   - Review queue with completeness indicators
   - Visit detail view with clinical note, assessments, measures, care plan tabs
   - Approve / request correction workflow

6. **Care Coordination Workspace (SC-013)**
   - Task list with filtering and assignment
   - Task outcomes and status updates
   - Contact log for follow-ups

7. **Admin Console (SC-014) - Basic**
   - View/manage plan pack configurations
   - View assessment instrument definitions (versioned)
   - View HEDIS measure definitions

8. **Clinical Note Generation**
   - Auto-generated structured clinical note from visit data
   - Sections: Chief Complaint, HPI, ROS, Exam, Assessment, Plan
   - Assessments & measures section with completion status

9. **Export & FHIR (Simulated)**
   - Generate FHIR Bundle JSON export from finalized visits
   - Download export file from web app
   - Simulated EMR submission status tracking

10. **Audit Trail**
    - Log PHI access, edits, exports, and key actions
    - Basic audit viewer for compliance role

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
Define all data models and TypeScript interfaces in `shared/schema.ts`. Configure the branding design tokens (Dark Blue, Orange, Teal palette) in `tailwind.config.ts` and `index.html`. Build ALL React components and views for every screen listed above with exceptional visual quality:
- Login page with role selection
- Sidebar navigation with role-based menu items
- Dashboard with role-specific cards and metrics
- Visit list with status badges, filters, search
- Pre-visit summary with member banner, history, plan targets, checklist
- Intake dashboard with step-by-step checklist navigation
- Identity verification form
- Vitals & exam capture forms with validation
- Assessment runner with question rendering, scoring, interpretation display
- HEDIS measure task cards with evidence capture
- Care plan task creation and management
- Review & finalize with gating checklist, signature capture
- Supervisor review queue with completeness indicators
- Visit detail with tabbed sections (note, assessments, measures, care plan)
- Care coordination workspace
- Admin console (basic configuration viewer)
- Audit log viewer with filters
- All loading, empty, and error states

### Task 2: Backend
Set up PostgreSQL database with Drizzle ORM migrations. Implement all API endpoints:
- Auth: login, session management, RBAC middleware
- Visits: CRUD, list, pre-visit bundle, draft save, finalize with gating
- Assessments: definitions, responses, scoring validation
- Measures: definitions, results, unable-to-assess
- Care plan: tasks CRUD, outcomes
- Reviews: submit decision, list queue
- Clinical note: auto-generation from visit data
- Exports: FHIR bundle generation, download
- Audit: event logging, query
- Admin: plan pack and config management
- Seed data: 3 test members, sample visits, plan packs, instruments, measures

### Task 3: Integration, Polish & Testing
Connect all frontend components to backend APIs. Add error handling, loading states, and optimistic updates. Test all core workflows end-to-end:
- NP can browse visits, view pre-visit summary, complete intake with assessments
- Finalization gating blocks when items incomplete
- Supervisor can review and approve/request corrections
- Care coordinator can work tasks
- Admin can view configurations
- Audit events logged for PHI actions
- Export download works
- Full responsive design validation

---

## Success Criteria for POC

1. NP can complete a full visit workflow: pre-visit -> intake -> assessments -> finalize
2. Assessment scoring works deterministically (PHQ-9, PHQ-2, PRAPARE)
3. Finalization gating blocks signature when required items are incomplete
4. Unable-to-assess reasons satisfy gating requirements
5. Supervisor can review visits and approve/request corrections
6. Care coordination tasks can be created, assigned, and tracked
7. Clinical note auto-generates from visit data
8. FHIR bundle export can be generated and downloaded
9. Audit trail captures PHI access events
10. UI follows ForEachHealth branding guidelines
11. Responsive design works on desktop and tablet viewports
12. Seed data makes the app look realistic on first load

---

## Future Phases (Post-POC)

- **Phase 2**: Native iOS app with offline-first architecture, encrypted local storage, sync agent
- **Phase 3**: Real EMR FHIR endpoint integration, production security hardening
- **Phase 4**: Full analytics, scheduling, route optimization, revenue cycle support
- **Phase 5**: Multi-tenant support, SSO, enterprise deployment
