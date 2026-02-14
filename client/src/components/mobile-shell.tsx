import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, ClipboardList, Clock, Menu, HelpCircle, Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

interface MobileShellProps {
  children: ReactNode;
  activeTab?: string;
  header?: ReactNode;
}

function getActiveTab(path: string): string {
  if (path === "/" || path === "") return "today";
  if (path === "/visits/active") return "visit";
  if (path === "/visits/history") return "history";
  if (path === "/visits") return "history";
  if (/^\/visits\/[^/]+/.test(path)) return "visit";
  if (path === "/more" || path === "/help" || path === "/demo") return "more";
  return "today";
}

function MorePage() {
  const { user, logout } = useAuth();
  const initials = user
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  return (
    <div className="p-4 space-y-4">
      {user && (
        <div className="flex items-center gap-3 p-3 bg-card rounded-md border">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-[#2E456B] text-white text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user.fullName}</span>
            <span className="text-xs text-muted-foreground truncate">{user.role}</span>
          </div>
        </div>
      )}
      <div className="space-y-1">
        <Link href="/help">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-mobile-help">
            <HelpCircle className="w-5 h-5" />
            <span>Help & Support</span>
          </Button>
        </Link>
        <Link href="/demo">
          <Button variant="ghost" className="w-full justify-start gap-3" data-testid="link-mobile-demo">
            <Database className="w-5 h-5" />
            <span>Demo Management</span>
          </Button>
        </Link>
      </div>
      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive"
          onClick={logout}
          data-testid="button-mobile-logout"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </Button>
      </div>
    </div>
  );
}

const ACTIVE_COLOR = "#FEA002";
const INACTIVE_COLOR = "#8E8E93";

interface TabButtonProps {
  icon: typeof Calendar;
  label: string;
  isActive: boolean;
  testId: string;
  onClick?: () => void;
}

function TabButton({ icon: Icon, label, isActive, testId, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[64px]"
      data-testid={testId}
      role="tab"
      aria-selected={isActive}
    >
      {isActive && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
          style={{ backgroundColor: ACTIVE_COLOR }}
        />
      )}
      <Icon
        className="w-[22px] h-[22px]"
        style={{ color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR }}
        strokeWidth={isActive ? 2.2 : 1.8}
      />
      <span
        className="text-[10px] leading-tight"
        style={{
          color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
          fontWeight: isActive ? 600 : 500,
        }}
      >
        {label}
      </span>
    </button>
  );
}

export function MobileShell({ children, activeTab: activeTabProp, header }: MobileShellProps) {
  const [location, setLocation] = useLocation();
  const currentTab = activeTabProp || getActiveTab(location);
  const showMore = currentTab === "more" && (location === "/more" || location === "/help" || location === "/demo");

  const { data: visits } = useQuery<any[]>({ queryKey: ["/api/visits"] });

  const handleVisitTab = () => {
    const activeVisit = (visits || []).find(
      (v: any) => v.status === "in_progress"
    );
    if (activeVisit) {
      setLocation(`/visits/${activeVisit.id}/intake`);
    } else {
      setLocation("/visits/active");
    }
  };

  return (
    <div className="flex flex-col h-screen" data-testid="mobile-shell">
      {header}
      <div
        className="flex-1 overflow-auto mobile-content-area"
        style={{
          paddingTop: header ? "calc(44px + env(safe-area-inset-top, 0px))" : undefined,
          paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {showMore && location === "/more" ? <MorePage /> : children}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-[100] bg-card border-t mobile-tab-bar"
        data-testid="mobile-tab-bar"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="tablist"
      >
        <div className="flex items-stretch h-[56px]">
          <TabButton
            icon={Calendar}
            label="Today"
            isActive={currentTab === "today"}
            testId="tab-today"
            onClick={() => setLocation("/")}
          />

          <TabButton
            icon={ClipboardList}
            label="Visit"
            isActive={currentTab === "visit"}
            testId="tab-visit"
            onClick={handleVisitTab}
          />

          <TabButton
            icon={Clock}
            label="History"
            isActive={currentTab === "history"}
            testId="tab-history"
            onClick={() => setLocation("/visits/history")}
          />

          <TabButton
            icon={Menu}
            label="More"
            isActive={currentTab === "more"}
            testId="tab-more"
            onClick={() => setLocation("/more")}
          />
        </div>
      </div>
    </div>
  );
}
