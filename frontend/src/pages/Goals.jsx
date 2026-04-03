import { useEffect } from "react";
import toast from "react-hot-toast";
import GoalsDashboard from "@/components/goals/GoalsDashboard";
import useGoalStore from "@/store/useGoalStore";

function Goals() {
  const filters = useGoalStore((state) => state.filters);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);

  useEffect(() => {
    fetchGoals().catch((error) => {
      toast.error(error?.response?.data?.message || "Could not load goals.");
    });
  }, [
    fetchGoals,
    filters.category,
    filters.priority,
    filters.sortBy,
    filters.status,
  ]);

  return <GoalsDashboard />;
}

export default Goals;

