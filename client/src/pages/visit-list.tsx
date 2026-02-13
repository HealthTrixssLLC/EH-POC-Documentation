import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Calendar,
  MapPin,
  ChevronRight,
  ClipboardList,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { usePlatform } from "@/hooks/use-platform";

const statusColors: Record<string, string> = {
  scheduled: "secondary",
  in_progress: "default",
  ready_for_review: "outline",
  finalized: "default",
  synced: "default",
  emr_submitted: "default",
  export_generated: "default",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  ready_for_review: "Ready for Review",
  finalized: "Finalized",
  synced: "Synced",
  emr_submitted: "EMR Submitted",
  export_generated: "Export Generated",
};

type SortOption = "date_asc" | "date_desc" | "name_asc" | "name_desc";
type GroupOption = "date" | "status" | "none";

function formatDateHeader(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(year, month - 1, day);

    if (dateOnly.getTime() === today.getTime()) {
      return "Today";
    }
    if (dateOnly.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateOnly.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function parseTime(timeStr?: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3];
  if (ampm) {
    if (ampm.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
}

function VisitCard({ v }: { v: any }) {
  const { isMobileLayout } = usePlatform();
  
  return (
    <Link key={v.id} href={v.status === "scheduled" ? `/visits/${v.id}/summary` : `/visits/${v.id}/intake`}>
      <Card className="hover-elevate cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md flex-shrink-0" style={{ backgroundColor: "#2E456B15" }}>
                <ClipboardList className="w-5 h-5" style={{ color: "#2E456B" }} />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-semibold truncate" data-testid={`text-visit-member-${v.id}`}>
                  {v.memberName || "Unknown Patient"}
                </span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {v.scheduledDate} {v.scheduledTime || ""}
                  </span>
                  {!isMobileLayout && v.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {v.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusColors[v.status] as any || "secondary"} className="text-xs" data-testid={`badge-visit-status-${v.id}`}>
                {statusLabels[v.status] || v.status}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function VisitList() {
  const { isMobileLayout } = usePlatform();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  const [groupBy, setGroupBy] = useState<GroupOption>("date");
  const { data: visits, isLoading } = useQuery<any[]>({ queryKey: ["/api/visits"] });

  const filtered = useMemo(() => {
    return (visits || []).filter((v: any) => {
      const matchSearch =
        !search ||
        v.memberName?.toLowerCase().includes(search.toLowerCase()) ||
        v.memberId?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || v.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [visits, search, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sortBy) {
        case "date_asc": {
          const dateComp = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
          if (dateComp !== 0) return dateComp;
          return parseTime(a.scheduledTime) - parseTime(b.scheduledTime);
        }
        case "date_desc": {
          const dateComp = (b.scheduledDate || "").localeCompare(a.scheduledDate || "");
          if (dateComp !== 0) return dateComp;
          return parseTime(b.scheduledTime) - parseTime(a.scheduledTime);
        }
        case "name_asc":
          return (a.memberName || "").localeCompare(b.memberName || "");
        case "name_desc":
          return (b.memberName || "").localeCompare(a.memberName || "");
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortBy]);

  const grouped = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", items: sorted }];
    }

    const groups: Record<string, any[]> = {};
    const order: string[] = [];

    for (const v of sorted) {
      let key: string;
      if (groupBy === "date") {
        key = v.scheduledDate || "Unknown";
      } else {
        key = v.status || "unknown";
      }
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(v);
    }

    return order.map((key) => ({
      key,
      label: groupBy === "date" ? formatDateHeader(key) : (statusLabels[key] || key),
      items: groups[key],
    }));
  }, [sorted, groupBy]);

  const sortLabel: Record<SortOption, string> = {
    date_asc: "Date (Earliest)",
    date_desc: "Date (Latest)",
    name_asc: "Name (A-Z)",
    name_desc: "Name (Z-A)",
  };

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      {!isMobileLayout && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" data-testid="text-visit-list-title">Visits</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "Loading..." : `${filtered.length} visit${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      )}

      {isMobileLayout && (
        <div className="pb-2">
          <h1 className="text-lg font-bold" data-testid="text-visit-list-title">Visits</h1>
        </div>
      )}

      {!isMobileLayout && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-visit-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-visit-status-filter">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="ready_for_review">Ready for Review</SelectItem>
              <SelectItem value="finalized">Finalized</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px]" data-testid="select-visit-sort">
              <ArrowUpDown className="w-3 h-3 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_asc">Date (Earliest)</SelectItem>
              <SelectItem value="date_desc">Date (Latest)</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupOption)}>
            <SelectTrigger className="w-[160px]" data-testid="select-visit-group">
              <Calendar className="w-3 h-3 mr-2" />
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Group by Date</SelectItem>
              <SelectItem value="status">Group by Status</SelectItem>
              <SelectItem value="none">No Grouping</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <ClipboardList className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
              <span className="text-sm text-muted-foreground">No visits found</span>
            </CardContent>
          </Card>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              {group.label && (
                <div className="flex items-center gap-2 pb-1">
                  <h2 className="text-sm font-semibold text-muted-foreground" data-testid={`text-group-header-${group.key}`}>
                    {group.label}
                  </h2>
                  <Badge variant="secondary" className="text-xs no-default-active-elevate">
                    {group.items.length}
                  </Badge>
                </div>
              )}
              <div className="space-y-2">
                {group.items.map((v: any) => (
                  <VisitCard key={v.id} v={v} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
