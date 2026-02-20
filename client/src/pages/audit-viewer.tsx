import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  Search,
  Filter,
  User,
  Clock,
  FileText,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardCheck,
} from "lucide-react";

const eventTypeColors: Record<string, string> = {
  phi_access: "secondary",
  login: "default",
  logout: "outline",
  visit_finalized: "default",
  visit_exported: "default",
  assessment_completed: "secondary",
  measure_completed: "secondary",
  review_submitted: "default",
  task_updated: "outline",
  automated_audit_completed: "default",
  billing_gate_pass: "default",
  billing_gate_fail: "destructive",
  billing_gate_override: "secondary",
};

function AuditDashboard() {
  const { data: dashboard, isLoading: dashLoading } = useQuery<any>({ queryKey: ["/api/audit/dashboard"] });
  const { data: reports, isLoading: reportsLoading } = useQuery<any[]>({ queryKey: ["/api/audit/reports"] });

  if (dashLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  if (!dashboard || dashboard.totalAudited === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
          <ClipboardCheck className="w-10 h-10 mb-3 opacity-40" />
          <span className="text-sm">No automated audit reports yet</span>
          <span className="text-xs mt-1">Audits run automatically when visits are finalized</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold" data-testid="text-audit-total">{dashboard.totalAudited}</div>
            <div className="text-xs text-muted-foreground">Total Audited</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600" data-testid="text-audit-pass-rate">{dashboard.passRate}%</div>
            <div className="text-xs text-muted-foreground">Pass Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-500" data-testid="text-audit-warning-rate">{dashboard.warningRate}%</div>
            <div className="text-xs text-muted-foreground">Warning Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive" data-testid="text-audit-fail-rate">{dashboard.failRate}%</div>
            <div className="text-xs text-muted-foreground">Fail Rate</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: "#277493" }} />
            <h3 className="text-base font-semibold" data-testid="text-avg-scores-title">Average Scores by Dimension</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Overall", value: dashboard.avgOverallScore },
            { label: "Completeness", value: dashboard.avgCompletenessScore },
            { label: "Diagnosis Support", value: dashboard.avgDiagnosisSupportScore },
            { label: "Coding Compliance", value: dashboard.avgCodingComplianceScore },
          ].map((dim, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm">{dim.label}</span>
                <span className={`text-sm font-medium ${dim.value >= 80 ? "text-green-600" : dim.value >= 60 ? "text-amber-500" : "text-destructive"}`}>{dim.value}%</span>
              </div>
              <Progress value={dim.value} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {dashboard.topFlags && dashboard.topFlags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: "#FEA002" }} />
              <h3 className="text-base font-semibold">Top Quality Flags</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.topFlags.map((f: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-sm" data-testid={`top-flag-${idx}`}>
                  <span>{f.flag.replace(/_/g, " ")}</span>
                  <Badge variant="secondary" className="text-xs">{f.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!reportsLoading && reports && reports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" style={{ color: "#277493" }} />
              <h3 className="text-base font-semibold">Recent Audit Reports</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reports.slice(0, 20).map((report: any) => (
                <div key={report.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border text-sm" data-testid={`audit-report-${report.id}`}>
                  <div className="flex items-center gap-2">
                    {report.auditResult === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : report.auditResult === "warning" ? (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#FEA002" }} />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="font-mono text-xs">{report.visitId.substring(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={report.auditResult === "pass" ? "default" : report.auditResult === "warning" ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {report.auditResult} ({report.overallAuditScore}%)
                    </Badge>
                    {report.flagCount > 0 && (
                      <Badge variant="outline" className="text-xs">{report.flagCount} flag(s)</Badge>
                    )}
                    {report.autoRoutedToReview && (
                      <Badge variant="secondary" className="text-xs">Auto-routed</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AuditViewer() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tab, setTab] = useState<"dashboard" | "log">("dashboard");
  const { data: events, isLoading } = useQuery<any[]>({ queryKey: ["/api/audit"] });

  const filtered = (events || []).filter((e: any) => {
    const matchSearch = !search ||
      e.userName?.toLowerCase().includes(search.toLowerCase()) ||
      e.details?.toLowerCase().includes(search.toLowerCase()) ||
      e.eventType?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.eventType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-audit-title">Audit & Compliance</h1>
        <p className="text-sm text-muted-foreground mt-1">Automated encounter audits and PHI access compliance tracking</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("dashboard")}
          className={`px-3 py-1.5 text-sm rounded-md ${tab === "dashboard" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          data-testid="button-audit-dashboard-tab"
        >
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />
          Audit Dashboard
        </button>
        <button
          onClick={() => setTab("log")}
          className={`px-3 py-1.5 text-sm rounded-md ${tab === "log" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          data-testid="button-audit-log-tab"
        >
          <Shield className="w-3.5 h-3.5 inline mr-1.5" />
          Audit Log
        </button>
      </div>

      {tab === "dashboard" ? (
        <AuditDashboard />
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-audit-search"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-audit-filter">
                <Filter className="w-3 h-3 mr-2" />
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="phi_access">PHI Access</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="visit_finalized">Visit Finalized</SelectItem>
                <SelectItem value="visit_exported">Visit Exported</SelectItem>
                <SelectItem value="assessment_completed">Assessment Completed</SelectItem>
                <SelectItem value="review_submitted">Review Submitted</SelectItem>
                <SelectItem value="automated_audit_completed">Automated Audit</SelectItem>
                <SelectItem value="billing_gate_pass">Billing Gate Pass</SelectItem>
                <SelectItem value="billing_gate_fail">Billing Gate Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : filtered.length ? (
              filtered.map((event: any) => (
                <Card key={event.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0 bg-muted mt-0.5">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant={eventTypeColors[event.eventType] as any || "secondary"} className="text-xs">
                            {event.eventType?.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : "Unknown"}
                          </span>
                        </div>
                        {event.details && <p className="text-sm">{event.details}</p>}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {event.userName && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {event.userName} ({event.userRole})</span>
                          )}
                          {event.resourceType && (
                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {event.resourceType}: {event.resourceId}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <Shield className="w-10 h-10 mb-3 opacity-40" />
                  <span className="text-sm">No audit events found</span>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
