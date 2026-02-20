import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/hooks/use-platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  Users,
  FileText,
  BarChart3,
  AlertTriangle,
  Activity,
} from "lucide-react";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  memberId?: string;
}

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface TimeEntry {
  id: string;
  memberId: string;
  providerId: string;
  providerName?: string;
  activityType: string;
  durationMinutes: number;
  activityDate: string;
  notes?: string;
}

interface MonthlySummary {
  memberId: string;
  billingMonth: string;
  totalMinutes: number;
  qualifyingCpt: string;
  providerBreakdown?: Record<string, number>;
  duplicationsDetected?: Array<{
    date: string;
    activityType: string;
    providers: string[];
    minutes: number[];
  }>;
}

const activityTypes = [
  { value: "care_plan_dev", label: "Care Plan Development" },
  { value: "consultation", label: "Consultation" },
  { value: "assessment", label: "Assessment" },
  { value: "coordination", label: "Coordination" },
  { value: "review", label: "Review" },
];

const activityTypeLabels: Record<string, string> = {
  care_plan_dev: "Care Plan Dev",
  consultation: "Consultation",
  assessment: "Assessment",
  coordination: "Coordination",
  review: "Review",
};

const cmsThresholds = [
  { cpt: "99492", label: "Initial (70 min)", threshold: 70 },
  { cpt: "99493", label: "Subsequent (60 min)", threshold: 60 },
  { cpt: "99494", label: "Add-on (30 min each)", threshold: 30 },
];

