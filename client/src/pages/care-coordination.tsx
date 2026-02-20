import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/hooks/use-platform";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Users,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  User,
  Calendar,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const priorityColors: Record<string, string> = {
  low: "#277493",
  medium: "#FEA002",
  high: "#E74C3C",
  urgent: "#E74C3C",
};

export default function CareCoordination() {
  const { isMobileLayout } = usePlatform();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [outcome, setOutcome] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const { data: tasks, isLoading } = useQuery<any[]>({ queryKey: ["/api/tasks"] });

  const updateMutation = useMutation({
    mutationFn: async (data: { taskId: string; status: string; outcome?: string; outcomeNotes?: string }) => {
      await apiRequest("PATCH", `/api/tasks/${data.taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
      setSelectedTask(null);
      setOutcome("");
      setOutcomeNotes("");
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (tasks || []).filter((t: any) => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.memberName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      <div>
        <h1 className="text-xl font-bold" data-testid="text-coordination-title">Care Coordination</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage follow-up tasks and referrals</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-task-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-task-filter">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : filtered.length ? (
          filtered.map((task: any) => (
            <Card key={task.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedTask(task)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md flex-shrink-0" style={{
                    backgroundColor: task.status === "completed" ? "#27749315" : "#FEA00215"
                  }}>
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: "#277493" }} />
                    ) : task.status === "in_progress" ? (
                      <Clock className="w-5 h-5" style={{ color: "#FEA002" }} />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-semibold" data-testid={`text-task-${task.id}`}>{task.title}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityColors[task.priority] || "#ABAFA5" }} />
                        <Badge variant="secondary" className="text-xs capitalize">{task.taskType?.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {task.memberName && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.memberName}</span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {task.dueDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Users className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
              <span className="text-sm text-muted-foreground">No tasks found</span>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedTask && (
        <Dialog open={true} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-md border space-y-1 text-sm">
                <div><strong>Type:</strong> {selectedTask.taskType?.replace(/_/g, " ")}</div>
                <div><strong>Priority:</strong> {selectedTask.priority}</div>
                <div><strong>Status:</strong> {selectedTask.status}</div>
                {selectedTask.dueDate && <div><strong>Due:</strong> {selectedTask.dueDate}</div>}
                {selectedTask.description && <div><strong>Description:</strong> {selectedTask.description}</div>}
              </div>

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select value={outcome || selectedTask.status} onValueChange={setOutcome}>
                  <SelectTrigger data-testid="select-update-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Outcome Notes</Label>
                <Textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Document outcome or notes..."
                  data-testid="input-outcome-notes"
                />
              </div>

              <Button
                className="w-full"
                onClick={() => updateMutation.mutate({
                  taskId: selectedTask.id,
                  status: outcome || selectedTask.status,
                  outcome: outcome || selectedTask.status,
                  outcomeNotes,
                })}
                disabled={updateMutation.isPending}
                data-testid="button-update-task"
              >
                {updateMutation.isPending ? "Updating..." : "Update Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
