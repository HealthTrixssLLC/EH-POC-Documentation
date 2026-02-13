# Easy Health - In-Home Clinical Visit Platform

## Overview
Easy Health is a web application designed to manage in-home Nurse Practitioner visits for Medicare Advantage and ACA plans. It covers the entire clinical visit lifecycle, from pre-visit preparation and clinical intake with standardized assessments to HEDIS measure tracking, visit finalization with gating validation, supervisor review, care coordination, and FHIR export. The project aims to provide a robust, interoperable platform for efficient and compliant in-home healthcare delivery.

## User Preferences
- Web POC first, iOS native app later (PWA + Capacitor approach)
- Focus on responsive web design
- Use Shadcn UI components with Easy Health branding

## System Architecture
Easy Health employs a modern web architecture:
-   **Frontend**: React, Vite, TypeScript, Wouter for routing, TanStack Query for data fetching, and Shadcn UI for component styling.
-   **Backend**: Node.js with Express.js exposing a REST API.
-   **Database**: PostgreSQL managed with Drizzle ORM.
-   **Authentication**: Session-based with role-based access control (RBAC) supporting NP, Supervisor, Care Coordinator, Admin, and Compliance roles.
-   **Branding**: Adheres to the "Easy Health" color palette (Dark Blue, Orange, Dark Teal, Tan).
-   **Key Features**:
    -   **Finalization Gating**: Ensures all required assessments and measures are complete or adequately justified before visit sign-off.
    -   **Assessment Scoring**: Includes deterministic scoring for tools like PHQ-2, PHQ-9, PRAPARE, and AWV.
    -   **FHIR R4 API**: Full bidirectional FHIR R4 interface with 12 endpoints covering outbound reads (Patient, Encounter, Observation, Condition, comprehensive Bundle), inbound writes (Patient upsert, Bundle import with Patient+Encounter), visit export, and demo utilities. Comprehensive bundles include 11 distinct resource types across 17 data categories (80+ entries). See `docs/fhir-api-reference.md` for full API documentation, resource mappings, code examples, and test JSON payloads.
    -   **Intake Dashboard**: Task-driven UX with objective tracking, progress notes (MEAT/TAMPER compliant), and clinical decision support (CDS).
    -   **Medication Reconciliation**: Comprehensive module with client-side drug interaction and Beers Criteria checking.
    -   **Patient Clinical Timeline**: Visualizes longitudinal lab results, medication history, and vitals trends.
    -   **Clinical Decision Support (CDS)**: Real-time rule evaluation, data validation with override tracking, and auto-coding (CPT/HCPCS/ICD-10).
    -   **Conditional Assessments**: Dynamic display of assessments based on prior results (e.g., PHQ-9 based on PHQ-2 score).
    -   **HEDIS Screening Forms**: Specific documentation forms for measures like BCS and COL, with age-range guidance.
    -   **Visit Consent Management**: Tracks patient consents, NOPP acknowledgements, and voice transcription permissions.
    -   **Completeness Engine**: Evaluates and reports on visit data completeness based on configurable rules.
    -   **Diagnosis Validation**: Rules-based validation for diagnoses.
    -   **Enhanced Supervisor Sign-off**: Adjudication scorecard, structured return reasons, and encounter locking.
    -   **AI & Voice Capture**: Workflow for recording, transcribing (OpenAI Whisper), and extracting structured fields (GPT-4o) from clinical voice notes, with a consent gate.
    -   **Demo Mode & Access Governance**: Server-side RBAC, demo configuration, and access audit logging.
    -   **Human Audit Workflow**: Random sampling and audit queue for compliance review with structured outcome capture.
    -   **Supervisor Review Queue**: Enhanced UX with metrics, filters, rework tracking, and structured return reasons.
    -   **HIE Pre-Visit Intelligence (CR-002)**: Full Health Information Exchange integration with FHIR R4 PrevisitContext ingestion (MedicationStatement, Condition, Observation, Procedure), provenance tagging, condition suspecting with NP confirm/dismiss workflow, pre-visit NP guidance panel, care gap prioritization, completeness engine awareness, and supervisor adjudication enrichment with HIE verification badges. Includes HIE Simulation tool in FHIR Playground for demo/testing.
    -   **PWA & iOS App Preparation**: Implemented PWA features (manifest, service worker, iOS meta tags) and Capacitor configuration for potential native iOS wrapping.

## External Dependencies
-   **Database**: PostgreSQL
-   **API Integration**: OpenAI (Whisper for transcription, GPT-4o for field extraction)
-   **Frontend Libraries**: React, Vite, Wouter, TanStack Query, Shadcn UI
-   **Backend Libraries**: Express.js, Drizzle ORM
-   **Platform Features**: FHIR R4 standard for data interoperability