# iOS App Store Submission Guide — Easy Health

> **App Name:** Easy Health
> **Bundle ID:** `com.easyhealth.app`
> **Minimum iOS Version:** 16.0+
> **Category:** Medical / Business

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Setting Up the Capacitor iOS Project](#2-setting-up-the-capacitor-ios-project)
3. [Building the Web App](#3-building-the-web-app)
4. [Opening in Xcode](#4-opening-in-xcode)
5. [Configuring Signing & Capabilities](#5-configuring-signing--capabilities)
6. [App Icon Setup](#6-app-icon-setup)
7. [Launch Screen Configuration](#7-launch-screen-configuration)
8. [Setting Deployment Target](#8-setting-deployment-target)
9. [Building for Archive](#9-building-for-archive)
10. [Uploading to App Store Connect](#10-uploading-to-app-store-connect)
11. [App Store Connect Configuration](#11-app-store-connect-configuration)
12. [TestFlight Beta Testing](#12-testflight-beta-testing)
13. [Common Rejection Reasons](#13-common-rejection-reasons)

---

## 1. Prerequisites

Before you begin, ensure you have the following:

### Apple Developer Account
- Active **Apple Developer Program** membership ($99/year)
- Enrollment at [developer.apple.com/programs](https://developer.apple.com/programs/)
- Organization account recommended for healthcare/enterprise apps (requires D-U-N-S number)

### Development Environment
- **macOS** Ventura 13.0 or later (Sonoma 14+ recommended)
- **Xcode 15.0+** installed from the Mac App Store
- Xcode Command Line Tools: `xcode-select --install`
- **Node.js 18+** and **npm 9+**
- **CocoaPods** (if native plugin dependencies require it): `sudo gem install cocoapods`

### Certificates & Provisioning
1. Open Xcode → Settings → Accounts → Add your Apple ID
2. In [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list):
   - Create an **iOS Distribution Certificate** (Apple Distribution)
   - Create an **App ID** with bundle identifier `com.easyhealth.app`
   - Create a **Provisioning Profile** (App Store Distribution) linked to the certificate and App ID
3. Download and install the provisioning profile by double-clicking the `.mobileprovision` file

---

## 2. Setting Up the Capacitor iOS Project

### Install Capacitor Dependencies

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

### Verify Capacitor Configuration

The project already includes `capacitor.config.ts` at the root:

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.easyhealth.app",
  appName: "Easy Health",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "Easy Health",
    backgroundColor: "#2E456B",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#2E456B",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#2E456B",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
```

### Add the iOS Platform

```bash
npx cap add ios
```

This creates the `ios/` directory with a native Xcode project.

### Sync Web Assets

```bash
npx cap sync ios
```

This copies the built web assets into the iOS project and syncs native plugins.

---

## 3. Building the Web App

Before syncing to iOS, you must build the production web bundle:

```bash
npm run build
```

This compiles the React/Vite frontend and outputs to `dist/public/` (as configured in `capacitor.config.ts` → `webDir`).

**Verify the build:**
```bash
ls dist/public/
# Should contain index.html, assets/, and other static files
```

---

## 4. Opening in Xcode

```bash
npx cap open ios
```

This opens the Xcode workspace (`ios/App/App.xcworkspace`). Always open the `.xcworkspace` file, not the `.xcodeproj`.

---

## 5. Configuring Signing & Capabilities

1. In Xcode, select the **App** project in the navigator
2. Select the **App** target
3. Go to the **Signing & Capabilities** tab
4. Configure:
   - **Team:** Select your Apple Developer team
   - **Bundle Identifier:** `com.easyhealth.app`
   - **Provisioning Profile:** Select the App Store Distribution profile (or enable "Automatically manage signing" for development)
5. Add capabilities if needed:
   - **Associated Domains** (if using universal links)
   - **Push Notifications** (if implementing push)
   - **Background Modes** (if needed for background sync)

### Important Notes
- For App Store submission, use "Automatically manage signing" with your distribution team, or manually select the App Store provisioning profile
- Ensure the bundle ID matches exactly: `com.easyhealth.app`

---

## 6. App Icon Setup

### Required Icon Sizes

Prepare a **1024x1024** pixel app icon (PNG, no alpha/transparency for App Store).

Place icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:

| Size (px) | Scale | Usage |
|-----------|-------|-------|
| 20x20 | 1x | iPad Notifications |
| 20x20 | 2x | iPhone/iPad Notifications |
| 20x20 | 3x | iPhone Notifications |
| 29x29 | 1x | iPad Settings |
| 29x29 | 2x | iPhone/iPad Settings |
| 29x29 | 3x | iPhone Settings |
| 40x40 | 2x | iPhone/iPad Spotlight |
| 40x40 | 3x | iPhone Spotlight |
| 60x60 | 2x | iPhone App |
| 60x60 | 3x | iPhone App |
| 76x76 | 1x | iPad App |
| 76x76 | 2x | iPad App |
| 83.5x83.5 | 2x | iPad Pro App |
| 1024x1024 | 1x | App Store |

### Design Guidelines
- Use the Easy Health brand colors: Dark Blue `#2E456B` background with the Easy Health logo
- No transparency or alpha channel in the App Store icon
- No rounded corners (iOS applies them automatically)
- Ensure the icon is legible at small sizes

### Using Xcode 15+ Single Icon
Xcode 15+ supports a single 1024x1024 icon that auto-generates all sizes:
1. Open `Assets.xcassets` → `AppIcon`
2. In the Attributes Inspector, set "iOS" to "Single Size (iOS 17+)" or provide all sizes for backward compatibility

---

## 7. Launch Screen Configuration

The launch screen is configured in `ios/App/App/LaunchScreen.storyboard`.

### Recommended Setup
1. Open `LaunchScreen.storyboard` in Xcode
2. Set the background color to Easy Health Dark Blue (`#2E456B`)
3. Add the Easy Health logo centered on screen
4. Use Auto Layout constraints to center the logo on all device sizes
5. The Capacitor `SplashScreen` plugin handles the transition from launch screen to the web app

### Launch Screen Best Practices
- Keep it simple — a logo on a solid background
- Do not include text that may need localization
- Match the initial app UI background color for a seamless transition
- The launch screen must be a storyboard (not a static image)

---

## 8. Setting Deployment Target

1. In Xcode, select the **App** project
2. Under **General** → **Minimum Deployments**, set **iOS 16.0**
3. Also verify in **Build Settings** → search for "iOS Deployment Target" → set to **16.0**

### Why iOS 16.0?
- Covers 95%+ of active iOS devices
- Provides modern WebKit features for the Capacitor web view
- Supports latest SwiftUI and UIKit APIs for native plugins
- Required for certain accessibility and privacy APIs

---

## 9. Building for Archive

### Pre-Archive Checklist
- [ ] Web app built: `npm run build`
- [ ] Capacitor synced: `npx cap sync ios`
- [ ] Signing configured with Distribution certificate
- [ ] Bundle ID is `com.easyhealth.app`
- [ ] Version and Build numbers set (e.g., Version: 1.0.0, Build: 1)
- [ ] Deployment target is iOS 16.0

### Steps to Archive
1. In Xcode, select the device target as **Any iOS Device (arm64)**
2. Go to **Product** → **Archive**
3. Wait for the build to complete (this may take several minutes)
4. The Xcode Organizer window opens automatically with the new archive

### Setting Version Numbers
1. Select the App target → **General** tab
2. Set **Version** (e.g., `1.0.0`) — this is the public-facing version
3. Set **Build** (e.g., `1`) — increment this for each upload to App Store Connect

---

## 10. Uploading to App Store Connect

### Via Xcode Organizer
1. In the Organizer (Window → Organizer), select the archive
2. Click **Distribute App**
3. Select **App Store Connect** → **Upload**
4. Choose distribution options:
   - **Upload your app's symbols**: Yes (for crash reports)
   - **Manage Version and Build Number**: Yes (recommended)
5. Select the signing certificate and provisioning profile
6. Click **Upload**
7. Wait for the upload and processing to complete

### Via Transporter App (Alternative)
1. Export the archive as an `.ipa` file from Organizer
2. Open **Transporter** (free from Mac App Store)
3. Drag the `.ipa` file into Transporter
4. Click **Deliver**

### Post-Upload
- Processing takes 15–30 minutes
- You will receive an email when the build is ready
- If there are issues (e.g., missing icons, invalid entitlements), you will receive an error email

---

## 11. App Store Connect Configuration

Log in at [appstoreconnect.apple.com](https://appstoreconnect.apple.com).

### App Information

| Field | Value |
|-------|-------|
| **App Name** | Easy Health |
| **Subtitle** | In-Home Clinical Visit Platform |
| **Primary Category** | Medical |
| **Secondary Category** | Business |
| **Content Rights** | Does not contain third-party content |
| **Age Rating** | 17+ (Medical/Treatment Information) |

### Version Information

#### App Description (4000 characters max)

```
Easy Health is a comprehensive in-home clinical visit platform designed for healthcare organizations managing Medicare Advantage and ACA health plan populations. Built for Nurse Practitioners, supervisors, care coordinators, and compliance teams, Easy Health streamlines the entire clinical visit lifecycle from pre-visit preparation through post-visit quality assurance.

KEY FEATURES

Clinical Visit Management
Schedule, manage, and document in-home clinical visits with a structured workflow that ensures completeness and compliance. Each visit follows a guided process: pre-visit summary review, patient identity verification, consent capture, clinical intake, examination, and finalization.

Standardized Clinical Assessments
Conduct evidence-based assessments including PHQ-2 and PHQ-9 depression screening, PRAPARE social determinants of health survey, and Annual Wellness Visit health risk assessments. Automated scoring with clinical interpretation guides ensures accurate, consistent documentation.

HEDIS Quality Measures
Track and document Healthcare Effectiveness Data and Information Set (HEDIS) measures including Breast Cancer Screening (BCS), Colorectal Cancer Screening (COL), and Hemoglobin A1C Control. Measure-specific documentation forms capture screening types, dates, and results for accurate quality reporting.

Vital Signs & Physical Examination
Record comprehensive vital signs including blood pressure, heart rate, respiratory rate, temperature, oxygen saturation, height, weight, and BMI with automatic calculation. Clinical Decision Support provides real-time alerts for abnormal values.

Medication Reconciliation
Review and reconcile patient medications with integrated safety checks including Beers Criteria screening for potentially inappropriate medications in older adults and drug interaction alerts. Document medication changes with structured status tracking.

AI-Powered Voice Capture
Optional voice recording with AI transcription and structured field extraction accelerates clinical documentation. Clinicians review and approve extracted data before it enters the clinical record, maintaining documentation integrity.

FHIR R4 Interoperability
Import and export clinical data using HL7 FHIR R4 standard resources including Patient, Encounter, Observation, and Condition. Support for FHIR Bundles enables seamless health information exchange with EHR systems and health information networks.

Supervisor Review & Quality Assurance
Built-in supervisor review workflow with structured adjudication, completeness scoring, and return-for-rework capabilities. Compliance audit overlay with random sampling ensures ongoing quality and regulatory adherence.

Care Coordination
Generate and manage care plans with identified needs, goals, and interventions. Track referrals and coordinate follow-up care across the care team.

Clinical Decision Support
Real-time clinical rules evaluate patient data to generate actionable recommendations. Configurable rules cover assessment triggers, vital sign thresholds, and screening gaps.

DESIGNED FOR HEALTHCARE TEAMS
Easy Health supports role-based access for Nurse Practitioners, Supervising Physicians, Care Coordinators, Administrators, and Compliance Officers. Each role sees tailored dashboards, workflows, and tools optimized for their responsibilities.

SECURITY & COMPLIANCE
Built with healthcare data security in mind, featuring encrypted data transmission, role-based access controls, audit logging, and alignment with HIPAA privacy and security requirements.
```

#### Keywords (100 characters max)

```
clinical,HEDIS,Medicare,home visit,NP,vitals,assessment,FHIR,care plan,health,medical,screening
```

#### Promotional Text

```
Streamline in-home clinical visits with comprehensive assessments, HEDIS measures, medication reconciliation, and FHIR interoperability — all in one platform.
```

#### URLs

| Field | Value |
|-------|-------|
| **Support URL** | `https://www.easyhealth.app/support` |
| **Marketing URL** | `https://www.easyhealth.app` |
| **Privacy Policy URL** | `https://www.easyhealth.app/privacy` |

> **Note:** Replace placeholder URLs with your actual URLs before submission.

### Screenshots

#### Required Screenshot Sizes

| Device | Size (pixels) | Required |
|--------|---------------|----------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | Yes |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Yes |
| iPad Pro 12.9" (6th gen) | 2048 x 2732 | If supporting iPad |

#### Recommended Screenshots (6–10 per device)

1. **Login Screen** — Clean login with Easy Health branding
2. **Visit Dashboard** — List of scheduled visits with status indicators
3. **Intake Dashboard** — Task-driven clinical workflow with NP tasks and objectives
4. **Vitals Entry** — Vital signs recording with CDS alerts
5. **Assessment Runner** — PHQ-2/PHQ-9 questionnaire in progress
6. **HEDIS Measures** — BCS/COL screening documentation
7. **Medication Reconciliation** — Med review with safety alerts
8. **Care Plan** — Care coordination with goals and interventions
9. **Supervisor Review** — Review queue with completeness scoring
10. **FHIR Export** — Interoperability data exchange view

#### Screenshot Tips
- Use the iOS Simulator to capture clean screenshots
- Remove the status bar or use a clean status bar (full battery, Wi-Fi, no carrier)
- Consider using Fastlane's `snapshot` tool for automated screenshot capture
- Add marketing text overlays using tools like Screenshots Pro or Figma

### Age Rating

Complete the age rating questionnaire:
- **Medical/Treatment Information:** Frequent/Intense → results in **17+**
- All other categories: None
- This app does not contain unrestricted web access, gambling, or mature content

### App Review Information

| Field | Value |
|-------|-------|
| **First Name** | [Your First Name] |
| **Last Name** | [Your Last Name] |
| **Phone Number** | [Your Phone Number] |
| **Email Address** | [Your Email Address] |
| **Demo Username** | `sarah.np` |
| **Demo Password** | `password` |

#### Notes for Reviewer

```
Easy Health is a clinical documentation platform designed for healthcare organizations
that manage in-home Nurse Practitioner visits for Medicare Advantage and ACA health plan
members.

This app is intended for licensed healthcare professionals (Nurse Practitioners,
Physicians, Care Coordinators) within authorized healthcare organizations. It is not
intended for direct consumer/patient use.

DEMO WALKTHROUGH:
1. Log in with demo credentials: sarah.np / password (Nurse Practitioner role)
2. You will see the NP Dashboard with assigned patient visits
3. Select a visit to open the Intake Dashboard
4. The Intake Dashboard shows clinical tasks: Vitals, Assessments, HEDIS Measures,
   Medications
5. Complete tasks to document the clinical visit
6. Navigate to Review & Finalize to see the completeness report

ADDITIONAL DEMO ACCOUNTS:
- Supervisor: dr.williams / password (review and approve visits)
- Admin: admin / password (system administration, FHIR playground)

The app requires an internet connection to communicate with the backend API server.
No in-app purchases. No user-generated content.

This application handles protected health information (PHI) in compliance with HIPAA
requirements. All data is transmitted over HTTPS and stored with encryption at rest.
```

---

## 12. TestFlight Beta Testing

See the separate [TestFlight Guide](./testflight-guide.md) for detailed instructions.

### Quick Setup
1. Upload a build to App Store Connect (same process as production)
2. Navigate to the **TestFlight** tab in App Store Connect
3. Add **Internal Testers** (up to 100, from your App Store Connect team)
4. Create **External Testing Groups** (up to 10,000 testers) — requires Beta App Review
5. Distribute builds and collect feedback

---

## 13. Common Rejection Reasons

### 1. Guideline 5.1.1 — Data Collection and Storage (Privacy)
**Issue:** Missing or inadequate privacy policy; not disclosing data collection practices.
**Solution:**
- Include a comprehensive privacy policy URL (see [Privacy Policy](./privacy-policy.md))
- Complete the App Privacy section in App Store Connect (nutrition labels)
- Declare all data types collected: health data, clinical records, credentials

### 2. Guideline 5.1.2 — Data Use and Sharing
**Issue:** Using health data without proper consent or for advertising.
**Solution:**
- Easy Health does not use clinical data for advertising
- All data is used solely for clinical documentation purposes
- Consent is captured within the app workflow

### 3. Guideline 2.1 — App Completeness
**Issue:** App crashes, has broken links, or shows placeholder content.
**Solution:**
- Test all flows end-to-end before submission
- Ensure the demo account works with seed data
- Verify all API endpoints are accessible from the production server

### 4. Guideline 4.2 — Minimum Functionality
**Issue:** App is essentially a web view with no native functionality.
**Solution:**
- Integrate Capacitor native plugins (StatusBar, SplashScreen, Keyboard)
- Use native navigation patterns where possible
- Ensure the app provides value beyond what a mobile website offers
- Consider adding push notifications, offline capabilities, or biometric auth

### 5. Guideline 5.1.3 — Health and Health Research
**Issue:** Apps dealing with health data have heightened scrutiny.
**Solution:**
- Clearly explain the app's purpose in review notes
- Emphasize it is for licensed healthcare professionals, not consumers
- Document HIPAA alignment
- Disclose any AI/ML features and their clinical role

### 6. Guideline 1.1.1 — Objectionable Content
**Issue:** Medical content may trigger content review flags.
**Solution:**
- Set the age rating appropriately (17+ for medical content)
- Content is clinical documentation, not graphic or objectionable

### 7. Missing Demo Credentials
**Issue:** Reviewer cannot access the app to test it.
**Solution:**
- Always provide working demo credentials in the App Review Information section
- Ensure the demo server is running and accessible during review (reviews can happen at any time)
- Verify credentials work before each submission

### 8. Guideline 2.3 — Accurate Metadata
**Issue:** Screenshots, description, or metadata don't match app functionality.
**Solution:**
- Use actual app screenshots (not mockups or marketing renders)
- Ensure the description accurately reflects current features
- Update screenshots when UI changes significantly

---

## Appendix: Submission Checklist

- [ ] Apple Developer account active and enrolled
- [ ] Certificates and provisioning profiles created
- [ ] `npm run build` completes without errors
- [ ] `npx cap sync ios` completes without errors
- [ ] App opens and runs in Xcode Simulator
- [ ] Signing configured with distribution certificate
- [ ] Bundle ID: `com.easyhealth.app`
- [ ] Version and build numbers set
- [ ] App icons added (all sizes including 1024x1024)
- [ ] Launch screen configured with Easy Health branding
- [ ] Deployment target: iOS 16.0
- [ ] Archive builds successfully
- [ ] Upload to App Store Connect succeeds
- [ ] App Store listing configured (name, description, keywords, screenshots)
- [ ] Privacy policy URL configured
- [ ] App Privacy nutrition labels completed
- [ ] Age rating questionnaire completed (17+)
- [ ] Demo credentials provided for reviewer
- [ ] Review notes written
- [ ] TestFlight tested with internal team
- [ ] All links and API endpoints accessible
