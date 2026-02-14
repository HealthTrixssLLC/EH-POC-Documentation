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
  if (/^\/visits\/[^/]+/.test(path)) return "visit";
  if (path === "/visits" || path === "/visits/history") return "history";
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

function VisitTabButton({ isActive }: { isActive: boolean }) {
  const [, setLocation] = useLocation();
  const { data: visits } = useQuery<any[]>({ queryKey: ["/api/visits"] });

  const handleClick = () => {
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
    <button
      onClick={handleClick}
      className="flex flex-col items-center justify-center gap-0.5 w-16 h-full"
      data-testid="tab-visit"
    >
      <ClipboardList
        className="w-5 h-5"
        style={{ color: isActive ? "#FEA002" : undefined }}
      />
      <span
        className="text-[10px] font-medium"
        style={{ color: isActive ? "#FEA002" : undefined }}
      >
        Visit
      </span>
    </button>
  );
}

const staticTabs = [
  { id: "today", label: "Today", icon: Calendar, href: "/" },
  { id: "history", label: "History", icon: Clock, href: "/visits/history" },
  { id: "more", label: "More", icon: Menu, href: "/more" },
] as const;

export function MobileShell({ children, activeTab: activeTabProp, header }: MobileShellProps) {
  const [location] = useLocation();
  const currentTab = activeTabProp || getActiveTab(location);
  const showMore = currentTab === "more" && (location === "/more" || location === "/help" || location === "/demo");

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
      >
        <div className="flex items-center justify-around h-[56px]">
          {/* Today tab */}
          <Link href="/">
            <button
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full"
              data-testid="tab-today"
            >
              <Calendar
                className="w-5 h-5"
                style={{ color: currentTab === "today" ? "#FEA002" : undefined }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: currentTab === "today" ? "#FEA002" : undefined }}
              >
                Today
              </span>
            </button>
          </Link>

          {/* Visit tab - smart navigation */}
          <VisitTabButton isActive={currentTab === "visit"} />

          {/* History tab */}
          <Link href="/visits/history">
            <button
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full"
              data-testid="tab-history"
            >
              <Clock
                className="w-5 h-5"
                style={{ color: currentTab === "history" ? "#FEA002" : undefined }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: currentTab === "history" ? "#FEA002" : undefined }}
              >
                History
              </span>
            </button>
          </Link>

          {/* More tab */}
          <Link href="/more">
            <button
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full"
              data-testid="tab-more"
            >
              <Menu
                className="w-5 h-5"
                style={{ color: currentTab === "more" ? "#FEA002" : undefined }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: currentTab === "more" ? "#FEA002" : undefined }}
              >
                More
              </span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