function TimeEntryForm({
  selectedMemberId,
  memberName,
}: {
  selectedMemberId: string;
  memberName: string;
}) {
  const { toast } = useToast();
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const providers = (users || []).filter((u) => u.role === "np");

  const [providerId, setProviderId] = useState("");
  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/cocm/time-entries", {
        memberId: selectedMemberId,
        providerId,
        activityType,
        durationMinutes: parseInt(duration),
        activityDate,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cocm/time-entries", selectedMemberId],
      });
      toast({ title: "Time entry added" });
      setProviderId("");
      setActivityType("");
      setDuration("");
      setActivityDate("");
      setNotes("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add entry", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = providerId && activityType && duration && activityDate && parseInt(duration) > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5" style={{ color: "#277493" }} />
          <h3 className="text-base font-semibold">New Time Entry</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Member</Label>
          <Input
            value={memberName}
            disabled
            data-testid="input-member-display"
          />
        </div>

        <div className="space-y-2">
          <Label>Provider</Label>
          {usersLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger data-testid="select-provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Activity Type</Label>
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger data-testid="select-activity-type">
              <SelectValue placeholder="Select activity" />
            </SelectTrigger>
            <SelectContent>
              {activityTypes.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 30"
            data-testid="input-duration"
          />
        </div>

        <div className="space-y-2">
          <Label>Activity Date</Label>
          <Input
            type="date"
            value={activityDate}
            onChange={(e) => setActivityDate(e.target.value)}
            data-testid="input-activity-date"
          />
        </div>

        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details..."
            data-testid="input-notes"
          />
        </div>

        <Button
          className="w-full"
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          data-testid="button-submit-entry"
        >
          {createMutation.isPending ? "Adding..." : "Add Time Entry"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TimeEntriesTable({ memberId }: { memberId: string }) {
  const { toast } = useToast();

  const { data: entries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/cocm/time-entries", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/cocm/time-entries?memberId=${memberId}`);
      if (!res.ok) throw new Error("Failed to fetch entries");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cocm/time-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/cocm/time-entries", memberId],
      });
      toast({ title: "Entry deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const totalMinutes = (entries || []).reduce((sum, e) => sum + e.durationMinutes, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: "#002B5C" }} />
            <h3 className="text-base font-semibold">Time Entries</h3>
          </div>
          <Badge variant="secondary" data-testid="badge-total-minutes">
            Total: {totalMinutes} min
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!entries || entries.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            <span className="text-sm">No time entries recorded</span>
            <span className="text-xs mt-1">Add entries using the form</span>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border text-sm"
                data-testid={`row-entry-${entry.id}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {activityTypeLabels[entry.activityType] || entry.activityType}
                    </Badge>
                    <span className="font-medium">{entry.durationMinutes} min</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {entry.activityDate}
                    </span>
                  </div>
                  {entry.providerName && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {entry.providerName}
                    </div>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground truncate">{entry.notes}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(entry.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-entry-${entry.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlySummaryPanel({ memberId }: { memberId: string }) {
  const { toast } = useToast();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [computedSummary, setComputedSummary] = useState<MonthlySummary | null>(null);

  const { data: historicalSummaries, isLoading: histLoading } = useQuery<MonthlySummary[]>({
    queryKey: ["/api/cocm/monthly-summary", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/cocm/monthly-summary?memberId=${memberId}`);
      if (!res.ok) throw new Error("Failed to fetch summaries");
      return res.json();
    },
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cocm/monthly-summary", {
        memberId,
        month: selectedMonth,
      });
      return res.json();
    },
    onSuccess: (data: MonthlySummary) => {
      setComputedSummary(data);
      queryClient.invalidateQueries({
        queryKey: ["/api/cocm/monthly-summary", memberId],
      });
      toast({ title: "Summary computed" });
    },
    onError: (err: Error) => {
      toast({ title: "Computation failed", description: err.message, variant: "destructive" });
    },
  });

  const displaySummary = computedSummary;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: "#FEA002" }} />
            <h3 className="text-base font-semibold">Monthly Summary</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-[140px]">
              <Label>Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                data-testid="input-month-selector"
              />
            </div>
            <Button
              onClick={() => computeMutation.mutate()}
              disabled={computeMutation.isPending || !selectedMonth}
              data-testid="button-compute-summary"
            >
              {computeMutation.isPending ? "Computing..." : "Compute Summary"}
            </Button>
          </div>

          {displaySummary && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Minutes</div>
                    <div className="text-2xl font-bold" style={{ color: "#002B5C" }} data-testid="text-summary-total-minutes">
                      {displaySummary.totalMinutes}
                    </div>
                  </div>
                  <Badge
                    variant="default"
                    className="text-sm"
                    style={{ backgroundColor: "#277493" }}
                    data-testid="badge-qualifying-cpt"
                  >
                    CPT: {displaySummary.qualifyingCpt}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">CMS Threshold Progress</h4>
                  {cmsThresholds.map((t) => {
                    const pct = Math.min(100, (displaySummary.totalMinutes / t.threshold) * 100);
                    const met = displaySummary.totalMinutes >= t.threshold;
                    return (
                      <div key={t.cpt} data-testid={`progress-cpt-${t.cpt}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {t.cpt} - {t.label}
                          </span>
                          <span className={`text-xs font-medium ${met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {displaySummary.totalMinutes}/{t.threshold} min
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </div>

                {displaySummary.providerBreakdown && Object.keys(displaySummary.providerBreakdown).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Provider Breakdown</h4>
                    {Object.entries(displaySummary.providerBreakdown).map(([provider, mins]) => (
                      <div key={provider} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{provider}</span>
                        <Badge variant="secondary" className="text-xs">{mins} min</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {displaySummary.duplicationsDetected && displaySummary.duplicationsDetected.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" style={{ color: "#FEA002" }} />
                      <h4 className="text-sm font-medium">Duplication Warnings</h4>
                    </div>
                    {displaySummary.duplicationsDetected.map((dup, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-muted-foreground p-2 rounded-md bg-muted"
                        data-testid={`text-warning-${idx}`}
                      >
                        {dup.date}: {activityTypeLabels[dup.activityType] || dup.activityType} logged by {dup.providers.length} providers ({dup.minutes.join(" + ")} min)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: "#277493" }} />
            <h3 className="text-base font-semibold">Historical Summaries</h3>
          </div>
        </CardHeader>
        <CardContent>
          {histLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !historicalSummaries || historicalSummaries.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">No historical summaries</span>
              <span className="text-xs mt-1">Compute a summary to see it here</span>
            </div>
          ) : (
            <div className="space-y-2">
              {historicalSummaries.map((summary, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border text-sm"
                  data-testid={`row-summary-${idx}`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{summary.billingMonth}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{summary.totalMinutes} min</span>
                    <Badge variant="secondary" className="text-xs">
                      {summary.qualifyingCpt}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CocmTimeTracking() {
  const { isMobileLayout } = usePlatform();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const selectedMember = members?.find((m) => m.id === selectedMemberId);
  const memberName = selectedMember
    ? `${selectedMember.firstName} ${selectedMember.lastName} (ID: ${selectedMember.memberId || selectedMember.id})`
    : "";

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-cocm-title" style={{ color: "#002B5C" }}>
          CoCM Time-Based Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Collaborative Care Model time tracking and CPT code qualification
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>Select Member</Label>
              {membersLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={selectedMemberId || ""}
                  onValueChange={(v) => setSelectedMemberId(v)}
                >
                  <SelectTrigger data-testid="select-member">
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(members || []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} (ID: {m.memberId || m.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedMemberId ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mb-3 opacity-40" />
            <span className="text-sm">Select a member to begin tracking time</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <TimeEntryForm
              selectedMemberId={selectedMemberId}
              memberName={memberName}
            />
          </div>
          <div>
            <TimeEntriesTable memberId={selectedMemberId} />
          </div>
          <div>
            <MonthlySummaryPanel memberId={selectedMemberId} />
          </div>
        </div>
      )}
    </div>
  );
}
