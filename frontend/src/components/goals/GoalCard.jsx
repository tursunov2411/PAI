import { useEffect, useState } from "react";
import { Trash2, MessageSquareMore, Sparkles, PenSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useGoalStore from "@/store/useGoalStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import StudyPlanViewer from "@/components/goals/StudyPlanViewer";
import {
  cn,
  formatDisplayDate,
  getGoalCategoryMeta,
  isDueSoon,
  isOverdue,
} from "@/lib/utils";

const statusOptions = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const progressClassName = (progress) => {
  if (progress < 30) {
    return "bg-error";
  }

  if (progress < 70) {
    return "bg-warning";
  }

  return "bg-success";
};

function GoalCard({ goal, onEdit }) {
  const navigate = useNavigate();
  const updateGoal = useGoalStore((state) => state.updateGoal);
  const updateProgress = useGoalStore((state) => state.updateProgress);
  const deleteGoal = useGoalStore((state) => state.deleteGoal);
  const generateStudyPlan = useGoalStore((state) => state.generateStudyPlan);
  const generatingGoalId = useGoalStore((state) => state.generatingGoalId);
  const [progressDraft, setProgressDraft] = useState(goal.progress || 0);
  const [showProgressEditor, setShowProgressEditor] = useState(false);
  const [showPlan, setShowPlan] = useState(Boolean(goal.studyPlan));
  const categoryMeta = getGoalCategoryMeta(goal.category);
  const CategoryIcon = categoryMeta.icon;

  useEffect(() => {
    setProgressDraft(goal.progress || 0);
  }, [goal.progress]);

  const handleStatusChange = async (status) => {
    try {
      await updateGoal(goal.id, { status });
      toast.success("Goal status updated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not update status.");
    }
  };

  const handleSaveProgress = async () => {
    try {
      await updateProgress(goal.id, progressDraft);
      setShowProgressEditor(false);
      toast.success("Goal progress updated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not update progress.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGoal(goal.id);
      toast.success("Goal deleted.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not delete goal.");
    }
  };

  const handleGeneratePlan = async () => {
    try {
      await generateStudyPlan(goal.id);
      setShowPlan(true);
      toast.success("Study plan generated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not generate study plan.");
    }
  };

  const handleDiscussInChat = () => {
    navigate("/dashboard/chat", {
      state: {
        goalId: goal.id,
        forceNew: true,
        prefill: `Help me make progress on "${goal.title}" today.`,
      },
    });
  };

  const overdue = isOverdue(goal.deadline);
  const dueSoon = !overdue && isDueSoon(goal.deadline);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`border ${categoryMeta.className}`}>
                <CategoryIcon className="mr-1 h-3 w-3" />
                {goal.category}
              </Badge>
              <Badge>{goal.priority}</Badge>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-text-primary">{goal.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-text-muted">
              {goal.description || "No description added yet."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(goal)}>
              <PenSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-error hover:bg-error/10 hover:text-error"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Progress</p>
              <p className="mt-1 text-sm font-medium text-text-primary">{goal.progress}% complete</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowProgressEditor((current) => !current)}>
              Update
            </Button>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
            <div
              className={cn("h-full rounded-full transition-all", progressClassName(goal.progress))}
              style={{ width: `${goal.progress}%` }}
            />
          </div>

          {showProgressEditor ? (
            <div className="mt-4 space-y-3">
              <input
                type="range"
                min="0"
                max="100"
                value={progressDraft}
                onChange={(event) => setProgressDraft(Number(event.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">{progressDraft}%</span>
                <Button size="sm" onClick={handleSaveProgress}>
                  Save Progress
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Deadline</p>
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                overdue ? "text-error" : dueSoon ? "text-warning" : "text-text-primary",
              )}
            >
              {goal.deadline ? formatDisplayDate(goal.deadline) : "No deadline"}
            </p>
            {overdue ? <p className="mt-1 text-xs text-error">Overdue</p> : null}
            {dueSoon ? <p className="mt-1 text-xs text-warning">Due within 7 days</p> : null}
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Status</p>
            <div className="mt-2">
              <Select value={goal.status} onChange={(event) => handleStatusChange(event.target.value)}>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={handleGeneratePlan} disabled={generatingGoalId === goal.id}>
            <Sparkles className="h-4 w-4" />
            {generatingGoalId === goal.id ? "Generating..." : "Generate Study Plan"}
          </Button>
          <Button variant="secondary" onClick={handleDiscussInChat}>
            <MessageSquareMore className="h-4 w-4" />
            Discuss in Chat
          </Button>
        </div>

        {goal.studyPlan ? (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setShowPlan((current) => !current)}>
              {showPlan ? "Hide Study Plan" : "View Study Plan"}
            </Button>
          </div>
        ) : null}

        {showPlan && goal.studyPlan ? (
          <StudyPlanViewer
            goal={goal}
            onRegenerate={handleGeneratePlan}
            isGenerating={generatingGoalId === goal.id}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export default GoalCard;
