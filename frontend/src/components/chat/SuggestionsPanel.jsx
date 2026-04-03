import { ChevronDown, RefreshCcw, WandSparkles } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import useChatStore from "@/store/useChatStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SuggestionsPanel({ onUseSuggestion }) {
  const [collapsed, setCollapsed] = useState(false);
  const suggestions = useChatStore((state) => state.suggestions);
  const fetchSuggestions = useChatStore((state) => state.fetchSuggestions);

  const handleRefresh = async () => {
    try {
      await fetchSuggestions();
      toast.success("Suggestions refreshed.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not refresh suggestions.");
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Smart Suggestions</CardTitle>
          <p className="mt-1 text-sm text-text-muted">
            Proactive nudges based on goals, chats, and memory context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((current) => !current)}>
            <ChevronDown className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      {!collapsed ? (
        <CardContent className="space-y-3">
          {suggestions.length ? (
            suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.title}-${index}`}
                className="rounded-2xl border border-white/8 bg-black/20 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <WandSparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{suggestion.title}</p>
                    <p className="mt-1 text-sm text-text-muted">{suggestion.reason}</p>
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => onUseSuggestion(suggestion.prefill)}
                    >
                      Start this
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-text-muted">
              Send a message or create goals to unlock proactive suggestions.
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

export default SuggestionsPanel;
