import { create } from "zustand";
import api from "@/lib/api";

const defaultFilters = {
  goalId: "",
  tag: "",
  search: "",
  isPinned: "",
  page: 1,
  limit: 20,
  view: "grid",
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const upsertNote = (notes, nextNote) =>
  notes.some((note) => note.id === nextNote.id)
    ? notes.map((note) => (note.id === nextNote.id ? nextNote : note))
    : [nextNote, ...notes];

const useNoteStore = create((set, get) => ({
  notes: [],
  activeNote: null,
  tags: [],
  total: 0,
  filters: defaultFilters,
  isLoading: false,
  isSaving: false,
  aiResult: null,
  error: null,
  fetchNotes: async (overrides = {}) => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const filters = {
        ...get().filters,
        ...overrides,
      };
      const response = await api.get("/api/notes", {
        params: {
          ...(filters.goalId ? { goalId: filters.goalId } : {}),
          ...(filters.tag ? { tag: filters.tag } : {}),
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.isPinned !== "" ? { isPinned: filters.isPinned } : {}),
          page: filters.page || 1,
          limit: filters.limit || 20,
        },
      });

      set({
        notes: response.data.notes || [],
        total: response.data.total || 0,
        filters,
        isLoading: false,
      });

      return response.data.notes || [];
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  fetchNote: async (noteId) => {
    try {
      const response = await api.get(`/api/notes/${noteId}`);
      set({
        activeNote: response.data.note,
      });
      return response.data.note;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  createNote: async (payload = {}) => {
    set({
      isSaving: true,
      error: null,
    });

    try {
      const response = await api.post("/api/notes", payload);
      const note = response.data.note;

      set((state) => ({
        notes: upsertNote(state.notes, note),
        activeNote: note,
        isSaving: false,
      }));

      await Promise.all([get().fetchNotes(), get().fetchTags()]);
      return response.data;
    } catch (error) {
      set({
        isSaving: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  updateNote: async (noteId, payload) => {
    set({
      isSaving: true,
      error: null,
    });

    try {
      const response = await api.put(`/api/notes/${noteId}`, payload);
      const note = response.data.note;

      set((state) => ({
        notes: upsertNote(state.notes, note),
        activeNote: state.activeNote?.id === noteId ? note : state.activeNote,
        isSaving: false,
      }));

      await Promise.all([get().fetchNotes(), get().fetchTags()]);
      return response.data;
    } catch (error) {
      set({
        isSaving: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  deleteNote: async (noteId) => {
    try {
      const response = await api.delete(`/api/notes/${noteId}`);

      set((state) => ({
        notes: state.notes.filter((note) => note.id !== noteId),
        activeNote: state.activeNote?.id === noteId ? null : state.activeNote,
      }));

      await Promise.all([get().fetchNotes(), get().fetchTags()]);
      return response.data;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  pinNote: async (noteId) => {
    try {
      const response = await api.put(`/api/notes/${noteId}/pin`);

      set((state) => ({
        notes: upsertNote(state.notes, response.data.note),
        activeNote:
          state.activeNote?.id === noteId ? response.data.note : state.activeNote,
      }));

      await get().fetchNotes();
      return response.data.note;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  applyAI: async (noteId, action, payload = {}) => {
    set({
      aiResult: null,
      error: null,
    });

    try {
      const response = await api.post(`/api/notes/${noteId}/ai`, {
        action,
        ...payload,
      });

      set({
        aiResult: response.data.result,
      });

      return response.data.result;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  fetchTags: async () => {
    try {
      const response = await api.get("/api/notes/tags");
      set({
        tags: response.data.tags || [],
      });
      return response.data.tags || [];
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  setFilter: (partial) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial,
      },
    })),
  setActiveNote: (note) =>
    set({
      activeNote: note,
    }),
  clearAiResult: () =>
    set({
      aiResult: null,
    }),
}));

export default useNoteStore;
