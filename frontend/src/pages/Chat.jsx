import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import SuggestionsPanel from "@/components/chat/SuggestionsPanel";
import useChatStore from "@/store/useChatStore";
import useGoalStore from "@/store/useGoalStore";

function Chat() {
  const location = useLocation();
  const [draft, setDraft] = useState("");
  const handledNavigationRef = useRef(null);
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const fetchSuggestions = useChatStore((state) => state.fetchSuggestions);
  const createConversation = useChatStore((state) => state.createConversation);
  const loadConversation = useChatStore((state) => state.loadConversation);
  const setPinnedGoal = useChatStore((state) => state.setPinnedGoal);
  const goals = useGoalStore((state) => state.goals);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);

  useEffect(() => {
    fetchConversations().catch((error) => {
      toast.error(error?.response?.data?.message || "Could not load conversations.");
    });

    fetchSuggestions().catch(() => {
      // Suggestions already have fallback behavior server-side.
    });

    fetchGoals({
      status: "",
      category: "",
      priority: "",
    }).catch(() => {
      // Goals page owns the detailed error handling.
    });
  }, [fetchConversations, fetchGoals, fetchSuggestions]);

  useEffect(() => {
    const goalId = location.state?.goalId;
    const prefill = location.state?.prefill;
    const forceNew = Boolean(location.state?.forceNew);
    const navigationKey = `${location.key}:${goalId || "none"}:${prefill || "none"}:${forceNew}`;

    if (handledNavigationRef.current === navigationKey) {
      return;
    }

    if (prefill) {
      setDraft(prefill);
    }

    if (!goalId) {
      handledNavigationRef.current = navigationKey;
      return;
    }

    const goal = goals.find((item) => item.id === goalId);

    if (!goal) {
      return;
    }

    setPinnedGoal(goal);

    if (forceNew) {
      createConversation({ pinnedGoal: goal });
    }
    
    handledNavigationRef.current = navigationKey;
  }, [createConversation, goals, location.key, location.state, setPinnedGoal]);

  const handleSelectConversation = async (conversationId) => {
    try {
      await loadConversation(conversationId);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not open that conversation.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={() => createConversation()}
        onSelectConversation={handleSelectConversation}
      />
      <ChatWindow draft={draft} onDraftChange={setDraft} />
      <SuggestionsPanel onUseSuggestion={setDraft} />
    </div>
  );
}

export default Chat;
