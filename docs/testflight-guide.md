# TestFlight Testing Guide — Easy Health

> This guide covers setting up and managing beta testing for the Easy Health iOS app using Apple's TestFlight platform.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Build Upload Process](#2-build-upload-process)
3. [Internal Testing Setup](#3-internal-testing-setup)
4. [External Testing Setup](#4-external-testing-setup)
5. [Test Plan](#5-test-plan)
6. [Bug Reporting Workflow](#6-bug-reporting-workflow)
7. [Feedback Collection](#7-feedback-collection)
8. [Managing Builds](#8-managing-builds)

---

## 1. Overview

TestFlight allows you to distribute beta builds of Easy Health to testers before the App Store release. There are two types of testing:

| Feature | Internal Testing | External Testing |
|---------|-----------------|-----------------|
| **Max Testers** | 100 | 10,000 |
| **Who Can Test** | App Store Connect team members | Anyone with an email address |
| **Beta App Review** | Not required | Required (first build per version) |
| **Build Availability** | Immediately after processing | After Beta App Review approval |
| **Build Expiration** | 90 days | 90 days |
| **Feedback** | Via TestFlight app | Via TestFlight app |

---

## 2. Build Upload Process

### Step 1: Build the Web App

```bash
npm run build
```

Verify the output:
```bash
ls dist/public/
```

### Step 2: Sync with Capacitor

```bash
npx cap sync ios
```

### Step 3: Set Version and Build Numbers

In Xcode:
1. Select the **App** target → **General** tab
2. Set **Version** (semantic versioning, e.g., `1.0.0`)
3. Set **Build** number (increment for each upload, e.g., `1`, `2`, `3`)

Version numbering convention:
- **Version:** `MAJOR.MINOR.PATCH` (e.g., `1.0.0` for initial release)
- **Build:** Sequential integer that increments with every upload (e.g., `1`, `2`, `3`...)

### Step 4: Archive the Build

1. In Xcode, set the target device to **Any iOS Device (arm64)**
2. **Product** → **Archive**
3. Wait for the archive to complete

### Step 5: Upload to App Store Connect

1. In the Organizer window, select the new archive
2. Click **Distribute App**
3. Select **TestFlight & App Store** (or **App Store Connect**)
4. Follow the prompts to upload
5. Wait for processing (15–30 minutes)

### Step 6: Verify the Build

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps** → **Easy Health** → **TestFlight**
3. Verify the build appears and processing is complete
4. Check for any compliance or export issues

---

## 3. Internal Testing Setup

Internal testers must be members of your App Store Connect team with the Developer, Admin, App Manager, or Marketing role.

### Adding Internal Testers

1. In App Store Connect, go to **Users and Access**
2. Add team members if they are not already added
3. Navigate to **My Apps** → **Easy Health** → **TestFlight**
4. Click the **Internal Testing** section (or create an internal group)
5. Click **+** to add testers from your team
6. Select team members and click **Add**

### Creating an Internal Testing Group

1. Go to **TestFlight** → **Internal Testing**
2. Click **+** next to "Internal Testing" to create a new group
3. Name the group (e.g., "Engineering Team", "Clinical Advisors")
4. Add testers to the group
5. Enable "Automatic Distribution" to send new builds automatically

### Internal Tester Experience

1. Tester receives an email invitation with a redemption code
2. Tester installs the **TestFlight** app from the App Store
3. Tester redeems the code or taps the invitation link
4. The Easy Health beta app appears in TestFlight and can be installed
5. Tester receives push notifications when new builds are available

---

## 4. External Testing Setup

External testing allows you to distribute to up to 10,000 testers who are not part of your App Store Connect team. The first build of each version requires **Beta App Review** approval.

### Creating an External Testing Group

1. Go to **TestFlight** → **External Testing**
2. Click **+** to create a new group
3. Name the group (e.g., "Beta Testers", "Clinical Partners", "QA Team")
4. Configure the group:
   - **Public Link:** Enable to generate a shareable TestFlight link (optional)
   - **Tester Limit:** Set maximum testers if using a public link

### Adding External Testers

**By Email:**
1. Select the external testing group
2. Click **+** next to Testers
3. Enter email addresses (one per line or comma-separated)
4. Click **Add**

**By Public Link:**
1. Enable "Public Link" for the group
2. Share the generated URL
3. Testers visit the link and join the beta
4. Set a tester limit to control access

### Beta App Review

The first build submitted to external testers requires Beta App Review:

1. Select the build for external testing
2. Fill in the **Beta App Information**:
   - **Beta App Description:** "Easy Health is a clinical visit platform for healthcare professionals managing in-home visits for Medicare Advantage and ACA populations."
   - **Feedback Email:** [your-email@easyhealth.app]
   - **Contact Information:** Required contact details
   - **Demo Account:** `sarah.np` / `password`
   - **Notes:** Same as App Review notes (see App Store Submission Guide)
3. Submit for Beta App Review
4. Review typically takes 24–48 hours
5. Once approved, subsequent builds of the same version do not require re-review

### Recommended External Testing Groups

| Group Name | Audience | Purpose |
|------------|----------|---------|
| QA Team | Internal QA engineers | Comprehensive testing |
| Clinical Advisors | NPs, MDs providing feedback | Clinical workflow validation |
| Partner Organizations | Healthcare org stakeholders | User acceptance testing |
| Field Testers | NPs who will use the app | Real-world usability testing |

---

## 5. Test Plan

### 5.1 Authentication & Access

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| A1 | NP Login | Enter `sarah.np` / `password`, tap Login | Dashboard loads with NP role |
| A2 | Supervisor Login | Enter `dr.williams` / `password`, tap Login | Dashboard loads with Supervisor role |
| A3 | Admin Login | Enter `admin` / `password`, tap Login | Dashboard loads with Admin role, admin menu visible |
| A4 | Invalid Credentials | Enter `invalid` / `wrong`, tap Login | Error message displayed |
| A5 | Role-Based Navigation | Log in as each role | Sidebar shows appropriate menu items per role |
| A6 | Logout | Tap logout option | Returns to login screen, session cleared |

### 5.2 Visit Management

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| V1 | View Visit List | Log in as NP, navigate to Visits | List of assigned visits displayed |
| V2 | Open Visit Detail | Tap a visit from the list | Visit detail page loads with patient info |
| V3 | View Pre-Visit Summary | Open a visit, navigate to Pre-Visit Summary | Patient demographics, history, and care gaps shown |
| V4 | Start Clinical Intake | Open a visit, navigate to Intake Dashboard | Task list and objectives displayed |
| V5 | Visit Status Indicators | View visit list | Status badges (Scheduled, In Progress, Completed) display correctly |

### 5.3 Clinical Intake — Vital Signs

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| VS1 | Enter Vital Signs | Navigate to Vitals, enter BP 120/80, HR 72, RR 16, Temp 98.6, SpO2 98 | Values saved, BMI calculated |
| VS2 | Abnormal Vitals Alert | Enter BP 180/110 | CDS alert triggered for hypertension |
| VS3 | Low SpO2 Alert | Enter SpO2 88 | CDS alert triggered for low oxygen |
| VS4 | Save and Return | Enter vitals, save, navigate away, return | Saved values persist |
| VS5 | BMI Calculation | Enter height and weight | BMI auto-calculated and displayed |

### 5.4 Clinical Assessments

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| CA1 | PHQ-2 Screening | Complete PHQ-2 with score < 3 | Score calculated, negative screen, PHQ-9 not required |
| CA2 | PHQ-2 Positive Screen | Complete PHQ-2 with score >= 3 | Score calculated, positive screen, PHQ-9 added to tasks |
| CA3 | PHQ-9 Full Assessment | Complete PHQ-9 (all 9 questions) | Score calculated with severity band |
| CA4 | PRAPARE Assessment | Complete PRAPARE social determinants survey | All responses saved, summary generated |
| CA5 | Annual Wellness Visit | Complete AWV health risk assessment | Risk factors identified and documented |
| CA6 | Partial Save | Start assessment, save without completing | Draft saved, can resume later |
| CA7 | Unable to Assess | Mark assessment as unable to complete | Reason code selection dialog appears, exclusion recorded |

### 5.5 HEDIS Quality Measures

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| H1 | BCS Documentation | Select mammogram type, enter date, mark complete | BCS measure documented with screening metadata |
| H2 | COL Documentation | Select colonoscopy, enter date within 10yr lookback | COL measure documented |
| H3 | A1C Documentation | Enter A1C result | A1C control measure documented |
| H4 | Measure Exclusion | Exclude a measure with reason | Exclusion recorded with structured reason code |
| H5 | HEDIS Guidance Banner | Open BCS measure for eligible patient | Age range and documentation requirements displayed |

### 5.6 Medication Reconciliation

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| MR1 | View Current Medications | Navigate to Medication Reconciliation | Patient's medication list displayed |
| MR2 | Add Medication | Add a new medication manually | Medication added to list |
| MR3 | Quick Add from History | Add medication from patient history | Medication populated with historical data |
| MR4 | Beers Criteria Alert | Add a Beers-listed medication for elderly patient | Safety alert displayed |
| MR5 | Drug Interaction Alert | Add two interacting medications | Interaction warning displayed |
| MR6 | Reconciliation Status | Change med status (verified, discontinued, etc.) | Status updated with visual indicator |

### 5.7 Voice Capture (AI Features)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| VC1 | Consent Gate | Navigate to Voice Capture without consent | Consent required message shown |
| VC2 | Grant Consent | Accept voice transcription consent | Voice capture enabled |
| VC3 | Record Audio | Start recording, speak, stop recording | Recording saved |
| VC4 | Transcription | Upload recording for transcription | Transcript generated (requires API key) |
| VC5 | Field Extraction | Extract fields from transcript | Structured fields presented for review |
| VC6 | Accept/Reject Fields | Review extracted fields, accept or reject | Accepted fields saved to visit record |

### 5.8 Review & Finalization

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| RF1 | Completeness Report | Navigate to Review & Finalize | Completeness grouped report displayed |
| RF2 | Incomplete Visit | Attempt to finalize with missing tasks | Gating prevents finalization, missing items listed |
| RF3 | Complete Visit | Complete all required tasks, finalize | Visit status changes to "Ready for Review" |
| RF4 | View Auto-Codes | Check generated CPT/HCPCS/ICD-10 codes | Codes displayed with verify/remove options |

### 5.9 Supervisor Review

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| SR1 | Review Queue | Log in as Supervisor, view review queue | Pending visits listed with completeness scores |
| SR2 | Approve Visit | Review and approve a completed visit | Visit status changes to Approved |
| SR3 | Return for Rework | Return visit with structured reasons | Visit returned to NP with remediation notes |
| SR4 | Filter Reviews | Filter by status, NP, or sort criteria | Filtered results displayed correctly |
| SR5 | Adjudication Summary | View adjudication scorecard | Completeness metrics and risk indicators shown |

### 5.10 FHIR Interoperability

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| F1 | Export Patient | Export a patient as FHIR resource | Valid FHIR R4 Patient resource generated |
| F2 | Export Bundle | Export full visit as FHIR Bundle | Complete FHIR Bundle with all resources |
| F3 | Import Patient | Import a FHIR Patient resource | Patient created or updated in system |
| F4 | FHIR Playground | Log in as Admin, navigate to FHIR Playground | Export, Import, and API Reference tabs accessible |

### 5.11 iOS-Specific Testing

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| iOS1 | Launch Screen | Cold start the app | Easy Health splash screen displays with dark blue background |
| iOS2 | Status Bar | Use the app | Light status bar text on dark blue header |
| iOS3 | Keyboard Handling | Tap into text inputs | Keyboard appears, view adjusts properly |
| iOS4 | Safe Area | Use on device with notch | Content respects safe area insets |
| iOS5 | Orientation | Rotate device (if supported) | Layout adjusts appropriately |
| iOS6 | Background/Foreground | Send app to background, return | App resumes correctly, session intact |
| iOS7 | Swipe Navigation | Use swipe-back gesture | Navigation works as expected |
| iOS8 | Scroll Performance | Scroll through long lists | Smooth scrolling, no jank |

### 5.12 Performance & Edge Cases

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| P1 | Slow Network | Use on 3G or throttled connection | App functions with loading indicators, no crashes |
| P2 | No Network | Disconnect network | Graceful error messages, no crashes |
| P3 | Large Data | Open visit with many medications/assessments | Lists render without performance degradation |
| P4 | Rapid Navigation | Quickly navigate between pages | No crashes or visual glitches |
| P5 | Memory | Extended use session (30+ minutes) | No memory leaks or slowdowns |

---

## 6. Bug Reporting Workflow

### For Testers

#### Using TestFlight's Built-in Feedback
1. Take a screenshot while in the Easy Health beta app
2. TestFlight automatically prompts: "Do you want to send feedback?"
3. Annotate the screenshot if needed
4. Add a text description of the issue
5. Tap **Submit**

#### Manual Feedback
1. Open the **TestFlight** app
2. Find **Easy Health** in your apps
3. Tap **Send Beta Feedback**
4. Describe the issue and attach screenshots

### Bug Report Template

When reporting bugs, include the following information:

```
**Summary:** [Brief description of the issue]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:** [What should happen]

**Actual Result:** [What actually happened]

**Severity:** [Critical / High / Medium / Low]

**Device:** [e.g., iPhone 15 Pro]
**iOS Version:** [e.g., 17.2]
**App Version:** [e.g., 1.0.0 (3)]
**Role Used:** [e.g., NP - sarah.np]

**Screenshots/Recordings:** [Attached]

**Additional Context:** [Any relevant details]
```

### Severity Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Critical** | App crashes, data loss, security issue | App crashes when saving vitals |
| **High** | Feature broken, workflow blocked | Cannot complete PHQ-2 assessment |
| **Medium** | Feature partially working, workaround exists | Keyboard overlaps input field on iPhone SE |
| **Low** | Cosmetic issue, minor UI problem | Badge color slightly off-brand |

### For the Development Team

1. Monitor TestFlight feedback in App Store Connect → **TestFlight** → **Feedback**
2. Triage incoming bugs by severity
3. Create issues in your project management tool (Jira, Linear, GitHub Issues)
4. Assign to developers with target build for fix
5. Verify fixes in the next TestFlight build
6. Close the feedback in App Store Connect

---

## 7. Feedback Collection

### Structured Feedback Channels

#### TestFlight In-App Feedback
- Automatic screenshot feedback prompts
- Available throughout the testing period
- Feedback visible in App Store Connect

#### Feedback Survey
Distribute a structured survey after each testing sprint:

1. **Overall Experience (1-5):** How would you rate the overall app experience?
2. **Ease of Use (1-5):** How easy is it to complete a clinical visit workflow?
3. **Performance (1-5):** How would you rate the app's speed and responsiveness?
4. **Feature Completeness:** Are there any workflows or features that feel incomplete?
5. **Navigation:** Is it easy to find what you need within the app?
6. **Clinical Accuracy:** Do the assessment forms and scoring match clinical expectations?
7. **iOS Experience:** Does the app feel native and responsive on your device?
8. **Top 3 Issues:** What are the three biggest issues you encountered?
9. **Feature Requests:** What features would you like to see added?
10. **Would Recommend (1-10):** How likely are you to recommend this app to a colleague?

#### Clinical Advisory Feedback
For clinical stakeholders, focus on:
- Clinical workflow accuracy
- Assessment questionnaire correctness
- HEDIS measure documentation completeness
- Medication reconciliation usability
- Care plan adequacy
- Compliance with clinical standards

### Feedback Review Cadence

| Cadence | Activity |
|---------|----------|
| **Daily** | Review crash reports and critical bugs |
| **Twice Weekly** | Triage all new TestFlight feedback |
| **Weekly** | Team review of feedback trends and priorities |
| **Per Sprint** | Survey distribution and analysis |
| **Per Release** | Comprehensive feedback summary and action items |

---

## 8. Managing Builds

### Build Lifecycle

1. **Processing:** Build is uploaded and being processed by Apple (15–30 min)
2. **Ready to Test:** Build is available for testing
3. **Testing:** Actively distributed to testers
4. **Expired:** Build is older than 90 days and no longer installable

### Best Practices

- **Increment build numbers** with every upload (Xcode will warn about duplicates)
- **Add build notes** describing what changed in each build ("What to Test" section)
- **Expire old builds** manually if they contain known critical bugs
- **Keep 2-3 active builds** maximum to avoid tester confusion
- **Tag builds clearly** (e.g., "Sprint 12 - Vitals Rework", "RC1 - Pre-Submission")

### What to Test Notes Template

When adding a build to TestFlight, include "What to Test" notes:

```
Build 1.0.0 (5) — February 10, 2026

NEW IN THIS BUILD:
- [Feature/fix 1]
- [Feature/fix 2]
- [Feature/fix 3]

PLEASE TEST:
- [Specific area to focus on]
- [Specific workflow to validate]

KNOWN ISSUES:
- [Known issue 1]
- [Known issue 2]

DEMO CREDENTIALS:
- NP: sarah.np / password
- Supervisor: dr.williams / password
- Admin: admin / password
```

### Removing a Build

1. Go to **TestFlight** → select the build
2. Click **Expire Build**
3. Testers will no longer be able to install it
4. Testers who already have it installed can continue using it until they update
