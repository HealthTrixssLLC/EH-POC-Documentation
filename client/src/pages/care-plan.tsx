import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, FileText, Plus, CheckCircle2, Circle, Clock, Pencil, Trash2, Send, PauseCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlatform } from "@/hooks/use-platform";
import { SourceBadge, SourceBorderClass, SourceLegend } from "@/components/source-indicator";

const taskTypes = [
  { value: "referral", label: "Referral" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "lab_order", label: "Lab Order" },
  { value: "medication", label: "Medication" },
  { value: "social_services", label: "Social Services" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "ordered", label: "Ordered / Awaiting Results" },
  { value: "deferred", label: "Deferred to Follow-Up" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const priorityColors: Record<string, string> = {
  low: "#277493",
  medium: "#FEA002",
  high: "#E74C3C",
  urgent: "#E74C3C",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const statusIcons: Record<string, any> = {
  pending: Circle,
  ordered: Send,
  deferred: PauseCircle,
  in_progress: Clock,
  completed: CheckCircle2,
};

const statusColors: Record<string, string> = {
  pending: "#ABAFA5",
  ordered: "#FEA002",
  deferred: "#8B5CF6",
  in_progress: "#3B82F6",
  completed: "#277493",
};

export default function CarePlan() {
  const { isMobileLayout } = usePlatform();
  const [, params] = useRoute("/visits/:id/intake/careplan");
  const visitId = params?.id;
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({
    taskType: "follow_up",
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
  });

  const [editForm, setEditForm] = useState({
    taskType: "",
    title: "",
    description: "",
    priority: "",
    dueDate: "",
    status: "",
  });

  const { data: bundle, isLoading } = useQuery<any>({
    queryKey: ["/api/visits", visitId, "bundle"],
    enabled: !!visitId,
  });

  const { data: tasks, isLoading: loadingTasks } = useQuery<any[]>({
    queryKey: ["/api/visits", visitId, "tasks"],
    enabled: !!visitId,
  });

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/visits", visitId, "tasks"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/visits/${visitId}/tasks`, {
        ...newTask,
        memberId: bundle?.member?.id,
        visitId,
      });
    },
    onSuccess: () => {
      invalidateTasks();
      toast({ title: "Task created" });
      setCreateDialogOpen(false);
      setNewTask({ taskType: "follow_up", title: "", description: "", priority: "medium", dueDate: "" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingTask) return;
      await apiRequest("PATCH", `/api/tasks/${editingTask.id}`, editForm);
    },
    onSuccess: () => {
      invalidateTasks();
      toast({ title: "Task updated" });
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      invalidateTasks();
      toast({ title: "Task removed" });
      setDeleteConfirmId(null);
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const openEditDialog = (task: any) => {
    setEditForm({
      taskType: task.taskType || "other",
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      dueDate: task.dueDate || "",
      status: task.status || "pending",
    });
    setEditingTask(task);
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className={`space-y-6 ${isMobileLayout ? "pb-20" : ""}`}>
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
          <TaskForm
            values={newTask}
            onChange={setNewTask}
            testIdPrefix=""
            showStatus={false}
          />
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={!newTask.title || createMutation.isPending}
              data-testid="button-create-task"
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Review & Edit Task
            </DialogTitle>
          </DialogHeader>
          {editingTask && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {(editingTask.source === "voice_capture" || editingTask.source === "external") && (
                  <SourceBadge source={editingTask.source} />
                )}
                {editingTask.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(editingTask.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <TaskForm
                values={editForm}
                onChange={setEditForm}
                testIdPrefix="edit-"
                showStatus={true}
              />
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmId(editingTask.id)}
                  data-testid="button-delete-task"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => setEditingTask(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={!editForm.title || updateMutation.isPending}
                  data-testid="button-save-task"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Task?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove this task from the care plan. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Removing..." : "Remove Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SourceLegend className="px-1" />

      <div className="space-y-3">
        {loadingTasks ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : tasks?.length ? (
          tasks.map((task: any) => {
            const StatusIcon = statusIcons[task.status] || Circle;
            return (
              <Card
                key={task.id}
                className={`cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all mobile-card-press ${SourceBorderClass(task.source)}`}
                onClick={() => openEditDialog(task)}
                data-testid={`card-task-${task.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <StatusIcon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: statusColors[task.status] || "#ABAFA5" }} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold" data-testid={`text-task-title-${task.id}`}>{task.title}</span>
                          {(task.source === "external" || task.source === "voice_capture") && (
                            <SourceBadge source={task.source} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">{task.taskType.replace(/_/g, " ")}</Badge>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityColors[task.priority] || "#ABAFA5" }} />
                            <span className="text-xs text-muted-foreground capitalize">{priorityLabels[task.priority] || task.priority}</span>
                          </div>
                        </div>
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                      <div className="flex items-center gap-3 flex-wrap">
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due: {task.dueDate}
                          </span>
                        )}
                        <Badge
                          variant={task.status === "completed" ? "default" : "outline"}
                          className="text-xs capitalize"
                          data-testid={`badge-task-status-${task.id}`}
                        >
                          {task.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                    <Pencil className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
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

function TaskForm({ values, onChange, testIdPrefix, showStatus }: {
  values: any;
  onChange: (v: any) => void;
  testIdPrefix: string;
  showStatus: boolean;
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Task Type</Label>
        <Select value={values.taskType} onValueChange={(v) => onChange({ ...values, taskType: v })}>
          <SelectTrigger data-testid={`select-${testIdPrefix}task-type`}>
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
          value={values.title}
          onChange={(e) => onChange({ ...values, title: e.target.value })}
          placeholder="Task title"
          data-testid={`input-${testIdPrefix}task-title`}
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          placeholder="Details about this task..."
          data-testid={`input-${testIdPrefix}task-description`}
        />
      </div>
      <div className={`grid ${showStatus ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={values.priority} onValueChange={(v) => onChange({ ...values, priority: v })}>
            <SelectTrigger data-testid={`select-${testIdPrefix}task-priority`}>
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
            value={values.dueDate}
            onChange={(e) => onChange({ ...values, dueDate: e.target.value })}
            data-testid={`input-${testIdPrefix}task-due-date`}
          />
        </div>
        {showStatus && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={values.status} onValueChange={(v) => onChange({ ...values, status: v })}>
              <SelectTrigger data-testid={`select-${testIdPrefix}task-status`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
