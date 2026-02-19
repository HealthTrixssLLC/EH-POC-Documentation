# Easy Health Technical Documentation

Technical documentation for the Easy Health in-home clinical visit platform. This documentation suite is designed for the EH engineering team to understand the system architecture, build and test APIs, and deploy to production securely.

---

## Documentation Index

### Core Technical References

| Document | Description | Audience |
|---|---|---|
| [API Endpoint Reference](api-endpoints.md) | Complete reference for all 128+ REST endpoints with business purpose, auth requirements, request/response examples, validation rules, error codes, and testing checklists | Backend engineers, QA |
| [FHIR R4 Compliance Guide](fhir-compliance.md) | FHIR R4 resource mappings, terminology bindings (ICD-10, LOINC, CPT, SNOMED), bundle composition, inbound processing, validation rules, and interoperability roadmap | Integration engineers, interoperability team |
| [FHIR API Reference](fhir-api-reference.md) | Detailed FHIR R4 API endpoint documentation with test payloads and resource mappings | Backend engineers, integration team |

### Architecture & Workflows

| Document | Description | Audience |
|---|---|---|
| [Technical Activity Diagrams](technical-activity-diagrams.md) | 10 Mermaid sequence/activity diagrams with swimlanes covering the complete visit lifecycle, clinical intake, voice capture pipeline, auth/MFA, HIE ingestion, finalization gating, supervisor review, care coordination, FHIR export, and offline sync. Each diagram includes business context, handoff details, and architecture decision records | All engineers, product team, clinical stakeholders |

### Security & Compliance

| Document | Description | Audience |
|---|---|---|
| [HIPAA Security Guide](hipaa-security.md) | PHI data classification, encryption requirements, RBAC model with permissions matrix, audit logging, breach notification procedures, BAA requirements, developer security checklist, and incident response plan | All engineers, security team, compliance |
| [Azure Deployment Guide](azure-deployment.md) | Step-by-step Azure infrastructure setup with CLI commands, security hardening (VNet, Key Vault, WAF, private endpoints), CI/CD pipeline, compliance controls, cost estimation, and migration runbook from Replit/Neon to Azure | DevOps, infrastructure, security team |

### iOS & Distribution

| Document | Description | Audience |
|---|---|---|
| [iOS Build Guide](ios-build-guide.md) | Building the iOS app with Capacitor | Mobile engineers |
| [App Store Submission Guide](ios-app-store-submission-guide.md) | App Store submission process and requirements | Mobile engineers, product |
| [TestFlight Guide](testflight-guide.md) | TestFlight beta testing setup | Mobile engineers, QA |
| [App Review Checklist](app-review-checklist.md) | Apple App Review preparation | Mobile engineers |
| [Privacy Policy](privacy-policy.md) | App privacy policy for App Store and web | Legal, product |

---

## Quick Start for New Engineers

1. **Start here**: Read the [Technical Activity Diagrams](technical-activity-diagrams.md) to understand how the system works end-to-end
2. **Building APIs**: Reference the [API Endpoint Reference](api-endpoints.md) for every endpoint's contract, validation rules, and testing checklist
3. **Working with FHIR**: Read the [FHIR R4 Compliance Guide](fhir-compliance.md) for resource mappings and terminology codes
4. **Security requirements**: Review the [HIPAA Security Guide](hipaa-security.md) developer checklist before writing any code that touches PHI
5. **Deployment**: Follow the [Azure Deployment Guide](azure-deployment.md) for infrastructure setup and migration

## Document Statistics

| Document | Lines | Endpoints/Diagrams |
|---|---|---|
| API Endpoint Reference | 5,222 | 128+ endpoints |
| FHIR Compliance Guide | 1,787 | 11 resource types, 6 code systems |
| Technical Activity Diagrams | 1,333 | 10 diagrams with swimlanes |
| HIPAA Security Guide | 983 | 50+ PHI elements classified |
| Azure Deployment Guide | 2,335 | 30+ deployment checklist items |
| **Total** | **11,660** | |

## Key Conventions

- **Realistic Data**: All examples use realistic clinical data (patient names, ICD-10 codes, medications) rather than placeholder values
- **Testing Checklists**: Each API endpoint includes a testing checklist with happy path, edge cases, auth, and HIPAA items
- **Business Context**: Every diagram and major section explains WHY a feature exists from a healthcare/business perspective, not just the technical implementation
- **Architecture Decision Records**: Key design decisions are documented with rationale in the activity diagrams
- **Cross-References**: Documents reference each other where relevant to avoid duplication
