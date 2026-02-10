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
      iosSpinnerStyle: "small",
      spinnerColor: "#FEA002",
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
