# iOS Build Guide — Easy Health

> Technical guide for building, debugging, and deploying the Easy Health iOS app using Capacitor.

---

## Table of Contents

1. [Development Environment Setup](#1-development-environment-setup)
2. [Clone Repository and Install Dependencies](#2-clone-repository-and-install-dependencies)
3. [Build the Web App](#3-build-the-web-app)
4. [Capacitor Sync Commands](#4-capacitor-sync-commands)
5. [Xcode Project Configuration](#5-xcode-project-configuration)
6. [Debugging on iOS Simulator](#6-debugging-on-ios-simulator)
7. [Debugging on Physical Device](#7-debugging-on-physical-device)
8. [Production Build and Archive](#8-production-build-and-archive)
9. [Troubleshooting Common Build Issues](#9-troubleshooting-common-build-issues)
10. [Environment Variables and Configuration](#10-environment-variables-and-configuration)

---

## 1. Development Environment Setup

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| macOS | Ventura 13.0+ (Sonoma 14+ recommended) | Required for Xcode |
| Xcode | 15.0+ | iOS build toolchain |
| Xcode Command Line Tools | Latest | CLI build tools |
| Node.js | 18.0+ | JavaScript runtime |
| npm | 9.0+ | Package manager |
| CocoaPods | 1.14+ | iOS dependency manager (if needed) |

### Installation Steps

#### 1. Install Xcode
```bash
# Install from Mac App Store, then:
xcode-select --install
sudo xcodebuild -license accept
```

#### 2. Install Node.js
```bash
# Using Homebrew (recommended)
brew install node@18

# Or download from https://nodejs.org
```

#### 3. Install CocoaPods (if needed for native plugins)
```bash
sudo gem install cocoapods
# Or via Homebrew:
brew install cocoapods
```

#### 4. Verify Installation
```bash
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher
xcodebuild -version  # Should show Xcode 15+
pod --version     # Should be 1.14+
```

---

## 2. Clone Repository and Install Dependencies

### Clone the Repository

```bash
git clone <repository-url> easy-health
cd easy-health
```

### Install Node.js Dependencies

```bash
npm install
```

This installs all dependencies including:
- `@capacitor/core` — Capacitor runtime
- `@capacitor/cli` — Capacitor CLI tools
- `@capacitor/ios` — iOS platform support
- All web app dependencies (React, Vite, etc.)

### Add the iOS Platform (First Time Only)

```bash
npx cap add ios
```

This generates the `ios/` directory containing the native Xcode project. You only need to run this once — after the initial setup, use `npx cap sync` to update.

---

## 3. Build the Web App

The iOS app wraps the production web build. You must build the web app before syncing to iOS.

### Production Build

```bash
npm run build
```

This runs the Vite build process, compiling the React frontend and bundling it into `dist/public/` (the directory configured in `capacitor.config.ts` as `webDir`).

### Verify the Build Output

```bash
ls -la dist/public/
# Expected contents:
# - index.html
# - assets/  (JS, CSS bundles)
# - icons/   (app icons)
# - manifest.json
# - sw.js    (service worker)
# - favicon.png
```

### Build Considerations

- The production build minifies JavaScript and CSS
- Source maps are not included in the production build by default
- Ensure there are no TypeScript or build errors before proceeding
- The build uses environment variables prefixed with `VITE_` (see Section 10)

---

## 4. Capacitor Sync Commands

### Full Sync

```bash
npx cap sync ios
```

This command:
1. Copies the web build (`dist/public/`) into the iOS project (`ios/App/App/public/`)
2. Updates native Capacitor plugins
3. Updates `capacitor.config.ts` settings in the native project
4. Runs `pod install` if CocoaPods dependencies are needed

**Run this after every web build and before opening Xcode.**

### Copy Only (Web Assets)

```bash
npx cap copy ios
```

This copies only the web assets without updating native plugins. Faster than full sync when you have only changed web code and not added/removed Capacitor plugins.

### Update Native Plugins

```bash
npx cap update ios
```

This updates native plugin code and runs `pod install`. Use this when you have added or removed Capacitor plugins via npm.

### Verify Sync Status

```bash
npx cap doctor
```

This checks the Capacitor project configuration and reports any issues.

---

## 5. Xcode Project Configuration

### Opening the Project

```bash
npx cap open ios
```

This opens `ios/App/App.xcworkspace` in Xcode. Always open the `.xcworkspace` file (not `.xcodeproj`) to include CocoaPods dependencies.

### Project Settings

Select the **App** project in the Xcode navigator, then the **App** target:

#### General Tab

| Setting | Value |
|---------|-------|
| Display Name | Easy Health |
| Bundle Identifier | com.easyhealth.app |
| Version | 1.0.0 |
| Build | 1 |
| Minimum Deployments → iOS | 16.0 |
| Device Orientation | Portrait (required), Landscape Left/Right (optional) |

#### Signing & Capabilities Tab

| Setting | Value |
|---------|-------|
| Automatically manage signing | Enabled (for development) or Disabled (for distribution with manual profiles) |
| Team | Your Apple Developer Team |
| Provisioning Profile | Automatic or manually selected |

#### Build Settings

Search for and verify these settings:

| Setting | Value |
|---------|-------|
| iOS Deployment Target | 16.0 |
| Swift Language Version | Swift 5 |
| Build Active Architecture Only | Yes (Debug), No (Release) |
| Enable Bitcode | No (deprecated in Xcode 14+) |

### Info.plist Configuration

The `Info.plist` is located at `ios/App/App/Info.plist`. Verify or add these entries:

```xml
<!-- Microphone permission (for voice capture) -->
<key>NSMicrophoneUsageDescription</key>
<string>Easy Health uses the microphone to record clinical documentation notes for AI-powered transcription. Recordings are only made when you explicitly start a recording session and after granting voice capture consent.</string>

<!-- Camera permission (if photo capture is used) -->
<key>NSCameraUsageDescription</key>
<string>Easy Health uses the camera to capture clinical documentation photos.</string>

<!-- App Transport Security (HTTPS enforced) -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

### Capacitor Configuration

The project uses `capacitor.config.ts` for Capacitor settings:

```typescript
const config: CapacitorConfig = {
  appId: "com.easyhealth.app",
  appName: "Easy Health",
  webDir: "dist/public",
  server: {
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
```

---

## 6. Debugging on iOS Simulator

### Running on Simulator

1. In Xcode, select a simulator device from the scheme dropdown (e.g., "iPhone 15 Pro")
2. Click the **Run** button (or press `Cmd + R`)
3. Wait for the app to build and launch in the simulator

### Simulator Tips

| Action | How |
|--------|-----|
| Rotate device | `Cmd + Left/Right Arrow` |
| Home button | `Cmd + Shift + H` |
| Lock screen | `Cmd + L` |
| Take screenshot | `Cmd + S` |
| Shake gesture | `Cmd + Ctrl + Z` |
| Slow animations | Debug → Slow Animations |
| Simulate memory warning | Debug → Simulate Memory Warning |
| Simulate location | Debug → Location → Custom Location |

### Web Inspector Debugging

To debug the web content running inside the Capacitor WebView:

1. In the Simulator, run the Easy Health app
2. Open **Safari** on your Mac
3. Go to **Develop** menu → select the Simulator device → select the web page
4. Safari Web Inspector opens, allowing you to:
   - Inspect DOM elements
   - View console logs
   - Debug JavaScript with breakpoints
   - Monitor network requests
   - Profile performance

**If the Develop menu is not visible in Safari:**
Safari → Settings → Advanced → "Show features for web developers" (check the box)

### Logging

```typescript
// Console.log statements in the web app appear in Safari Web Inspector
console.log("Debug value:", someVariable);

// For Capacitor native layer logs, check Xcode's console output
```

### Common Simulator Issues

- **White screen on launch:** Web build is missing or not synced. Run `npm run build && npx cap sync ios`
- **Assets not loading:** Clear the simulator data: Device → Erase All Content and Settings
- **Old code running:** Clean build folder in Xcode: `Cmd + Shift + K`, then rebuild

---

## 7. Debugging on Physical Device

### Prerequisites

1. **Apple Developer Account** (free account works for development, paid for distribution)
2. **USB-C or Lightning cable** to connect the device
3. **Device registered** in your Apple Developer account (automatic with Xcode managed signing)

### Setup Steps

1. Connect your iPhone/iPad to your Mac via cable
2. On the device: Settings → Privacy & Security → Developer Mode → Enable (iOS 16+)
3. Trust the computer when prompted on the device
4. In Xcode, select your physical device from the scheme dropdown
5. Click **Run** (`Cmd + R`)
6. On first run, you may need to trust the developer certificate on the device:
   - Settings → General → VPN & Device Management → tap your developer cert → Trust

### Web Inspector on Physical Device

1. On the iOS device: Settings → Safari → Advanced → Web Inspector → Enable
2. Connect the device to your Mac
3. Open Safari on your Mac
4. Develop menu → select your device → select the web page
5. Debug with full Safari Web Inspector capabilities

### Wireless Debugging (Xcode 15+)

1. Connect the device via USB at least once
2. In Xcode: Window → Devices and Simulators
3. Select your device → check "Connect via network"
4. Disconnect the USB cable
5. Your device should appear in the scheme dropdown over Wi-Fi

### Physical Device Tips

- Test on the oldest supported device (iPhone 8/SE with iOS 16) for performance baseline
- Test on devices with small screens (iPhone SE) and large screens (iPhone 15 Pro Max)
- Test with different network conditions (Wi-Fi, cellular, airplane mode)
- Monitor battery impact during extended testing sessions

---

## 8. Production Build and Archive

### Step-by-Step Production Build

```bash
# Step 1: Clean previous builds
rm -rf dist/

# Step 2: Build the production web app
npm run build

# Step 3: Sync with iOS project
npx cap sync ios
```

### Archive in Xcode

1. Select **Any iOS Device (arm64)** as the build target (not a specific simulator or device)
2. Set the version number (General → Version, e.g., `1.0.0`)
3. Set the build number (General → Build, e.g., `1`)
4. Go to **Product** → **Archive**
5. Wait for the build to complete
6. Xcode Organizer opens with the new archive

### Distribute the Archive

#### For TestFlight / App Store

1. In Organizer, select the archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Choose **Upload** (for TestFlight and submission) or **Export** (for manual upload via Transporter)
5. Select distribution options:
   - Include app symbols: **Yes**
   - Manage version and build number: **Yes** (recommended)
6. Select signing certificate and provisioning profile
7. Click **Upload**

#### For Ad Hoc Distribution (Enterprise Testing)

1. In Organizer, select the archive
2. Click **Distribute App**
3. Select **Ad Hoc**
4. Select devices included in the provisioning profile
5. Export the `.ipa` file

### Automating Builds with Fastlane (Optional)

For CI/CD automation, consider setting up Fastlane:

```bash
# Install Fastlane
gem install fastlane

# Initialize in the ios directory
cd ios && fastlane init
```

Example `Fastfile`:
```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    build_app(
      workspace: "App/App.xcworkspace",
      scheme: "App",
      export_method: "app-store"
    )
    upload_to_testflight
  end
end
```

---

## 9. Troubleshooting Common Build Issues

### Build Failures

#### "No such module 'Capacitor'"
```bash
# Solution: Reinstall pods
cd ios/App && pod install --repo-update && cd ../..
```

#### "Signing requires a development team"
1. Open Xcode → App target → Signing & Capabilities
2. Select your development team from the dropdown
3. If no team appears, add your Apple ID in Xcode → Settings → Accounts

#### "Provisioning profile doesn't include device"
```bash
# For development: Enable automatic signing in Xcode
# For distribution: Regenerate the provisioning profile in Apple Developer Portal
# including the test device's UDID
```

#### "Command PhaseScriptExecution failed"
```bash
# Clean and rebuild
# In Xcode: Product → Clean Build Folder (Cmd + Shift + K)
# Then rebuild: Cmd + B
```

#### "Multiple commands produce..."
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
# Rebuild the project
```

### Web Content Issues

#### White/Blank Screen After Launch
```bash
# Verify web build exists
ls dist/public/index.html

# If missing, rebuild and sync
npm run build
npx cap sync ios
```

#### API Calls Failing (Network Error)
- Check that the API server URL is correct and accessible from the device/simulator
- Verify HTTPS is used (HTTP will be blocked by ATS)
- Check the Capacitor server configuration in `capacitor.config.ts`
- For local development with a physical device, use your machine's local IP address (not `localhost`)

#### Old Content Showing
```bash
# Force a clean sync
rm -rf ios/App/App/public/
npx cap sync ios
# Clean build in Xcode: Cmd + Shift + K
```

### Capacitor Issues

#### "Capacitor could not find the web assets directory"
```bash
# Ensure the web build output matches capacitor.config.ts webDir
# Expected: dist/public/
npm run build
ls dist/public/  # Verify files exist
```

#### Plugin Not Working
```bash
# Check plugin is installed
npx cap doctor

# Reinstall plugins
npx cap sync ios

# If using CocoaPods plugins
cd ios/App && pod install && cd ../..
```

#### "cap sync" Hangs
```bash
# Try with verbose logging
npx cap sync ios --verbose

# If pod install hangs, clear cache
cd ios/App
pod cache clean --all
pod install --repo-update
cd ../..
```

### Xcode Issues

#### Xcode Won't Open Workspace
```bash
# Verify workspace exists
ls ios/App/App.xcworkspace

# If missing, regenerate
npx cap sync ios
```

#### Slow Build Times
1. In Build Settings, set **Build Active Architecture Only** to **Yes** for Debug
2. Close other Xcode projects
3. Consider increasing RAM available to Xcode
4. Disable indexing temporarily: Xcode → Settings → General → Source Control → Disable

#### Simulator Not Booting
```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all

# Or from Xcode: Window → Devices and Simulators → right-click → Delete
```

---

## 10. Environment Variables and Configuration

### Capacitor Configuration

The primary configuration file is `capacitor.config.ts` at the project root:

| Setting | Value | Description |
|---------|-------|-------------|
| `appId` | `com.easyhealth.app` | iOS bundle identifier |
| `appName` | `Easy Health` | Display name on device |
| `webDir` | `dist/public` | Web build output directory |
| `server.iosScheme` | `https` | URL scheme for web content |
| `ios.backgroundColor` | `#2E456B` | Background color during load |

### Web App Environment Variables

The web app uses Vite environment variables (prefixed with `VITE_`). These are baked into the build at compile time.

Create a `.env.production` file for production builds:

```bash
# API Server URL (must be accessible from the iOS device)
VITE_API_URL=https://api.easyhealth.app

# Feature flags
VITE_ENABLE_VOICE_CAPTURE=true
VITE_ENABLE_FHIR_EXPORT=true
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

### Server Configuration

For the backend API server, ensure these are configured in the deployment environment:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key (for voice transcription) |
| `SESSION_SECRET` | Session encryption secret |
| `PORT` | Server port (default: 5000) |

### Production Server Requirements

The iOS app communicates with the backend API over the network. For production:

1. Deploy the backend to a publicly accessible server with HTTPS
2. Update the API URL in the web build configuration
3. Configure the Capacitor server settings if using a custom API domain:

```typescript
// capacitor.config.ts - for production API
const config: CapacitorConfig = {
  // ... other settings
  server: {
    iosScheme: "https",
    // Only set this for development if pointing to a local server:
    // url: "http://192.168.1.x:5000",
    // For production, the web app's API calls use relative URLs
    // which resolve to the deployed server
  },
};
```

### Build Modes

| Mode | Command | API Target | Debug Tools |
|------|---------|------------|-------------|
| Development | Xcode Run on Simulator | Local dev server | Safari Web Inspector, Xcode console |
| Staging | Xcode Run on Device | Staging server | Safari Web Inspector |
| Production | Xcode Archive → Distribute | Production server | Crash reports only |

### Live Reload (Development Only)

For faster development iteration, enable live reload to see web changes without rebuilding:

```typescript
// capacitor.config.ts - DEVELOPMENT ONLY
const config: CapacitorConfig = {
  // ... other settings
  server: {
    url: "http://YOUR_LOCAL_IP:5000",  // Your Mac's IP address
    cleartext: true,  // Allow HTTP for local dev
  },
};
```

Then run the dev server:
```bash
npm run dev
```

The iOS app will load content from your dev server with hot reload.

**Important:** Remove the `server.url` and `server.cleartext` settings before building for TestFlight or production. These settings should never be present in a production build.

---

## Appendix: Quick Reference Commands

```bash
# Full build pipeline
npm run build && npx cap sync ios && npx cap open ios

# Quick web update (no native plugin changes)
npm run build && npx cap copy ios

# Check Capacitor health
npx cap doctor

# List iOS simulators
xcrun simctl list devices

# Open specific simulator
xcrun simctl boot "iPhone 15 Pro"
open -a Simulator

# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clean iOS build
cd ios/App && xcodebuild clean && cd ../..

# Pod management
cd ios/App && pod install --repo-update && cd ../..
cd ios/App && pod cache clean --all && cd ../..
```
