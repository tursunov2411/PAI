import { Search, Sparkles } from "lucide-react";
import useMemoryStore from "@/store/useMemoryStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "@/lib/utils";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightText = (text, query) => {
  if (!query.trim()) {
    return text;
  }

  const pattern = query
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegex)
    .join("|");

  if (!pattern) {
    return text;
  }

  const matcher = new RegExp(`^(${pattern})$`, "i");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));

  return parts.map((part, index) =>
    matcher.test(part) ? (
      <mark key={`${part}-${index}`} className="rounded bg-accent/20 px-1 text-text-primary">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
};

function MemorySearch({ query, onQueryChange }) {
  const results = useMemoryStore((state) => state.searchResults);
  const isSearching = useMemoryStore((state) => state.isSearching);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Semantic Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="pl-11"
            placeholder="Ask for anything you've stored before..."
          />
        </div>

        {query.trim() ? (
          <div className="space-y-3">
            {isSearching ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-text-muted">
                Searching your vault...
              </div>
            ) : results.length ? (
              results.slice(0, 3).map((result) => (
                <div
                  key={result.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-text-muted">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      {(result.score * 100).toFixed(1)}% relevance
                    </div>
                    <span className="text-xs text-text-muted">
                      {formatDisplayDate(result.date)}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">
                    {highlightText(result.text.slice(0, 180), query)}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-chatgpt"
                      style={{ width: `${Math.min(100, Math.max(6, result.score * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-text-muted">
                No relevant memories found for that search yet.
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default MemorySearch;
