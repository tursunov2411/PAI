import { create } from "zustand";
import api from "@/lib/api";

const defaultFilters = {
  source: "",
  category: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 20,
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const useMemoryStore = create((set, get) => ({
  memories: [],
  total: 0,
  stats: null,
  searchResults: [],
  isLoading: false,
  isSearching: false,
  isImporting: false,
  importProgress: 0,
  error: null,
  filters: defaultFilters,
  fetchMemories: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get("/api/memory/list", {
        params: get().filters,
      });

      set((state) => ({
        memories: response.data.memories || [],
        total: response.data.total || 0,
        isLoading: false,
        filters: {
          ...state.filters,
          page: response.data.page || state.filters.page,
          limit: response.data.limit || state.filters.limit,
        },
      }));

      return response.data;
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  importFile: async (type, payload) => {
    set({
      isImporting: true,
      importProgress: 8,
      error: null,
    });

    try {
      let response;

      if (type === "manual") {
        response = await api.post("/api/memory/import/manual", payload);
        set({ importProgress: 100 });
      } else {
        const formData = new FormData();
        formData.append("export", payload.file);

        response = await api.post(`/api/memory/import/${type}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (event) => {
            if (!event.total) {
              return;
            }

            const progress = Math.round((event.loaded / event.total) * 90) + 5;
            set({ importProgress: progress });
          },
        });

        set({ importProgress: 100 });
      }

      await Promise.all([get().fetchMemories(), get().fetchStats()]);
      return response.data;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    } finally {
      window.setTimeout(() => {
        set({
          isImporting: false,
          importProgress: 0,
        });
      }, 300);
    }
  },
  searchMemories: async (query) => {
    if (!query.trim()) {
      set({
        searchResults: [],
        isSearching: false,
      });
      return [];
    }

    set({
      isSearching: true,
      error: null,
    });

    try {
      const response = await api.post("/api/memory/search", { query });
      set({
        searchResults: response.data.results || [],
        isSearching: false,
      });
      return response.data.results || [];
    } catch (error) {
      set({
        isSearching: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  clearSearchResults: () =>
    set({
      searchResults: [],
      isSearching: false,
    }),
  deleteMemory: async (memoryId) => {
    await api.delete(`/api/memory/${memoryId}`);

    set((state) => ({
      searchResults: state.searchResults.filter((memory) => memory.id !== memoryId),
    }));

    await Promise.all([get().fetchMemories(), get().fetchStats()]);
  },
  setFilters: (partial) =>
    set((state) => {
      const keys = Object.keys(partial);
      const resetPage = keys.some((key) => key !== "page");

      return {
        filters: {
          ...state.filters,
          ...partial,
          page: partial.page ?? (resetPage ? 1 : state.filters.page),
        },
      };
    }),
  fetchStats: async () => {
    try {
      const response = await api.get("/api/memory/stats");
      set({
        stats: response.data.stats,
      });
      return response.data.stats;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
}));

export default useMemoryStore;

