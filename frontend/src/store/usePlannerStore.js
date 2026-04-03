import { create } from "zustand";
import api from "@/lib/api";
import { getWeekStart, toDateKey } from "@/lib/utils";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const normalizeWeekStart = (value) => toDateKey(getWeekStart(value || new Date()));

const upsertBlock = (blocks, nextBlock) =>
  blocks.some((block) => block.id === nextBlock.id)
    ? blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block))
    : [...blocks, nextBlock];

const groupBlocksByDate = (blocks = []) =>
  blocks.reduce((accumulator, block) => {
    const key = toDateKey(block.date);
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(block);
    return accumulator;
  }, {});

const usePlannerStore = create((set, get) => ({
  weekStart: normalizeWeekStart(new Date()),
  blocks: [],
  groupedBlocks: {},
  isLoading: false,
  isAutoScheduling: false,
  pendingBlocks: [],
  stats: null,
  error: null,
  fetchWeek: async (startDate) => {
    const weekStart = normalizeWeekStart(startDate || get().weekStart);
    set({
      isLoading: true,
      error: null,
      weekStart,
    });

    try {
      const response = await api.get("/api/planner/week", {
        params: {
          startDate: weekStart,
        },
      });
      const blocks = response.data.blocks || [];

      set({
        blocks,
        groupedBlocks: response.data.groupedBlocks || groupBlocksByDate(blocks),
        isLoading: false,
      });

      return blocks;
    } catch (error) {
      set({
        isLoading: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  createBlock: async (payload) => {
    try {
      const response = await api.post("/api/planner/block", payload);
      await Promise.all([get().fetchWeek(payload.date || get().weekStart), get().fetchStats()]);
      return response.data.block;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  updateBlock: async (blockId, payload) => {
    try {
      const response = await api.put(`/api/planner/block/${blockId}`, payload);
      const block = response.data.block;

      set((state) => ({
        blocks: upsertBlock(state.blocks, block),
        groupedBlocks: groupBlocksByDate(upsertBlock(state.blocks, block)),
      }));

      await Promise.all([get().fetchWeek(payload.date || get().weekStart), get().fetchStats()]);
      return block;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  deleteBlock: async (blockId) => {
    try {
      await api.delete(`/api/planner/block/${blockId}`);
      await Promise.all([get().fetchWeek(), get().fetchStats()]);
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  updateStatus: async (blockId, status) => {
    try {
      const response = await api.put(`/api/planner/block/${blockId}/status`, { status });
      await Promise.all([get().fetchWeek(), get().fetchStats()]);
      return response.data;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  autoSchedule: async (weekStartDate) => {
    set({
      isAutoScheduling: true,
      error: null,
    });

    try {
      const response = await api.post("/api/planner/auto-schedule", {
        weekStartDate: normalizeWeekStart(weekStartDate || get().weekStart),
      });

      set({
        pendingBlocks: response.data.previewBlocks || [],
        isAutoScheduling: false,
      });

      return response.data.previewBlocks || [];
    } catch (error) {
      set({
        isAutoScheduling: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  confirmSchedule: async (blocks = get().pendingBlocks) => {
    try {
      const response = await api.post("/api/planner/auto-schedule", {
        weekStartDate: get().weekStart,
        confirm: true,
        blocks,
      });

      set({
        pendingBlocks: [],
      });

      await Promise.all([get().fetchWeek(), get().fetchStats()]);
      return response.data.blocks || [];
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  fetchStats: async (range = {}) => {
    try {
      const response = await api.get("/api/planner/stats", {
        params: range,
      });

      set({
        stats: response.data,
      });

      return response.data;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  setWeekStart: (weekStart) =>
    set({
      weekStart: normalizeWeekStart(weekStart),
    }),
  setPendingBlocks: (pendingBlocks) =>
    set({
      pendingBlocks,
    }),
}));

export default usePlannerStore;
