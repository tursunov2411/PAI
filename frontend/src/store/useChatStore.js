import { create } from "zustand";
import api from "@/lib/api";

const initialCostEstimate = {
  estimatedTokens: 0,
  estimatedCost: 0,
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const appendTokenToStreamingMessage = (messages, token) =>
  messages.map((message, index) =>
    index === messages.length - 1 && message.id === "streaming-assistant"
      ? { ...message, content: `${message.content}${token}` }
      : message,
  );

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isStreaming: false,
  selectedModel: "claude-sonnet",
  suggestions: [],
  lastRetrievedMemories: [],
  pinnedGoal: null,
  tokenCostEstimate: initialCostEstimate,
  error: null,
  fetchConversations: async () => {
    set({
      isLoadingConversations: true,
      error: null,
    });

    try {
      const response = await api.get("/api/chat/conversations");
      set({
        conversations: response.data.conversations || [],
        isLoadingConversations: false,
      });
      return response.data.conversations || [];
    } catch (error) {
      set({
        isLoadingConversations: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  loadConversation: async (conversationId) => {
    if (!conversationId) {
      set({
        activeConversationId: null,
        messages: [],
      });
      return null;
    }

    set({
      isLoadingMessages: true,
      error: null,
    });

    try {
      const response = await api.get(`/api/chat/${conversationId}`);
      const conversation = response.data.conversation;

      set({
        activeConversationId: conversation.id,
        messages: conversation.messages || [],
        selectedModel: conversation.model || "claude-sonnet",
        isLoadingMessages: false,
        pinnedGoal: null,
      });

      return conversation;
    } catch (error) {
      set({
        isLoadingMessages: false,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  createConversation: (options = {}) =>
    set({
      activeConversationId: null,
      messages: [],
      error: null,
      tokenCostEstimate: initialCostEstimate,
      lastRetrievedMemories: [],
      ...(options.pinnedGoal !== undefined ? { pinnedGoal: options.pinnedGoal } : {}),
    }),
  sendMessage: async ({ message }) => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return null;
    }

    const state = get();
    const optimisticUserMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: trimmedMessage,
      model: state.selectedModel,
      createdAt: new Date().toISOString(),
    };
    const optimisticAssistantMessage = {
      id: "streaming-assistant",
      role: "assistant",
      content: "",
      model: state.selectedModel,
      createdAt: new Date().toISOString(),
    };

    set({
      isStreaming: true,
      error: null,
      messages: [...state.messages, optimisticUserMessage, optimisticAssistantMessage],
    });

    try {
      const response = await fetch(`${api.defaults.baseURL}/api/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
          conversationId: state.activeConversationId,
          model: state.selectedModel,
          goalId: state.pinnedGoal?.id || null,
        }),
      });

      if (!response.ok || !response.body) {
        const fallbackText = await response.text();
        throw new Error(fallbackText || "Failed to send message.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPayload = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((line) => line.startsWith("data: "));

          if (!dataLine) {
            continue;
          }

          const payload = JSON.parse(dataLine.slice(6));

          if (payload.type === "conversation") {
            set((current) => ({
              activeConversationId: payload.conversationId,
              selectedModel: payload.model || current.selectedModel,
              pinnedGoal: payload.pinnedGoal || current.pinnedGoal,
            }));
          }

          if (payload.type === "context") {
            set({
              lastRetrievedMemories: payload.memories || [],
              tokenCostEstimate: payload.costEstimate || initialCostEstimate,
            });
          }

          if (payload.type === "token") {
            set((current) => ({
              messages: appendTokenToStreamingMessage(current.messages, payload.token || ""),
            }));
          }

          if (payload.type === "done") {
            finalPayload = payload;
            set((current) => ({
              isStreaming: false,
              messages: current.messages.map((message) =>
                message.id === "streaming-assistant"
                  ? payload.assistantMessage
                  : message,
              ),
              activeConversationId: payload.conversationId || current.activeConversationId,
            }));
          }

          if (payload.type === "error") {
            throw new Error(payload.message || "Streaming failed.");
          }
        }
      }

      await Promise.all([get().fetchConversations(), get().fetchSuggestions()]);
      return finalPayload;
    } catch (error) {
      set((current) => ({
        isStreaming: false,
        error: getErrorMessage(error),
        messages: current.messages.filter((message) => message.id !== "streaming-assistant"),
      }));
      throw error;
    }
  },
  deleteConversation: async (conversationId) => {
    try {
      await api.delete(`/api/chat/${conversationId}`);

      set((state) => ({
        conversations: state.conversations.filter(
          (conversation) => conversation.id !== conversationId,
        ),
        ...(state.activeConversationId === conversationId
          ? {
              activeConversationId: null,
              messages: [],
              lastRetrievedMemories: [],
              tokenCostEstimate: initialCostEstimate,
            }
          : {}),
      }));
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  updateConversationTitle: async (conversationId, title) => {
    try {
      const response = await api.put(`/api/chat/${conversationId}/title`, { title });

      set((state) => ({
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, title: response.data.conversation.title }
            : conversation,
        ),
      }));

      return response.data.conversation;
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  setModel: (selectedModel) => set({ selectedModel }),
  fetchSuggestions: async () => {
    try {
      const response = await api.get("/api/chat/suggestions");
      set({
        suggestions: response.data.suggestions || [],
      });
      return response.data.suggestions || [];
    } catch (error) {
      set({
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
  setPinnedGoal: (goal) =>
    set({
      pinnedGoal: goal,
    }),
  clearPinnedGoal: () =>
    set({
      pinnedGoal: null,
    }),
}));

export default useChatStore;
