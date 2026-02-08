import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/visits" component={VisitList} />
      <Route path="/visits/:id/summary" component={PreVisitSummary} />
      <Route path="/visits/:id/intake" component={IntakeDashboard} />
      <Route path="/visits/:id/intake/identity" component={IdentityVerification} />
      <Route path="/visits/:id/intake/vitals" component={VitalsExam} />
      <Route path="/visits/:id/intake/assessment/:aid" component={AssessmentRunner} />
      <Route path="/visits/:id/intake/measure/:mid" component={HedisMeasure} />
      <Route path="/visits/:id/intake/careplan" component={CarePlan} />
      <Route path="/visits/:id/intake/timeline" component={PatientTimeline} />
      <Route path="/visits/:id/finalize" component={ReviewFinalize} />
      <Route path="/visits/:id/detail" component={VisitDetail} />
      <Route path="/reviews" component={SupervisorReviews} />
      <Route path="/coordination" component={CareCoordination} />
      <Route path="/admin" component={AdminConsole} />
      <Route path="/audit" component={AuditViewer} />
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
          <header className="flex items-center justify-between gap-3 p-2 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  if (!isAuthenticated) {
    if (location !== "/login") {
      return <Redirect to="/login" />;
    }
    return <LoginPage />;
  }

  if (location === "/login") {
    return <Redirect to="/" />;
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
