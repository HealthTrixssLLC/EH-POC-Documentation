import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, ClipboardList, Clock, Menu, HelpCircle, Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";

interface MobileShellProps {
  children: ReactNode;
  activeTab?: string;
  header?: ReactNode;
}

const TAB_DEFINITIONS = [
  { id: "today", label: "Today", icon: Calendar, href: "/" },
  { id: "visit", label: "Visit", icon: ClipboardList, href: "/visits/active" },
  { id: "history", label: "History", icon: Clock, href: "/visits/history" },
  { id: "more", label: "More", icon: Menu, href: "/more" },
] as const;

function getActiveTab(path: string): string {
  if (path === "/" || path === "") return "today";
  if (path === "/visits/active") return "visit";
  if (path === "/visits/history" || path === "/visits") return "history";
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

export function MobileShell({ children, activeTab: activeTabProp, header }: MobileShellProps) {
  const [location, setLocation] = useLocation();
  const currentTab = activeTabProp || getActiveTab(location);
  const showMore = currentTab === "more" && (location === "/more" || location === "/help" || location === "/demo");

  return (
    <div className="flex flex-col h-screen" data-testid="mobile-shell">
      {header}
      <div
        className="flex-1 overflow-auto mobile-content-area"
        style={{
          paddingTop: header ? "calc(44px + env(safe-area-inset-top, 0px))" : undefined,
          paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {showMore && location === "/more" ? <MorePage /> : children}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t mobile-tab-bar"
        data-testid="mobile-tab-bar"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          backgroundColor: "hsl(var(--card))",
        }}
      >
        <div
          className="grid grid-cols-4"
          style={{ height: "60px" }}
        >
          {TAB_DEFINITIONS.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLocation(tab.href);
                }}
                className="relative flex flex-col items-center justify-center"
                style={{
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
                data-testid={`tab-${tab.id}`}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                    style={{
                      width: "32px",
                      height: "3px",
                      backgroundColor: "#FEA002",
                    }}
                  />
                )}
                <Icon
                  style={{
                    width: "22px",
                    height: "22px",
                    color: isActive ? "#FEA002" : "#8E8E93",
                    strokeWidth: isActive ? 2.4 : 1.6,
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    lineHeight: "14px",
                    marginTop: "2px",
                    color: isActive ? "#FEA002" : "#8E8E93",
                    fontWeight: isActive ? 700 : 400,
                    letterSpacing: isActive ? "0.01em" : "0",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
