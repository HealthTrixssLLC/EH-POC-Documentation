import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  ClipboardList,
  Clock,
  Menu,
  HelpCircle,
  Database,
  LogOut,
  CheckSquare,
  TrendingUp,
  Users,
  Settings,
  FileJson,
  FileText,
  Shield,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";
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

function getAllMoreRoutes(): string[] {
  const allRoles = ["np", "supervisor", "care_coordinator", "admin", "compliance"];
  const routes = new Set<string>(["/more"]);
  for (const role of allRoles) {
    for (const section of getRoleMenuSections(role)) {
      for (const item of section.items) {
        routes.add(item.href);
      }
    }
  }
  return Array.from(routes);
}

function getActiveTab(path: string): string {
  if (path === "/" || path === "") return "today";
  if (path === "/visits/active") return "visit";
  if (path === "/visits/history" || path === "/visits") return "history";
  if (/^\/visits\/[^/]+/.test(path)) return "visit";
  if (getAllMoreRoutes().some((r) => path === r || path.startsWith(r + "/"))) return "more";
  return "today";
}

interface MenuSection {
  label: string;
  items: Array<{ title: string; href: string; icon: any }>;
}

function getRoleMenuSections(role: string): MenuSection[] {
  const sections: MenuSection[] = [];

  if (role === "np") {
    // NP has minimal extra menu items
  }

  if (role === "supervisor") {
    sections.push({
      label: "Clinical",
      items: [
        { title: "Review Queue", href: "/reviews", icon: CheckSquare },
        { title: "Provider Quality", href: "/providers/quality", icon: TrendingUp },
        { title: "CoCM Billing", href: "/cocm-time-tracking", icon: Clock },
      ],
    });
  }

  if (role === "care_coordinator") {
    sections.push({
      label: "Coordination",
      items: [
        { title: "Care Tasks", href: "/coordination", icon: Users },
      ],
    });
  }

  if (role === "admin") {
    sections.push({
      label: "Administration",
      items: [
        { title: "Admin Console", href: "/admin", icon: Settings },
        { title: "Provider Quality", href: "/providers/quality", icon: TrendingUp },
        { title: "CoCM Billing", href: "/cocm-time-tracking", icon: Clock },
        { title: "FHIR Interop", href: "/admin/fhir", icon: FileJson },
        { title: "Tech Docs", href: "/admin/tech-docs", icon: FileText },
      ],
    });
  }

  if (role === "compliance") {
    sections.push({
      label: "Compliance",
      items: [
        { title: "Audit Log", href: "/audit", icon: Shield },
        { title: "Audit Queue", href: "/audit/queue", icon: ClipboardCheck },
      ],
    });
  }

  sections.push({
    label: "Support",
    items: [
      { title: "Help & Support", href: "/help", icon: HelpCircle },
      { title: "Demo Management", href: "/demo", icon: Database },
    ],
  });

  return sections;
}

function MorePage() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const initials = user
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  const roleLabel: Record<string, string> = {
    np: "Nurse Practitioner",
    supervisor: "Clinical Supervisor",
    care_coordinator: "Care Coordinator",
    admin: "Administrator",
    compliance: "Compliance",
  };

  const sections = getRoleMenuSections(user?.role || "np");

  return (
    <div className="p-4 space-y-5">
      {user && (
        <div className="flex items-center gap-3 p-4 bg-card rounded-xl border" data-testid="mobile-user-profile">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-[#2E456B] text-white text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-base font-semibold truncate">{user.fullName}</span>
            <span className="text-xs text-muted-foreground truncate">{roleLabel[user.role] || user.role}</span>
          </div>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.label} className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">
            {section.label}
          </h3>
          <div className="bg-card rounded-xl border overflow-hidden">
            {section.items.map((item, idx) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/60 ${
                      idx > 0 ? "border-t" : ""
                    } ${isActive ? "bg-muted/40" : ""}`}
                    style={{
                      minHeight: "44px",
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                    }}
                    data-testid={`link-mobile-${item.href.replace(/\//g, "-").slice(1) || "home"}`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ color: isActive ? "#FEA002" : "hsl(var(--muted-foreground))" }} />
                    <span className={`text-sm flex-1 ${isActive ? "font-semibold" : "font-medium"}`}>{item.title}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="pt-2">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border text-destructive active:bg-muted/60 transition-colors"
          onClick={logout}
          style={{
            minHeight: "44px",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
          data-testid="button-mobile-logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
}

export function MobileShell({ children, activeTab: activeTabProp, header }: MobileShellProps) {
  const [location, setLocation] = useLocation();
  const currentTab = activeTabProp || getActiveTab(location);
  const showMore = currentTab === "more" && location === "/more";

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
        {showMore ? <MorePage /> : children}
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
                  minHeight: "44px",
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
