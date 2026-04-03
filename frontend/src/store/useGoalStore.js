import { create } from "zustand";
import api from "@/lib/api";

const defaultFilters = {
  status: "",
  category: "",
  priority: "",
  sortBy: "Deadline",
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const upsertGoal = (goals, nextGoal) =>
  goals.some((goal) => goal.id === nextGoal.id)
    ? goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
    : [nextGoal, ...goals];

const useGoalStore = create((set, get) => ({
  goals: [],
  activeGoal: null,
  isLoading: false,
  isGeneratingPlan: false,
  generatingGoalId: null,
  filters: defaultFilters,
  error: null,
  fetchGoals: async (overrides = {}) => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const { status, category, priority } = get().filters;
      const response = await api.get("/api/goals", {
        params: {
          ...(overrides.status ?? status ? { status: overrides.status ?? status } : {}),
          ...(overrides.category ?? category
            ? { category: overrides.category ?? category }
            : {}),
          ...(overrides.priority ?? priority
            ? { priority: overrides.priority ?? priority }
            : {}),
        },
      });

      set({
        goals: response.data.goals || [],
        isLoading: false,
      });

      return response.data.goals || [];
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  fetchGoal: async (goalId) => {
    try {
      const response = await api.get(`/api/goals/${goalId}`);
      set({
        activeGoal: response.data.goal,
      });
      return response.data.goal;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  createGoal: async (payload) => {
    try {
      const response = await api.post("/api/goals", payload);

      set((state) => ({
        goals: upsertGoal(state.goals, response.data.goal),
      }));

      await get().fetchGoals();
      return response.data.goal;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  updateGoal: async (goalId, payload) => {
    try {
      const response = await api.put(`/api/goals/${goalId}`, payload);

      set((state) => ({
        goals: upsertGoal(state.goals, response.data.goal),
        activeGoal:
          state.activeGoal?.id === goalId ? response.data.goal : state.activeGoal,
      }));

      await get().fetchGoals();
      return response.data.goal;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  updateProgress: async (goalId, progress) => {
    try {
      const response = await api.put(`/api/goals/${goalId}/progress`, { progress });

      set((state) => ({
        goals: upsertGoal(state.goals, response.data.goal),
        activeGoal:
          state.activeGoal?.id === goalId ? response.data.goal : state.activeGoal,
      }));

      await get().fetchGoals();
      return response.data.goal;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  deleteGoal: async (goalId) => {
    try {
      await api.delete(`/api/goals/${goalId}`);

      set((state) => ({
        goals: state.goals.filter((goal) => goal.id !== goalId),
        activeGoal: state.activeGoal?.id === goalId ? null : state.activeGoal,
      }));
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  generateStudyPlan: async (goalId) => {
    set({
      isGeneratingPlan: true,
      generatingGoalId: goalId,
      error: null,
    });

    try {
      const response = await api.post(`/api/goals/${goalId}/generate-plan`);

      set((state) => ({
        goals: upsertGoal(state.goals, response.data.goal),
        activeGoal:
          state.activeGoal?.id === goalId ? response.data.goal : state.activeGoal,
        isGeneratingPlan: false,
        generatingGoalId: null,
      }));

      return response.data.studyPlan;
    } catch (error) {
      set({
        isGeneratingPlan: false,
        generatingGoalId: null,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  setFilters: (partial) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial,
      },
    })),
  setActiveGoal: (goal) =>
    set({
      activeGoal: goal,
    }),
}));

export default useGoalStore;
