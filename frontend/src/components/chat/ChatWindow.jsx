import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import ReactMarkdown from "react-markdown";
import {
  Bookmark,
  Copy,
  Link2,
  LoaderCircle,
  Paperclip,
  SendHorizontal,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import useChatStore from "@/store/useChatStore";
import useGoalStore from "@/store/useGoalStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import MemoryIndicator from "@/components/chat/MemoryIndicator";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  cn,
  formatCost,
  formatRelativeTime,
  getModelMeta,
  splitSuggestedNextAction,
} from "@/lib/utils";

const modelOptions = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "gemini-pro", label: "Gemini Pro" },
];

const markdownComponents = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-6 text-text-primary">{children}</li>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-accent">{children}</code>
    ) : (
      <code className="block overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-accent">
        {children}
      </code>
    ),
  h1: ({ children }) => <h1 className="mb-3 text-xl font-semibold text-text-primary">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 text-lg font-semibold text-text-primary">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 text-base font-semibold text-text-primary">{children}</h3>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-4">
      {children}
    </a>
  ),
};

function ChatWindow({ draft, onDraftChange, getToken }) {
  const localTextareaRef = useRef(null);
  const bottomRef = useRef(null);
  const { getToken: hookGetToken } = useAuth();
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const messages = useChatStore((state) => state.messages);
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setModel = useChatStore((state) => state.setModel);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const updateConversationTitle = useChatStore((state) => state.updateConversationTitle);
  const pinnedGoal = useChatStore((state) => state.pinnedGoal);
  const setPinnedGoal = useChatStore((state) => state.setPinnedGoal);
  const clearPinnedGoal = useChatStore((state) => state.clearPinnedGoal);
  const lastRetrievedMemories = useChatStore((state) => state.lastRetrievedMemories);
  const tokenCostEstimate = useChatStore((state) => state.tokenCostEstimate);
  const goals = useGoalStore((state) => state.goals);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);
  const [titleDraft, setTitleDraft] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) || null,
    [activeConversationId, conversations],
  );

  const displayTitle = activeConversation?.title || "New conversation";
  const currentModelMeta = getModelMeta(selectedModel);
  const CurrentModelIcon = currentModelMeta.icon;

  useEffect(() => {
    setTitleDraft(displayTitle);
  }, [displayTitle]);

  useEffect(() => {
    if (localTextareaRef.current) {
      localTextareaRef.current.style.height = "0px";
      localTextareaRef.current.style.height = `${Math.min(
        localTextareaRef.current.scrollHeight,
        140,
      )}px`;
    }
  }, [draft]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isStreaming, messages]);

  const handleSend = async () => {
    if (!draft.trim() || isStreaming) {
      return;
    }

    try {
      await sendMessage({
        message: draft,
        getToken: getToken || hookGetToken,
      });
      onDraftChange("");
    } catch (error) {
      toast.error(error?.message || "The assistant could not reply.");
    }
  };

  const handleSaveTitle = async () => {
    if (!activeConversationId || !titleDraft.trim() || titleDraft.trim() === displayTitle) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await updateConversationTitle(activeConversationId, titleDraft.trim());
      toast.success("Conversation title updated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not update title.");
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleBookmark = async (content) => {
    try {
      await api.post("/api/memory/import/manual", {
        text: content,
        category: pinnedGoal?.category || "Ideas",
      });
      toast.success("Assistant response saved to Memory Vault.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save to memory.");
    }
  };

  const handleCopy = async (content) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard.");
  };

  const handleOpenAttach = async () => {
    if (!goals.length) {
      try {
        await fetchGoals({
          status: "",
          category: "",
          priority: "",
        });
      } catch (_error) {
        // Goals page handles detailed errors already.
      }
    }

    setAttachOpen(true);
  };

  return (
    <Card className="flex min-h-[calc(100vh-10rem)] flex-col overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            {isEditingTitle ? (
              <Input
                value={titleDraft}
                autoFocus
                onBlur={handleSaveTitle}
                onChange={(event) => setTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSaveTitle();
                  }
                }}
                className="max-w-lg"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="truncate text-left text-2xl font-semibold text-text-primary"
              >
                {displayTitle}
              </button>
            )}
            <CardDescription className="mt-2">
              {activeConversation
                ? `Updated ${formatRelativeTime(activeConversation.updatedAt)}`
                : "Start a fresh conversation with your personalized AI clone."}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`border ${currentModelMeta.className}`}>
              <CurrentModelIcon className="mr-1 h-3 w-3" />
              {currentModelMeta.label}
            </Badge>
            <Select
              value={selectedModel}
              onChange={(event) => setModel(event.target.value)}
              className="w-[180px]"
            >
              {modelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
            <Badge>
              ~{tokenCostEstimate.estimatedTokens || 0} tokens /{" "}
              {formatCost(tokenCostEstimate.estimatedCost)}
            </Badge>
          </div>
        </div>

        {pinnedGoal ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3">
            <span className="text-sm text-text-primary">
              Pinned goal context: <span className="font-medium">{pinnedGoal.title}</span>
            </span>
            <Badge>{pinnedGoal.category}</Badge>
            <Button variant="ghost" size="sm" onClick={clearPinnedGoal}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {isLoadingMessages ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-text-muted">
              Loading conversation...
            </div>
          ) : messages.length ? (
            messages.map((message) => {
              const isUser = message.role === "user";
              const modelMeta = getModelMeta(message.model || selectedModel);
              const ModelIcon = modelMeta.icon;
              const { body, nextAction } = splitSuggestedNextAction(message.content);

              return (
                <div
                  key={message.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-3xl rounded-3xl border px-5 py-4 shadow-[0_12px_40px_rgba(3,4,8,0.22)]",
                      isUser
                        ? "border-accent/30 bg-accent/12 text-text-primary"
                        : "border-white/8 bg-surface/90",
                    )}
                  >
                    {!isUser ? (
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`border ${modelMeta.className}`}>
                            <ModelIcon className="mr-1 h-3 w-3" />
                            {modelMeta.label}
                          </Badge>
                          <span className="text-xs text-text-muted">
                            {formatRelativeTime(message.createdAt)}
                          </span>
                        </div>
                        {message.id !== "streaming-assistant" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(message.content)}
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBookmark(message.content)}
                            >
                              <Bookmark className="h-4 w-4" />
                              Bookmark
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    ) : body ? (
                      <div className="prose prose-invert max-w-none text-sm leading-6">
                        <ReactMarkdown components={markdownComponents}>
                          {body}
                        </ReactMarkdown>
                        {isStreaming && message.id === "streaming-assistant" ? (
                          <span className="inline-flex items-center gap-1 text-accent">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                            <span className="h-2 w-2 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
                            <span className="h-2 w-2 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
                          </span>
                        ) : null}
                      </div>
                    ) : isStreaming && message.id === "streaming-assistant" ? (
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    ) : null}

                    {!isUser && nextAction ? (
                      <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/8 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-accent">
                          Suggested next action
                        </p>
                        <p className="mt-2 text-sm text-text-primary">{nextAction}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
              <div className="max-w-lg space-y-3">
                <h3 className="text-2xl font-semibold text-text-primary">
                  Start chatting with your AI clone
                </h3>
                <p className="text-sm text-text-muted">
                  Ask about your plans, have the assistant recall past memories, or pin a
                  goal to focus the conversation.
                </p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/5 bg-background/40 px-6 py-5">
          <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
            <Textarea
              ref={localTextareaRef}
              value={draft}
              disabled={isStreaming}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Ask anything about your memories, goals, or next steps..."
              className="max-h-[140px] min-h-[64px] resize-none border-0 bg-transparent px-0 py-0 focus:border-transparent focus:ring-0"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleOpenAttach}>
                  <Paperclip className="h-4 w-4" />
                  Attach context
                </Button>
                {pinnedGoal ? (
                  <Badge className="border border-accent/20 bg-accent/10 text-accent">
                    <Link2 className="mr-1 h-3 w-3" />
                    {pinnedGoal.title}
                  </Badge>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">{draft.length} characters</span>
                <Button onClick={handleSend} disabled={!draft.trim() || isStreaming}>
                  <SendHorizontal className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <MemoryIndicator memories={lastRetrievedMemories} />
          </div>
        </div>
      </CardContent>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach a goal to this conversation</DialogTitle>
            <DialogDescription>
              Pin one active goal so the assistant treats it as the primary context.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {goals.length ? (
              goals.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => {
                    setPinnedGoal(goal);
                    setAttachOpen(false);
                    toast.success(`Pinned "${goal.title}" to this conversation.`);
                  }}
                  className="w-full rounded-2xl border border-white/8 bg-black/20 p-4 text-left transition hover:border-accent/30 hover:bg-accent/8"
                >
                  <p className="text-sm font-medium text-text-primary">{goal.title}</p>
                  <p className="mt-1 text-sm text-text-muted">{goal.category}</p>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-text-muted">
                Create a goal first, then pin it here as conversation context.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ChatWindow;
