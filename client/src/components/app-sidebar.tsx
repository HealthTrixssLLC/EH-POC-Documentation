import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  Users,
  Settings,
  Shield,
  LogOut,
  Stethoscope,
  FileJson,
} from "lucide-react";

const roleMenus: Record<string, Array<{ title: string; url: string; icon: any }>> = {
  np: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "My Visits", url: "/visits", icon: ClipboardList },
  ],
  supervisor: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Review Queue", url: "/reviews", icon: CheckSquare },
    { title: "All Visits", url: "/visits", icon: ClipboardList },
  ],
  care_coordinator: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Care Tasks", url: "/coordination", icon: Users },
    { title: "All Visits", url: "/visits", icon: ClipboardList },
  ],
  admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Admin Console", url: "/admin", icon: Settings },
    { title: "FHIR Interop", url: "/admin/fhir", icon: FileJson },
    { title: "All Visits", url: "/visits", icon: ClipboardList },
  ],
  compliance: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Audit Log", url: "/audit", icon: Shield },
    { title: "All Visits", url: "/visits", icon: ClipboardList },
  ],
};

const roleLabels: Record<string, string> = {
  np: "Nurse Practitioner",
  supervisor: "Clinical Supervisor",
  care_coordinator: "Care Coordinator",
  admin: "Administrator",
  compliance: "Compliance",
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const items = roleMenus[user.role] || roleMenus.np;
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-sidebar-primary">
            <Stethoscope className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              Easy Health
            </span>
            <span className="text-xs text-sidebar-foreground/60 truncate">
              Clinical Platform
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium text-sidebar-foreground truncate">
              {user.fullName}
            </span>
            <span className="text-xs text-sidebar-foreground/60 truncate">
              {roleLabels[user.role] || user.role}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-sidebar-foreground/60"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
