import { useState } from "react";
import { Switch, Route, useLocation, Redirect, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileVoiceOverlay } from "@/components/mobile-voice-overlay";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { IOSInstallPrompt } from "@/components/ios-install-prompt";
import { MobileShell } from "@/components/mobile-shell";
import { MobileHeader } from "@/components/mobile-header";
import { usePlatform } from "@/hooks/use-platform";
import { NetworkProvider } from "@/lib/network-context";
import { OfflineBanner } from "@/components/offline-banner";
import { SessionLockScreen } from "@/components/session-lock-screen";
import { BiometricGate } from "@/components/biometric-gate";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import VisitList from "@/pages/visit-list";
import PreVisitSummary from "@/pages/pre-visit-summary";
import IntakeDashboard from "@/pages/intake-dashboard";
import IdentityVerification from "@/pages/identity-verification";
import VitalsExam from "@/pages/vitals-exam";
import AssessmentRunner from "@/pages/assessment-runner";
import HedisMeasure from "@/pages/hedis-measure";
import CarePlan from "@/pages/care-plan";
import ReviewFinalize from "@/pages/review-finalize";
import SupervisorReviews from "@/pages/supervisor-reviews";
import VisitDetail from "@/pages/visit-detail";
import CareCoordination from "@/pages/care-coordination";
import AdminConsole from "@/pages/admin-console";
import AuditViewer from "@/pages/audit-viewer";
import PatientTimeline from "@/pages/patient-timeline";
import FhirPlayground from "@/pages/fhir-playground";
import HelpSupport from "@/pages/help-support";
import DemoManagement from "@/pages/demo-management";
import MedReconciliation from "@/pages/med-reconciliation";
import PatientContext from "@/pages/patient-context";
import TechDocs from "@/pages/tech-docs";
import VisitConsents from "@/pages/visit-consents";
import VoiceCapture from "@/pages/voice-capture";
import AuditQueue from "@/pages/audit-queue";
import VisitActive from "@/pages/visit-active";
import PrivacyPolicy from "@/pages/privacy-policy";
import ProductDescription from "@/pages/product-description";
import ProviderQuality from "@/pages/provider-quality";
import { useQuery as useQueryHook } from "@tanstack/react-query";

