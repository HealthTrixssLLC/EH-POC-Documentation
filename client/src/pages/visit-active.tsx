import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  PlayCircle,
} from "lucide-react";
import { usePlatform } from "@/hooks/use-platform";

const statusColors: Record<string, string> = {
  scheduled: "secondary",
  in_progress: "default",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ActiveVisitCard({ v }: { v: any }) {
  const href =
    v.status === "scheduled"
      ? `/visits/${v.id}/summary`
      : `/visits/${v.id}/intake`;

  return (
    <Link href={href}>
      <Card className="hover-elevate cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback
                  className="text-sm text-white"
                  style={{ backgroundColor: "#2E456B" }}
                >
                  {getInitials(v.memberName || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className="text-sm font-semibold truncate"
                  data-testid={`text-active-visit-member-${v.id}`}
                >
                  {v.memberName || "Unknown Patient"}
                </span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {v.scheduledDate} {v.scheduledTime || ""}
                  </span>
                </div>
                {v.visitType && (
                  <Badge
                    variant="secondary"
                    className="text-xs mt-1 w-fit no-default-active-elevate"
                  >
                    {v.visitType}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={(statusColors[v.status] as any) || "secondary"}
                className="text-xs"
                data-testid={`badge-active-visit-status-${v.id}`}
              >
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

export default function VisitActive() {
  const { isMobileLayout } = usePlatform();
  const { data: visits, isLoading } = useQuery<any[]>({
    queryKey: ["/api/visits"],
  });

  const activeVisits = useMemo(() => {
    return (visits || []).filter(
      (v: any) =>
        v.status === "in_progress" ||
        v.status === "scheduled"
    );
  }, [visits]);

  const inProgressVisits = activeVisits.filter(
    (v: any) => v.status === "in_progress"
  );
  const scheduledVisits = activeVisits.filter(
    (v: any) => v.status === "scheduled"
  );

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      <div className="pb-1">
        <h1
          className="text-lg font-bold"
          data-testid="text-active-visits-title"
        >
          Active Visits
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading
            ? "Loading..."
            : `${activeVisits.length} visit${activeVisits.length !== 1 ? "s" : ""} needing action`}
        </p>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))
      ) : activeVisits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ClipboardList className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
            <span className="text-sm text-muted-foreground">
              No visits need action
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              All visits are completed or pending review
            </span>
          </CardContent>
        </Card>
      ) : (
        <>
          {inProgressVisits.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1">
                <PlayCircle className="w-4 h-4" style={{ color: "#FEA002" }} />
                <h2 className="text-sm font-semibold text-muted-foreground">
                  In Progress
                </h2>
                <Badge
                  variant="secondary"
                  className="text-xs no-default-active-elevate"
                >
                  {inProgressVisits.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {inProgressVisits.map((v: any) => (
                  <ActiveVisitCard key={v.id} v={v} />
                ))}
              </div>
            </div>
          )}

          {scheduledVisits.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Scheduled
                </h2>
                <Badge
                  variant="secondary"
                  className="text-xs no-default-active-elevate"
                >
                  {scheduledVisits.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {scheduledVisits.map((v: any) => (
                  <ActiveVisitCard key={v.id} v={v} />
                ))}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}
