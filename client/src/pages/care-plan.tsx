import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, FileText, Plus, CheckCircle2, Circle, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/use-platform";

const taskTypes = [
  { value: "referral", label: "Referral" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "lab_order", label: "Lab Order" },
  { value: "medication", label: "Medication" },
  { value: "social_services", label: "Social Services" },
  { value: "other", label: "Other" },
];

const priorityColors: Record<string, string> = {
  low: "#277493",
  medium: "#FEA002",
  high: "#E74C3C",
  urgent: "#E74C3C",
};

const statusIcons: Record<string, any> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

export default function CarePlan() {
  const { isMobileLayout } = usePlatform();
  const [, params] = useRoute("/visits/:id/intake/careplan");
  const visitId = params?.id;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newTask, setNewTask] = useState({
    taskType: "follow_up",
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const { data: tasks, isLoading: loadingTasks } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "tasks"],
    enabled: !!visitId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/tasks`, {
        ...newTask,
        memberId: bundle?.member?.id,
        visitId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "tasks"] });
      toast({ title: "Task created" });
      setDialogOpen(false);
      setNewTask({ taskType: "follow_up", title: "", description: "", priority: "medium", dueDate: "" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {isMobileLayout ? (
          <div className="flex items-center justify-between gap-3 pt-2">
            <h1 className="text-lg font-bold">Care Plan</h1>
            <DialogTrigger asChild>
              <Button data-testid="button-add-task">
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </DialogTrigger>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Link href={`/visits/${visitId}/intake`}>
              <Button variant="ghost" size="sm" data-testid="button-back-intake">
                <ChevronLeft className="w-4 h-4 mr-1" /> Intake
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Care Plan & Tasks</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {bundle?.member?.firstName} {bundle?.member?.lastName}
              </p>
            </div>
            <DialogTrigger asChild>
              <Button data-testid="button-add-task">
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </DialogTrigger>
          </div>
        )}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Care Plan Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={newTask.taskType} onValueChange={(v) => setNewTask((p) => ({ ...p, taskType: v }))}>
                <SelectTrigger data-testid="select-task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                placeholder="Task title"
                data-testid="input-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                placeholder="Details about this task..."
                data-testid="input-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))}
                  data-testid="input-task-due-date"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={!newTask.title || createMutation.isPending}
              data-testid="button-create-task"
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {loadingTasks ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : tasks?.length ? (
          tasks.map((task: any) => {
            const StatusIcon = statusIcons[task.status] || Circle;
            return (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <StatusIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: task.status === "completed" ? "#277493" : "#ABAFA5" }} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold" data-testid={`text-task-title-${task.id}`}>{task.title}</span>
                          {task.source === "external" && (
                            <Badge variant="default" className="text-xs bg-blue-600 dark:bg-blue-500" data-testid={`badge-external-task-${task.id}`}>External</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">{task.taskType.replace(/_/g, " ")}</Badge>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityColors[task.priority] || "#ABAFA5" }} />
                        </div>
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due: {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <FileText className="w-10 h-10 mb-3 text-muted-foreground opacity-40" />
              <span className="text-sm text-muted-foreground">No tasks yet. Add tasks for follow-up care.</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
