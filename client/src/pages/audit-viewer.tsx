import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  Search,
  Filter,
  User,
  Clock,
  FileText,
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
};

export default function AuditViewer() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
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
        <h1 className="text-xl font-bold" data-testid="text-audit-title">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">PHI access events and compliance tracking</p>
      </div>

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
    </div>
  );
}
