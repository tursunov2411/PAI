import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import useGoalStore from "@/store/useGoalStore";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { isOverdue, sortGoalsBy } from "@/lib/utils";

const categories = ["All", "Academic", "Career", "Personal", "Financial", "Health"];
const sortOptions = ["Deadline", "Priority", "Progress", "Created"];

function GoalsDashboard() {
  const goals = useGoalStore((state) => state.goals);
  const filters = useGoalStore((state) => state.filters);
  const setFilters = useGoalStore((state) => state.setFilters);
  const isLoading = useGoalStore((state) => state.isLoading);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const stats = useMemo(
    () => ({
      total: goals.length,
      inProgress: goals.filter((goal) => goal.status === "in_progress").length,
      completed: goals.filter((goal) => goal.status === "completed").length,
      overdue: goals.filter((goal) => goal.deadline && isOverdue(goal.deadline)).length,
    }),
    [goals],
  );

  const sortedGoals = useMemo(() => sortGoalsBy(goals, filters.sortBy), [filters.sortBy, goals]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Goals", value: stats.total },
          { label: "In Progress", value: stats.inProgress },
          { label: "Completed", value: stats.completed },
          { label: "Overdue", value: stats.overdue },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-text-primary">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Badge variant="accent">Week 2 Focus</Badge>
            <CardTitle className="mt-4 text-3xl">Goals Dashboard</CardTitle>
            <p className="mt-2 text-sm text-text-muted">
              Track priorities, update progress, and generate AI study plans tied to your memory context.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingGoal(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() =>
                  setFilters({
                    category: category === "All" ? "" : category,
                  })
                }
                className={`rounded-full px-4 py-2 text-sm transition ${
                  (filters.category || "All") === category ||
                  (!filters.category && category === "All")
                    ? "bg-accent text-white"
                    : "bg-black/20 text-text-muted hover:bg-white/5 hover:text-text-primary"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-[180px_180px_180px]">
            <Select
              value={filters.priority}
              onChange={(event) => setFilters({ priority: event.target.value })}
            >
              <SelectItem value="">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </Select>

            <Select
              value={filters.status}
              onChange={(event) => setFilters({ status: event.target.value })}
            >
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="not_started">Not started</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </Select>

            <Select
              value={filters.sortBy}
              onChange={(event) => setFilters({ sortBy: event.target.value })}
            >
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  Sort by: {option}
                </SelectItem>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-text-muted">
              Loading goals...
            </div>
          ) : sortedGoals.length ? (
            <div className="grid gap-5">
              {sortedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={(selectedGoal) => {
                    setEditingGoal(selectedGoal);
                    setFormOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-5 py-14 text-center text-sm text-text-muted">
              No goals match the current filters. Create one to generate a plan and discuss it with the assistant.
            </div>
          )}
        </CardContent>
      </Card>

      <GoalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialGoal={editingGoal}
      />
    </div>
  );
}

export default GoalsDashboard;
