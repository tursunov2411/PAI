import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useGoalStore from "@/store/useGoalStore";

const categories = ["Academic", "Career", "Personal", "Financial", "Health"];
const priorities = ["high", "medium", "low"];

const emptyForm = {
  title: "",
  category: "Academic",
  description: "",
  deadline: "",
  priority: "medium",
};

function GoalForm({ open, onOpenChange, initialGoal = null }) {
  const createGoal = useGoalStore((state) => state.createGoal);
  const updateGoal = useGoalStore((state) => state.updateGoal);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialGoal) {
      setForm(emptyForm);
      return;
    }

    setForm({
      title: initialGoal.title || "",
      category: initialGoal.category || "Academic",
      description: initialGoal.description || "",
      deadline: initialGoal.deadline ? new Date(initialGoal.deadline).toISOString().slice(0, 10) : "",
      priority: initialGoal.priority || "medium",
    });
  }, [initialGoal, open]);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Goal title is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (initialGoal) {
        await updateGoal(initialGoal.id, form);
        toast.success("Goal updated.");
      } else {
        await createGoal(form);
        toast.success("Goal created.");
      }

      onOpenChange(false);
      setForm(emptyForm);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save the goal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialGoal ? "Edit Goal" : "Create Goal"}</DialogTitle>
          <DialogDescription>
            Define the outcome, urgency, and context so the assistant can help effectively.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Title</label>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Get ready for Bristol application"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Category</label>
              <Select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Deadline</label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(event) =>
                  setForm((current) => ({ ...current, deadline: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Description</label>
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="What does success look like, and why does this matter right now?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Priority</label>
            <div className="grid grid-cols-3 gap-3">
              {priorities.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, priority }))}
                  className={`rounded-2xl border px-4 py-3 text-sm capitalize transition ${
                    form.priority === priority
                      ? "border-accent/40 bg-accent/10 text-text-primary"
                      : "border-white/10 bg-black/20 text-text-muted hover:border-white/20"
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialGoal ? "Save Goal" : "Create Goal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GoalForm;

