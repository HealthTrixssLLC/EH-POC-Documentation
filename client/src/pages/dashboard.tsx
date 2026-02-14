import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import { usePlatform } from "@/hooks/use-platform";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  FileCheck,
  ArrowRight,
  Activity,
  Settings,
  Shield,
  FileJson,
  FileText,
  Calendar,
} from "lucide-react";

function StatCard({ title, value, icon: Icon, color, loading }: {
  title: string; value: string | number; icon: any; color: string; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
                {value}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-md" style={{ backgroundColor: color + "15" }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatVisitType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : "Good afternoon";
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function NPDashboard() {
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/dashboard/np"] });
  const { isMobileLayout } = usePlatform();
  const { user } = useAuth();

  if (isMobileLayout) {
    const firstName = user?.fullName?.split(" ")[0] ?? "";

    if (isLoading) {
      return (
        <div className="space-y-4 p-4" data-testid="mobile-dashboard">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-md" />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4" data-testid="mobile-dashboard">
        <div data-testid="mobile-greeting">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-lg font-semibold">
                {getGreeting()}, {firstName}
              </h1>
              <p className="text-sm text-muted-foreground">{formatTodayDate()}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {stats?.todayVisits ?? 0} visits today
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {(() => {
            const today = new Date().toISOString().split("T")[0];
            const todayVisits = (stats?.upcomingVisits || []).filter(
              (v: any) => v.scheduledDate === today
            );
            return todayVisits.length ? (
              todayVisits.map((v: any) => (
                <Link key={v.id} href={v.status === "in_progress" ? `/visits/${v.id}/intake` : `/visits/${v.id}/summary`}>
                  <Card
                    className="hover-elevate cursor-pointer"
                    data-testid={`mobile-visit-card-${v.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3" style={{ minHeight: "48px" }}>
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-[#2E456B] text-white text-xs">
                            {getInitials(v.memberName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{v.memberName}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.scheduledTime || "No time set"}
                          </p>
                          {v.visitType && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {formatVisitType(v.visitType)}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant={v.status === "scheduled" ? "secondary" : "default"}
                          className="text-xs flex-shrink-0"
                        >
                          {v.status === "in_progress" ? "In Progress" : v.status === "scheduled" ? "Scheduled" : v.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Calendar className="w-10 h-10 mb-3 opacity-40" />
                <span className="text-sm">No visits scheduled for today</span>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your visit overview and upcoming appointments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Visits" value={stats?.todayVisits ?? 0} icon={ClipboardList} color="#2E456B" loading={isLoading} />
        <StatCard title="In Progress" value={stats?.inProgress ?? 0} icon={Clock} color="#FEA002" loading={isLoading} />
        <StatCard title="Completed" value={stats?.completed ?? 0} icon={CheckCircle2} color="#277493" loading={isLoading} />
        <StatCard title="Needs Attention" value={stats?.needsAttention ?? 0} icon={AlertTriangle} color="#E74C3C" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <h3 className="text-sm font-semibold">Upcoming Visits</h3>
            <Link href="/visits">
              <Button variant="ghost" size="sm" data-testid="link-view-all-visits">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))
            ) : stats?.upcomingVisits?.length ? (
              stats.upcomingVisits.map((v: any) => (
                <Link key={v.id} href={`/visits/${v.id}/summary`}>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-md border hover-elevate cursor-pointer flex-wrap" data-testid={`visit-card-${v.id}`}>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">{v.memberName}</span>
                      <span className="text-xs text-muted-foreground">{v.scheduledDate} {v.scheduledTime}</span>
                    </div>
                    <Badge variant={v.status === "scheduled" ? "secondary" : "default"} className="text-xs">
                      {v.status}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">No upcoming visits</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : stats?.recentActivity?.length ? (
              stats.recentActivity.map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: "#277493" }} />
                  <div className="min-w-0">
                    <span className="text-foreground">{a.description}</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">{a.timestamp}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mb-2 opacity-40" />
                <span className="text-sm">No recent activity</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SupervisorDashboard() {
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/dashboard/supervisor"] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Supervisor Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Review queue and quality oversight</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Review" value={stats?.pendingReview ?? 0} icon={FileCheck} color="#FEA002" loading={isLoading} />
        <StatCard title="Approved Today" value={stats?.approvedToday ?? 0} icon={CheckCircle2} color="#277493" loading={isLoading} />
        <StatCard title="Corrections" value={stats?.corrections ?? 0} icon={AlertTriangle} color="#E74C3C" loading={isLoading} />
        <StatCard title="Total Visits" value={stats?.totalVisits ?? 0} icon={ClipboardList} color="#2E456B" loading={isLoading} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <h3 className="text-sm font-semibold">Review Queue</h3>
          <Link href="/reviews">
            <Button variant="ghost" size="sm" data-testid="link-review-queue">
              Open Queue <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <FileCheck className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">Check the review queue for pending items</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CoordinatorDashboard() {
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["/api/dashboard/coordinator"] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Care Coordination</h1>
        <p className="text-sm text-muted-foreground mt-1">Task management and follow-up tracking</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Tasks" value={stats?.openTasks ?? 0} icon={ClipboardList} color="#FEA002" loading={isLoading} />
        <StatCard title="Due Today" value={stats?.dueToday ?? 0} icon={Clock} color="#E74C3C" loading={isLoading} />
        <StatCard title="Completed" value={stats?.completedTasks ?? 0} icon={CheckCircle2} color="#277493" loading={isLoading} />
        <StatCard title="Members" value={stats?.totalMembers ?? 0} icon={Users} color="#2E456B" loading={isLoading} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <h3 className="text-sm font-semibold">Tasks</h3>
          <Link href="/coordination">
            <Button variant="ghost" size="sm" data-testid="link-tasks">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">Go to tasks to manage follow-ups</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">System configuration and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4 flex-wrap">
              <div className="flex items-center justify-center w-12 h-12 rounded-md" style={{ backgroundColor: "#2E456B15" }}>
                <Settings className="w-6 h-6" style={{ color: "#2E456B" }} />
              </div>
              <div>
                <h3 className="font-semibold">Admin Console</h3>
                <p className="text-sm text-muted-foreground">Manage plan packs, assessments, measures</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/audit">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4 flex-wrap">
              <div className="flex items-center justify-center w-12 h-12 rounded-md" style={{ backgroundColor: "#27749315" }}>
                <Shield className="w-6 h-6" style={{ color: "#277493" }} />
              </div>
              <div>
                <h3 className="font-semibold">Audit Viewer</h3>
                <p className="text-sm text-muted-foreground">Review access logs and compliance events</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/fhir">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4 flex-wrap">
              <div className="flex items-center justify-center w-12 h-12 rounded-md" style={{ backgroundColor: "#FEA00215" }}>
                <FileJson className="w-6 h-6" style={{ color: "#FEA002" }} />
              </div>
              <div>
                <h3 className="font-semibold">FHIR Interoperability</h3>
                <p className="text-sm text-muted-foreground">Import and export FHIR R4 clinical data</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/tech-docs">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4 flex-wrap">
              <div className="flex items-center justify-center w-12 h-12 rounded-md" style={{ backgroundColor: "#27749315" }}>
                <FileText className="w-6 h-6" style={{ color: "#277493" }} />
              </div>
              <div>
                <h3 className="font-semibold">Technical Documentation</h3>
                <p className="text-sm text-muted-foreground">Workflow diagrams, handoffs, and interface specs</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "supervisor":
      return <SupervisorDashboard />;
    case "care_coordinator":
      return <CoordinatorDashboard />;
    case "admin":
    case "compliance":
      return <AdminDashboard />;
    default:
      return <NPDashboard />;
  }
}
