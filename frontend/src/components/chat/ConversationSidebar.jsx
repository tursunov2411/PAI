import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import useChatStore from "@/store/useChatStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRelativeTime, getModelMeta } from "@/lib/utils";

function ConversationSidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
}) {
  const [query, setQuery] = useState("");
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const isLoadingConversations = useChatStore((state) => state.isLoadingConversations);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      conversation.title?.toLowerCase().includes(normalizedQuery),
    );
  }, [conversations, query]);

  const handleDelete = async (event, conversationId) => {
    event.stopPropagation();

    try {
      await deleteConversation(conversationId);
      toast.success("Conversation deleted.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not delete conversation.");
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Conversations</CardTitle>
          <Button size="sm" onClick={onNewChat}>
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-11"
            placeholder="Search conversations"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoadingConversations ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-text-muted">
            Loading conversations...
          </div>
        ) : filteredConversations.length ? (
          filteredConversations.map((conversation) => {
            const model = getModelMeta(conversation.model);
            const Icon = model.icon;
            const isActive = conversation.id === activeConversationId;

            return (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectConversation(conversation.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectConversation(conversation.id);
                  }
                }}
                className={`group w-full cursor-pointer rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? "border-accent/40 bg-accent/10 shadow-glow"
                    : "border-white/8 bg-black/20 hover:border-white/16 hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {conversation.title || "New conversation"}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {formatRelativeTime(conversation.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => handleDelete(event, conversation.id)}
                    className="rounded-full p-1.5 text-text-muted opacity-0 transition hover:bg-error/10 hover:text-error group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge className={`border ${model.className}`}>
                    <Icon className="mr-1 h-3 w-3" />
                    {model.shortLabel}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    {conversation.messageCount} messages
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-text-muted">
            No conversations yet. Start a new one.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ConversationSidebar;
