# Apple App Review Preparation Checklist — Easy Health

> Use this checklist to ensure Easy Health is ready for Apple App Store review. Healthcare and medical apps receive heightened scrutiny — thorough preparation significantly reduces rejection risk.

---

## Table of Contents

1. [Human Interface Guidelines Compliance](#1-human-interface-guidelines-compliance)
2. [Content Requirements](#2-content-requirements)
3. [Performance Requirements](#3-performance-requirements)
4. [Safety & Privacy Requirements](#4-safety--privacy-requirements)
5. [Demo Account for Reviewers](#5-demo-account-for-reviewers)
6. [Notes for Reviewer](#6-notes-for-reviewer)
7. [Required Permissions](#7-required-permissions)
8. [Data Handling Transparency](#8-data-handling-transparency)
9. [In-App Purchases](#9-in-app-purchases)
10. [Medical & Healthcare App Considerations](#10-medical--healthcare-app-considerations)
11. [Pre-Submission Final Checklist](#11-pre-submission-final-checklist)

---

## 1. Human Interface Guidelines Compliance

### Navigation & Layout
- [ ] App uses standard iOS navigation patterns (back buttons, tab bars, or sidebar navigation)
- [ ] Content respects safe area insets (notch, home indicator, Dynamic Island)
- [ ] Status bar is visible and uses appropriate style (light content on dark blue header)
- [ ] Swipe-back gesture works for navigation where applicable
- [ ] Landscape orientation is handled gracefully (or locked to portrait with justification)
- [ ] Content is readable and interactive elements are tappable on all supported device sizes (iPhone SE through iPhone 15 Pro Max)

### Typography & Readability
- [ ] Text uses Dynamic Type or is at minimum legible size (11pt+)
- [ ] Sufficient contrast between text and background (WCAG AA minimum: 4.5:1 for body text, 3:1 for large text)
- [ ] Clinical data is displayed clearly and unambiguously
- [ ] Assessment questions and options are easy to read and select

### Touch Targets
- [ ] All interactive elements meet minimum 44x44pt touch target size
- [ ] Buttons and links have adequate spacing to prevent accidental taps
- [ ] Form inputs are easy to select and interact with

### Visual Design
- [ ] App icon follows Apple's Human Interface Guidelines (no transparency, no rounded corners in source file)
- [ ] Launch screen is implemented as a storyboard (not a static image)
- [ ] No placeholder images or Lorem Ipsum text remain in the app
- [ ] Easy Health branding is consistent (Dark Blue #2E456B, Orange #FEA002, Teal #277493, Tan #F3DBB1)
- [ ] Dark mode is supported and tested (if implemented)

### Accessibility
- [ ] VoiceOver labels are set on interactive elements
- [ ] Color is not the only means of conveying information (use icons, text, patterns in addition)
- [ ] Form fields have associated labels
- [ ] Screen reader can navigate through clinical workflows

---

## 2. Content Requirements

### App Metadata
- [ ] App name: "Easy Health" — does not infringe on existing trademarks
- [ ] Subtitle: "In-Home Clinical Visit Platform" — accurate and descriptive
- [ ] Description accurately reflects app functionality (no unsubstantiated medical claims)
- [ ] Keywords are relevant and do not include competitor names
- [ ] Screenshots show actual app UI (not mockups or marketing renders)
- [ ] Screenshots do not contain fake or misleading patient data labels
- [ ] Category is set to "Medical" (primary) and "Business" (secondary)

### In-App Content
- [ ] All text is finalized — no "TODO", "FIXME", or placeholder text visible
- [ ] All links within the app are functional and lead to correct destinations
- [ ] Error messages are user-friendly and informative
- [ ] Empty states have appropriate messaging (e.g., "No visits scheduled" instead of a blank screen)
- [ ] Demo/test data is clearly labeled or uses realistic-looking seed data that does not reference real individuals

### Medical Content Accuracy
- [ ] Assessment scoring algorithms are clinically accurate (PHQ-2, PHQ-9, PRAPARE, AWV)
- [ ] HEDIS measure criteria align with current NCQA specifications
- [ ] Medication safety checks (Beers Criteria, drug interactions) are evidence-based
- [ ] Clinical decision support rules produce appropriate recommendations
- [ ] No unsubstantiated diagnostic or treatment claims

---

## 3. Performance Requirements

### Stability
- [ ] App does not crash on launch
- [ ] App does not crash during any standard workflow (login → visit → intake → assessment → finalize)
- [ ] App handles network errors gracefully (loading indicators, error messages, retry options)
- [ ] App handles API timeout scenarios without crashing
- [ ] Memory usage is reasonable during extended sessions

### Responsiveness
- [ ] App launches within 3 seconds (splash screen to interactive)
- [ ] Page transitions are smooth (no blank screens or excessive loading)
- [ ] Form submissions provide immediate feedback (loading spinner, success/error message)
- [ ] Scrolling is smooth in long lists (visit list, medication list, assessment questions)

### Network
- [ ] App communicates with backend over HTTPS only
- [ ] API responses are handled for all HTTP status codes (200, 400, 401, 403, 404, 500)
- [ ] No hardcoded development/staging URLs in production build
- [ ] Backend server is deployed and accessible from the public internet during review

### Device Compatibility
- [ ] Tested on iPhone (multiple sizes: SE, standard, Pro Max)
- [ ] Tested on iPad (if supporting iPad)
- [ ] Tested on iOS 16.0 (minimum deployment target)
- [ ] Tested on latest iOS version

---

## 4. Safety & Privacy Requirements

### Privacy Policy
- [ ] Privacy policy URL is set in App Store Connect
- [ ] Privacy policy covers all data types collected (see [Privacy Policy](./privacy-policy.md))
- [ ] Privacy policy is accessible from within the app (settings or about section)
- [ ] Privacy policy mentions HIPAA alignment
- [ ] Privacy policy discloses third-party services (OpenAI for AI features)

### App Privacy Nutrition Labels
Complete the App Privacy section in App Store Connect for the following data types:

| Data Type | Collected | Linked to Identity | Used for Tracking |
|-----------|-----------|-------------------|-------------------|
| Health & Fitness (Health, Clinical Health Records) | Yes | Yes | No |
| Contact Info (Name, Email) | Yes | Yes | No |
| Identifiers (User ID) | Yes | Yes | No |
| Usage Data (Product Interaction) | Yes | Yes | No |
| Diagnostics (Crash Data, Performance Data) | Yes | No | No |
| Sensitive Info (Protected Health Information) | Yes | Yes | No |

- [ ] All data categories accurately declared
- [ ] No data is used for tracking or advertising
- [ ] Data collection purposes are specified (App Functionality, Healthcare)

### Data Handling
- [ ] All network communication uses HTTPS/TLS
- [ ] Passwords are never stored in plaintext
- [ ] Session tokens are stored securely
- [ ] Sensitive data is not logged to console in production builds
- [ ] PHI is not cached in unencrypted local storage
- [ ] App does not transmit data to unexpected third parties

### Consent
- [ ] User consent is obtained before recording voice audio
- [ ] NOPP (Notice of Privacy Practices) acknowledgement is captured
- [ ] Consent records are maintained within the visit workflow

---

## 5. Demo Account for Reviewers

Provide the following demo credentials in the App Review Information section:

### Primary Demo Account

| Field | Value |
|-------|-------|
| **Username** | `sarah.np` |
| **Password** | `password` |
| **Role** | Nurse Practitioner |

### What the Reviewer Can Do with This Account
1. View the NP Dashboard with assigned patient visits
2. Open a visit to see the Pre-Visit Summary
3. Navigate to the Intake Dashboard to see clinical tasks
4. Enter vital signs and see Clinical Decision Support alerts
5. Complete clinical assessments (PHQ-2, PHQ-9, PRAPARE, AWV)
6. Document HEDIS quality measures (BCS, COL, A1C)
7. Perform medication reconciliation with safety checks
8. View care plans with goals and interventions
9. Navigate to Review & Finalize to see completeness reports

### Additional Demo Accounts

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| Supervisor | `dr.williams` | `password` | Review and approve completed visits |
| Admin | `admin` | `password` | System administration, FHIR playground, demo management |
| Care Coordinator | `emma.coord` | `password` | Care coordination workflows |
| Compliance | `compliance` | `password` | Audit queue and compliance workflows |

### Important Notes for Demo
- The demo environment uses seed data with fictional patient records
- All patient names, dates of birth, and clinical data are fabricated for demonstration purposes
- The backend server must be running and accessible during the review period
- Ensure seed data is loaded before submission: verify at least 3 demo patients with visits exist

---

## 6. Notes for Reviewer

Submit the following in the "Notes" field of App Review Information:

```
Easy Health is a clinical documentation platform designed for licensed healthcare
professionals (Nurse Practitioners, Physicians, Care Coordinators) within authorized
healthcare organizations. It manages in-home clinical visits for Medicare Advantage
and ACA health plan populations.

THIS APP IS NOT INTENDED FOR DIRECT PATIENT/CONSUMER USE.
It is a professional clinical tool used by credentialed healthcare staff within
their scope of practice.

APP PURPOSE:
Easy Health enables healthcare teams to:
- Document in-home clinical visits with standardized workflows
- Conduct evidence-based assessments (PHQ-2, PHQ-9, PRAPARE, AWV)
- Track HEDIS quality measures (Breast Cancer Screening, Colorectal Cancer
  Screening, A1C Control)
- Reconcile patient medications with safety alerts (Beers Criteria,
  drug interactions)
- Generate care plans and coordinate follow-up care
- Export clinical data in FHIR R4 format for EHR interoperability
- Support supervisor review and compliance audit workflows

DEMO WALKTHROUGH:
1. Log in with: sarah.np / password (Nurse Practitioner role)
2. Dashboard shows assigned patient visits with status indicators
3. Select any visit to open the clinical workflow
4. Intake Dashboard displays tasks: Vitals, Assessments, HEDIS Measures,
   Medications, Care Plan
5. Complete individual tasks (tap into each section)
6. Navigate to "Review & Finalize" to see the completeness report
7. (Optional) Log in as dr.williams / password to see the Supervisor Review queue
8. (Optional) Log in as admin / password to see Admin features and FHIR Playground

TECHNICAL NOTES:
- Built with Capacitor (web technologies in a native iOS container)
- Requires active internet connection for API communication
- No in-app purchases
- No push notifications in this version
- No user-generated public content
- All data is demo/seed data — no real patient information

HEALTHCARE DATA NOTICE:
This application processes Protected Health Information (PHI) in production use.
The demo environment contains only fictional data. The application is designed
with HIPAA-aligned security controls including encrypted transmission,
role-based access, and audit logging.

AI FEATURES:
The app includes an optional AI voice capture feature that uses OpenAI's
API for audio transcription and clinical field extraction. This feature requires
explicit clinician consent before activation. In the demo environment, the AI
features may require an API key to function — the rest of the app is fully
functional without it.
```

---

## 7. Required Permissions

### Currently Required Permissions

| Permission | iOS Key | Reason | Used For |
|------------|---------|--------|----------|
| Microphone | `NSMicrophoneUsageDescription` | "Easy Health uses the microphone to record clinical documentation notes for AI-powered transcription." | Voice capture feature |
| Camera | `NSCameraUsageDescription` | "Easy Health uses the camera to capture clinical documentation photos." | Document/wound photo capture (if implemented) |

### Permission Best Practices
- [ ] Permissions are requested contextually (at the point of use, not at launch)
- [ ] Usage description strings clearly explain why the permission is needed
- [ ] App functions gracefully when permissions are denied (features that require the permission are disabled, other features still work)
- [ ] No unnecessary permissions requested

### Info.plist Configuration

Ensure these entries exist in `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Easy Health uses the microphone to record clinical documentation notes for AI-powered transcription. Recordings are only made when you explicitly start a recording session and after granting voice capture consent.</string>
```

---

## 8. Data Handling Transparency

### App Store Privacy Questionnaire Responses

**Does your app collect data?** Yes

**Data Linked to User:**
- Name (user's professional name for clinical attribution)
- Email Address (for account management)
- User ID (for session management and audit trails)
- Health Data (clinical observations, vital signs, assessments as part of professional documentation workflow)

**Data Not Linked to User:**
- Crash Data (for app stability improvement)
- Performance Data (for app performance optimization)

**Data Used for Tracking:** None

**Purposes:**
- App Functionality (core clinical documentation features)
- Healthcare or Fitness (clinical data documentation for healthcare delivery)

---

## 9. In-App Purchases

- [ ] **No in-app purchases** are included in this version
- [ ] App Store Connect "In-App Purchases" section is left empty
- [ ] No references to pricing, subscriptions, or premium features exist in the app
- [ ] If future versions will include IAP, ensure no mention of upcoming paid features

---

## 10. Medical & Healthcare App Considerations

Healthcare apps face additional scrutiny from Apple's review team. Address these specific concerns:

### Guideline 5.1.3 — Health and Health Research

- [ ] App does not make unsubstantiated medical claims
- [ ] App does not claim to diagnose, treat, or cure medical conditions
- [ ] Assessments are clearly labeled as screening tools, not diagnostic instruments
- [ ] Clinical Decision Support recommendations are presented as suggestions for clinician review, not automated decisions
- [ ] App clearly states it is for healthcare professionals, not consumer self-diagnosis

### Guideline 1.4.1 — Physical Harm

- [ ] App does not provide emergency medical advice
- [ ] No features could lead to physical harm if used incorrectly
- [ ] Clinical alerts include appropriate clinical context (e.g., "abnormal value — clinical correlation recommended" rather than "take action immediately")

### Regulatory Compliance

- [ ] App is not classified as a Software as a Medical Device (SaMD) that requires FDA clearance (it is a documentation/workflow tool, not a diagnostic device)
- [ ] If applicable, FDA 510(k) status is documented
- [ ] HIPAA alignment is documented (see [Privacy Policy](./privacy-policy.md))

### Healthcare-Specific Rejection Risks

| Risk | Mitigation |
|------|------------|
| "App makes medical claims" | Clearly frame as documentation tool for licensed professionals; assessments are screening tools with established clinical validity |
| "App requires specialized hardware" | App runs on standard iOS devices; no specialized medical devices required |
| "Data privacy concerns" | Comprehensive privacy policy, HIPAA alignment, encrypted transmission |
| "Limited audience" | This is valid — the app is for B2B healthcare, explain in reviewer notes |
| "Minimum functionality" | Document the breadth of features (15+ clinical workflow modules) |
| "Web wrapper" | Integrate native Capacitor plugins (StatusBar, SplashScreen, Keyboard) to demonstrate native integration |

### B2B / Enterprise App Considerations

If the app is only distributed to specific healthcare organizations:
- Consider using **Apple Business Manager** and **Volume Purchase Program** for managed distribution
- Consider **Unlisted App Distribution** (available since 2021) to distribute without appearing in public App Store search results
- In reviewer notes, explain the B2B nature and target audience

---

## 11. Pre-Submission Final Checklist

### Build Quality
- [ ] Production build created with `npm run build` (no development warnings)
- [ ] Capacitor synced: `npx cap sync ios`
- [ ] Archive builds successfully in Xcode
- [ ] No compiler warnings in Xcode
- [ ] App tested on physical device (not just simulator)
- [ ] No console.log or debug output in production

### App Store Connect
- [ ] App name, subtitle, and description finalized
- [ ] Keywords optimized (100 chars max)
- [ ] Screenshots uploaded for all required device sizes
- [ ] App icon uploaded (1024x1024, no alpha)
- [ ] Privacy policy URL valid and accessible
- [ ] Support URL valid and accessible
- [ ] Category set: Medical (primary), Business (secondary)
- [ ] Age rating completed: 17+
- [ ] App Privacy questionnaire completed
- [ ] Pricing set (Free, or appropriate pricing tier)

### Review Preparation
- [ ] Demo account credentials entered (sarah.np / password)
- [ ] Reviewer notes written with walkthrough instructions
- [ ] Backend server deployed and accessible
- [ ] Seed data loaded in demo environment
- [ ] All demo credentials verified working
- [ ] Demo server will remain accessible during review (1–3 weeks)

### Compliance
- [ ] Privacy policy published at privacy policy URL
- [ ] Terms of service published (if applicable)
- [ ] HIPAA BAA template available (for production customers)
- [ ] No real PHI in demo environment
- [ ] All patient data in demo is fictional

### Technical
- [ ] Bundle ID: `com.easyhealth.app`
- [ ] Version number set appropriately
- [ ] Build number incremented from last submission
- [ ] Deployment target: iOS 16.0
- [ ] Info.plist permission descriptions written
- [ ] No hardcoded staging/development URLs
- [ ] HTTPS used for all API communication
- [ ] ATS (App Transport Security) exceptions justified (if any)