function DemoWatermark() {
  const { data: config } = useQueryHook<{ demoMode: boolean; watermarkText: string }>({
    queryKey: ["/api/demo-config"],
    staleTime: 30000,
  });

  if (!config?.demoMode) return null;

  return (
    <div
      className="text-center text-xs font-semibold py-1 tracking-wider"
      style={{ backgroundColor: "#FEA002", color: "#2E456B" }}
      data-testid="banner-demo-mode"
    >
      {config.watermarkText || "DEMO MODE"}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/visits/active" component={VisitActive} />
      <Route path="/visits/history" component={VisitList} />
      <Route path="/visits" component={VisitList} />
      <Route path="/visits/:id/summary" component={PreVisitSummary} />
      <Route path="/visits/:id/intake" component={IntakeDashboard} />
      <Route path="/visits/:id/intake/identity" component={IdentityVerification} />
      <Route path="/visits/:id/intake/vitals" component={VitalsExam} />
      <Route path="/visits/:id/intake/assessment/:aid" component={AssessmentRunner} />
      <Route path="/visits/:id/intake/measure/:mid" component={HedisMeasure} />
      <Route path="/visits/:id/intake/medications" component={MedReconciliation} />
      <Route path="/visits/:id/intake/careplan" component={CarePlan} />
      <Route path="/visits/:id/intake/timeline" component={PatientTimeline} />
      <Route path="/visits/:id/intake/consents" component={VisitConsents} />
      <Route path="/visits/:id/intake/patient-context" component={PatientContext} />
      <Route path="/visits/:id/intake/voice-capture" component={VoiceCapture} />
      <Route path="/visits/:id/finalize" component={ReviewFinalize} />
      <Route path="/visits/:id/detail" component={VisitDetail} />
      <Route path="/reviews" component={SupervisorReviews} />
      <Route path="/coordination" component={CareCoordination} />
      <Route path="/admin" component={AdminConsole} />
      <Route path="/admin/fhir" component={FhirPlayground} />
      <Route path="/admin/tech-docs" component={TechDocs} />
      <Route path="/audit" component={AuditViewer} />
      <Route path="/audit/queue" component={AuditQueue} />
      <Route path="/providers/quality" component={ProviderQuality} />
      <Route path="/help" component={HelpSupport} />
      <Route path="/demo" component={DemoManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <DemoWatermark />
          <header className="flex items-center justify-between gap-3 p-2 border-b bg-background sticky top-0 z-50 ios-safe-top">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 ios-safe-bottom">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const pageTitles: Record<string, string> = {
  "/": "Today",
  "/visits": "Visits",
  "/visits/active": "Active Visits",
  "/visits/history": "Visit History",
  "/reviews": "Reviews",
  "/coordination": "Care Coordination",
  "/admin": "Admin Console",
  "/audit": "Audit Log",
  "/help": "Help & Support",
  "/demo": "Demo Management",
  "/more": "More",
};

function getMobileTitle(path: string): string {
  if (pageTitles[path]) return pageTitles[path];
  if (path.includes("/intake/identity")) return "Identity";
  if (path.includes("/intake/vitals")) return "Vitals";
  if (path.includes("/intake/medications")) return "Medications";
  if (path.includes("/intake/assessment/")) return "Assessment";
  if (path.includes("/intake/measure/")) return "Measure";
  if (path.includes("/intake/voice-capture")) return "Voice Capture";
  if (path.includes("/intake/timeline")) return "Timeline";
  if (path.includes("/intake/careplan")) return "Care Plan";
  if (path.includes("/intake/patient-context")) return "Patient Context";
  if (path.includes("/intake")) return "Visit";
  if (path.includes("/finalize")) return "Finalize";
  if (path.includes("/summary")) return "Pre-Visit";
  if (path.startsWith("/visits/")) return "Visit";
  return "Easy Health";
}

function MobileLayout() {
  const [location] = useLocation();
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const title = getMobileTitle(location);
  const isSubpage = location !== "/" && location !== "/visits" && location !== "/visits/active" && location !== "/visits/history" && location !== "/more";
  const isVisitSubpage = location.startsWith("/visits/") && location !== "/visits" && location !== "/visits/active" && location !== "/visits/history";
  const backTarget = isVisitSubpage
    ? (location.match(/\/visits\/[^/]+\/intake/) ? location.replace(/\/intake\/.*/, "/intake") : "/visits")
    : "/";

  const isIntakePage = /\/visits\/[^/]+\/intake/.test(location) && !location.includes("/voice-capture");
  const visitIdMatch = location.match(/\/visits\/([^/]+)/);
  const currentVisitId = visitIdMatch ? visitIdMatch[1] : null;

  return (
    <MobileShell
      header={
        <MobileHeader
          title={title}
          backHref={isSubpage ? backTarget : undefined}
        />
      }
    >
      <DemoWatermark />
      <main className="p-3">
        <Router />
      </main>
      {isIntakePage && currentVisitId && (
        <>
          <Button
            size="icon"
            onClick={() => setVoiceOverlayOpen(true)}
            className="fixed z-50 rounded-full shadow-lg"
            style={{
              backgroundColor: "#FEA002",
              borderColor: "#FEA002",
              bottom: "calc(130px + env(safe-area-inset-bottom, 0px))",
              right: "16px",
            }}
            data-testid="fab-voice-capture"
          >
            <Mic className="w-5 h-5 text-white" />
          </Button>
          <MobileVoiceOverlay
            visitId={currentVisitId}
            open={voiceOverlayOpen}
            onClose={() => setVoiceOverlayOpen(false)}
          />
        </>
      )}
    </MobileShell>
  );
}

function AppContent() {
  const { isAuthenticated, sessionLocked } = useAuth();
  const [location] = useLocation();
  const { isMobileLayout } = usePlatform();

  if (!isAuthenticated) {
    if (location === "/privacy") return <PrivacyPolicy />;
    if (location === "/product") return <ProductDescription />;
    if (location !== "/login") {
      return <Redirect to="/login" />;
    }
    return <LoginPage />;
  }

  if (sessionLocked) {
    return <SessionLockScreen />;
  }

  if (location === "/login") {
    return <Redirect to="/" />;
  }

  const layout = isMobileLayout ? <MobileLayout /> : <AuthenticatedLayout />;

  return <BiometricGate>{layout}</BiometricGate>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <NetworkProvider>
            <AuthProvider>
              <OfflineBanner />
              <AppContent />
              <IOSInstallPrompt />
              <Toaster />
            </AuthProvider>
          </NetworkProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
