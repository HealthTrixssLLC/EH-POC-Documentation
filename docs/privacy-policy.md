# Privacy Policy — Easy Health

**Last Updated:** February 10, 2026
**Effective Date:** February 10, 2026

---

## 1. Introduction

Easy Health ("we," "our," or "us") operates the Easy Health mobile application and web platform (collectively, the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.

Easy Health is a clinical documentation platform designed for licensed healthcare professionals conducting in-home clinical visits for Medicare Advantage and Affordable Care Act (ACA) health plan populations. The Service is intended for use by authorized healthcare organization personnel, not directly by patients or consumers.

By accessing or using the Service, you agree to this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access the Service.

---

## 2. Information We Collect

### 2.1 User Account Information
- Full name and professional credentials
- Email address
- Username and encrypted password
- Professional role (Nurse Practitioner, Supervisor, Care Coordinator, Administrator, Compliance Officer)
- Organization affiliation

### 2.2 Clinical and Patient Data
The Service processes Protected Health Information (PHI) on behalf of covered healthcare entities. Clinical data processed includes:

- **Patient Demographics:** Name, date of birth, gender, address, health plan membership ID, Medicare/Medicaid identifiers
- **Vital Signs:** Blood pressure, heart rate, respiratory rate, temperature, oxygen saturation, height, weight, BMI
- **Clinical Assessments:** PHQ-2 and PHQ-9 depression screening responses and scores, PRAPARE social determinants of health survey responses, Annual Wellness Visit health risk assessment responses
- **HEDIS Quality Measures:** Breast Cancer Screening (BCS), Colorectal Cancer Screening (COL), and Hemoglobin A1C Control documentation including screening types, dates, and results
- **Medication Information:** Current medication lists, medication reconciliation records, medication history, dosages, frequencies, and prescribers
- **Clinical Observations:** Physical examination findings, clinical notes, diagnoses, and ICD-10 codes
- **Care Plans:** Identified needs, goals, interventions, and referrals
- **Visit Records:** Visit dates, durations, statuses, consent records, and clinician assignments
- **Voice Recordings and Transcripts:** Audio recordings of clinical documentation dictation (when AI voice capture feature is enabled), AI-generated transcriptions, and extracted clinical data fields
- **Audit Records:** Compliance audit assignments, findings, and outcomes

### 2.3 Technical and Usage Data
- Device type, operating system version, and app version
- IP address and general location data (not precise GPS)
- App usage patterns, feature utilization, and session duration
- Error logs and crash reports
- Access timestamps and audit trail entries

---

## 3. How We Use Your Information

We use the information we collect for the following purposes:

### 3.1 Clinical Documentation
- Facilitating the documentation of in-home clinical visits
- Recording vital signs, assessment responses, and clinical findings
- Generating clinical notes and visit summaries
- Supporting clinical decision-making through evidence-based alerts and recommendations

### 3.2 Quality Measures and Compliance
- Tracking HEDIS quality measure completion and compliance
- Supporting Medicare Advantage Star Rating documentation
- Enabling compliance audit workflows and quality assurance reviews
- Generating completeness reports for visit documentation

### 3.3 Care Coordination
- Creating and managing patient care plans
- Facilitating communication between clinical team members
- Supporting supervisor review and sign-off workflows
- Coordinating referrals and follow-up care

### 3.4 Health Information Exchange
- Exporting clinical data in HL7 FHIR R4 format for interoperability with Electronic Health Record (EHR) systems
- Importing patient data from external systems via FHIR interfaces
- Supporting Health Information Exchange (HIE) connectivity

### 3.5 Service Operations
- Authenticating users and managing access permissions
- Maintaining audit trails for regulatory compliance
- Monitoring system performance and resolving technical issues
- Improving the Service based on usage patterns

---

## 4. Data Storage and Security

### 4.1 Data Storage
- All data is stored on secure, access-controlled servers
- Database systems use encrypted storage at rest (AES-256 encryption)
- Data is hosted in SOC 2 Type II compliant data centers within the United States
- Backup copies are encrypted and stored in geographically separate locations

### 4.2 Data in Transit
- All data transmitted between the application and servers uses HTTPS/TLS 1.2 or higher encryption
- API communications are authenticated using session tokens
- No clinical data is transmitted over unencrypted channels

### 4.3 Access Controls
- Role-based access control (RBAC) restricts data access to authorized personnel
- Five defined roles with granular permissions: Nurse Practitioner, Supervisor, Care Coordinator, Administrator, Compliance Officer
- User authentication required for all Service access
- Audit logging tracks all access to clinical data

### 4.4 Security Measures
- Regular security assessments and vulnerability scanning
- Encrypted credential storage (passwords are hashed, never stored in plaintext)
- Session timeout after periods of inactivity
- Server-side request validation and input sanitization

---

## 5. HIPAA Alignment

Easy Health is designed with alignment to the Health Insurance Portability and Accountability Act (HIPAA) Privacy Rule, Security Rule, and Breach Notification Rule:

### 5.1 Business Associate Agreement (BAA)
- Easy Health operates as a Business Associate under HIPAA when processing PHI on behalf of Covered Entities
- A signed Business Associate Agreement (BAA) is required before any PHI is processed through the Service
- The BAA defines permitted uses and disclosures of PHI, security obligations, and breach notification procedures

### 5.2 Privacy Rule Alignment
- PHI is used only for Treatment, Payment, and Health Care Operations (TPO) purposes
- Minimum Necessary standard is applied — users access only the data required for their role
- Patient rights to access, amend, and receive an accounting of disclosures are supported

### 5.3 Security Rule Alignment
- **Administrative Safeguards:** Workforce training, access management, security incident procedures
- **Physical Safeguards:** Data center physical security, workstation security policies
- **Technical Safeguards:** Access controls, audit controls, integrity controls, transmission security

### 5.4 Breach Notification
- Procedures are in place to identify, investigate, and report breaches of unsecured PHI
- Affected individuals, the Department of Health and Human Services (HHS), and media (if applicable) will be notified in accordance with HIPAA requirements
- Breach notifications will be made without unreasonable delay and no later than 60 days after discovery

---

## 6. Data Retention

### 6.1 Clinical Records
- Clinical visit records, assessments, and documentation are retained for a minimum of **7 years** from the date of the visit, or longer as required by applicable state and federal regulations
- Medicare-related records are retained for a minimum of **10 years** in accordance with CMS requirements

### 6.2 Audit Logs
- Access and audit logs are retained for a minimum of **6 years** in accordance with HIPAA requirements

### 6.3 User Account Data
- User account information is retained for the duration of the account's active status
- Upon account deactivation, account data is retained for **3 years** before secure deletion
- Deactivated accounts are anonymized after the retention period

### 6.4 Voice Recordings and Transcripts
- Audio recordings used for AI transcription are processed in real-time and are not retained after transcription is complete
- Transcripts and extracted clinical fields are retained as part of the clinical visit record (see Section 6.1)

### 6.5 Data Deletion
- Data is securely deleted at the end of the applicable retention period using industry-standard data destruction methods
- Deletion requests are processed in accordance with applicable regulations (some data may need to be retained for legal or regulatory requirements even after a deletion request)

---

## 7. Third-Party Services

### 7.1 AI Transcription Service (OpenAI)
When the AI voice capture feature is enabled:
- Audio recordings are transmitted to **OpenAI's Whisper API** for speech-to-text transcription
- Transcribed text is processed by **OpenAI's GPT-4** for structured clinical field extraction
- OpenAI's data processing is governed by their [Data Processing Agreement](https://openai.com/policies/data-processing-agreement) and [API Data Usage Policy](https://openai.com/policies/api-data-usage-policy)
- As of the effective date of this policy, OpenAI does not use API data to train their models
- AI features are optional and require explicit consent from the clinician before activation
- No patient-identifying information is included in prompts sent to OpenAI beyond what is necessary for clinical field extraction

### 7.2 Hosting and Infrastructure
- Application hosting and database services are provided by cloud infrastructure providers that maintain SOC 2 Type II compliance
- Infrastructure providers process data only as directed and have signed appropriate data processing agreements

### 7.3 No Advertising or Analytics Third Parties
- We do not share clinical data with advertising networks
- We do not sell user or patient data to any third party
- We do not use third-party analytics services that process PHI

---

## 8. User Rights

### 8.1 Right to Access
- You may request access to the personal data we hold about you
- Covered Entities may request access to PHI processed on their behalf through the Service
- Access requests will be fulfilled within 30 days

### 8.2 Right to Correction
- You may request correction of inaccurate personal data
- Clinical data corrections follow healthcare amendment procedures — original entries are preserved with amendments clearly marked

### 8.3 Right to Deletion
- You may request deletion of your personal data, subject to legal and regulatory retention requirements
- Certain clinical data may not be eligible for deletion due to medical record retention laws
- Deletion requests will be evaluated and responded to within 30 days

### 8.4 Right to Data Portability
- Clinical data can be exported in HL7 FHIR R4 format for interoperability
- You may request a copy of your personal data in a structured, commonly used, machine-readable format
- FHIR export includes Patient, Encounter, Observation, Condition, and related resources

### 8.5 Right to Restrict Processing
- You may request that we limit the processing of your personal data under certain circumstances
- Restrictions will be implemented where legally required and technically feasible

### 8.6 Right to Object
- You may object to the processing of your personal data where processing is based on legitimate interests
- Objections will be evaluated and honored where required by applicable law

---

## 9. Children's Privacy

The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected personal data from a child under 18, we will take steps to delete that information.

---

## 10. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Posting the new Privacy Policy within the Service
- Updating the "Last Updated" date at the top of this document
- Sending notification to registered users for material changes

You are advised to review this Privacy Policy periodically for any changes. Changes are effective when posted.

---

## 11. State-Specific Disclosures

### California Residents (CCPA/CPRA)
If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), including the right to know what personal information is collected, the right to delete personal information, and the right to opt out of the sale of personal information. We do not sell personal information.

### Other State Privacy Laws
We comply with applicable state privacy laws, including but not limited to laws in Colorado, Connecticut, Virginia, and other states with comprehensive privacy legislation. Residents of these states may have additional rights. Contact us to exercise state-specific rights.

---

## 12. Contact Information

If you have questions about this Privacy Policy, wish to exercise your data rights, or need to report a privacy concern, please contact us:

**Easy Health Privacy Office**
Email: [privacy@easyhealth.app]
Phone: [Phone Number]
Address: [Mailing Address]

**Data Protection Officer**
Email: [dpo@easyhealth.app]

**For HIPAA-related inquiries:**
Email: [hipaa@easyhealth.app]

**To report a data breach or security incident:**
Email: [security@easyhealth.app]
Phone: [Emergency Phone Number]

> **Note:** Replace bracketed placeholder values with actual contact information before publishing.

---

## 13. Governing Law

This Privacy Policy shall be governed by and construed in accordance with the laws of the United States and the state in which Easy Health's principal place of business is located, without regard to conflict of law principles. For HIPAA-regulated data, federal law applies.

---

*This Privacy Policy is a template and should be reviewed by qualified legal counsel before publication. Healthcare data handling is subject to complex federal and state regulations, and legal review is strongly recommended.*
