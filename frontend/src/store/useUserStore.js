import { create } from "zustand";
import api from "@/lib/api";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const useUserStore = create((set) => ({
  user: null,
  isLoading: false,
  error: null,
  fetchUser: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get("/api/user/profile");
      set({
        user: response.data.user,
        isLoading: false,
      });
      return response.data.user;
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },
  updateUser: async (payload) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.put("/api/user/profile", payload);
      set({
        user: response.data.user,
        isLoading: false,
      });
      return response.data.user;
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },
  clearUser: () =>
    set({
      user: null,
      error: null,
      isLoading: false,
    }),
}));

export default useUserStore;

