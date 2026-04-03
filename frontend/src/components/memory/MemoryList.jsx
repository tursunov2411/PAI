import { CalendarRange, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import useMemoryStore from "@/store/useMemoryStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { formatDisplayDate } from "@/lib/utils";

const categories = ["", "Goals", "Study", "Personal", "Ideas", "Plans"];

const sourceStyles = {
  chatgpt: "border-chatgpt/30 bg-chatgpt/12 text-chatgpt",
  claude: "border-claude/30 bg-claude/12 text-claude",
  gemini: "border-gemini/30 bg-gemini/12 text-gemini",
  manual: "border-manual/30 bg-manual/12 text-manual",
};

function MemoryList({ query, onQueryChange }) {
  const memories = useMemoryStore((state) => state.memories);
  const total = useMemoryStore((state) => state.total);
  const filters = useMemoryStore((state) => state.filters);
  const setFilters = useMemoryStore((state) => state.setFilters);
  const isLoading = useMemoryStore((state) => state.isLoading);
  const searchResults = useMemoryStore((state) => state.searchResults);
  const isSearching = useMemoryStore((state) => state.isSearching);
  const deleteMemory = useMemoryStore((state) => state.deleteMemory);
  const [expandedIds, setExpandedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const memoryItems = useMemo(
    () => (query.trim() ? searchResults : memories),
    [memories, query, searchResults],
  );

  const toggleExpanded = (id) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteMemory(deleteTarget.id);
      toast.success("Memory deleted.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete memory.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Stored Memories</CardTitle>
              <p className="mt-1 text-sm text-text-muted">
                Filter imported knowledge, search semantically, and manage individual entries.
              </p>
            </div>
            <div className="text-sm text-text-muted">
              {query.trim()
                ? `${searchResults.length} search result${searchResults.length === 1 ? "" : "s"}`
                : `${total} total ${total === 1 ? "memory" : "memories"}`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px_170px_170px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="pl-11"
                placeholder="Search memories..."
              />
            </div>
            <Select
              value={filters.source}
              onChange={(event) => setFilters({ source: event.target.value })}
            >
              <SelectItem value="">All sources</SelectItem>
              <SelectItem value="chatgpt">ChatGPT</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </Select>
            <Select
              value={filters.category}
              onChange={(event) => setFilters({ category: event.target.value })}
            >
              {categories.map((category) => (
                <SelectItem key={category || "all"} value={category}>
                  {category || "All categories"}
                </SelectItem>
              ))}
            </Select>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters({ dateFrom: event.target.value })}
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters({ dateTo: event.target.value })}
            />
          </div>

          {isLoading || isSearching ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-text-muted">
              Loading memories...
            </div>
          ) : memoryItems.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {memoryItems.map((memory) => {
                const expanded = expandedIds.includes(memory.id);
                const text = expanded
                  ? memory.text
                  : `${memory.text.slice(0, 120)}${memory.text.length > 120 ? "..." : ""}`;

                return (
                  <div
                    key={memory.id}
                    className="rounded-3xl border border-white/8 bg-black/20 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`border ${sourceStyles[memory.source] || ""}`}>
                        {memory.source}
                      </Badge>
                      <Badge>{memory.category}</Badge>
                      <Badge>
                        <CalendarRange className="mr-1 h-3 w-3" />
                        {formatDisplayDate(memory.date)}
                      </Badge>
                      {query.trim() ? (
                        <Badge variant="accent">
                          Similarity {(memory.score * 100).toFixed(1)}%
                        </Badge>
                      ) : null}
                    </div>

                    <p className="mt-4 text-sm leading-6 text-text-primary">{text}</p>
                    {memory.text.length > 120 ? (
                      <button
                        type="button"
                        className="mt-2 text-sm text-accent transition hover:text-accent-hover"
                        onClick={() => toggleExpanded(memory.id)}
                      >
                        {expanded ? "Show less" : "Show more"}
                      </button>
                    ) : null}

                    <div className="mt-5 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
                        {memory.createdAt
                          ? `Stored ${formatDisplayDate(memory.createdAt)}`
                          : "Stored memory"}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:bg-error/10 hover:text-error"
                        onClick={() => setDeleteTarget(memory)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-5 py-12 text-center text-sm text-text-muted">
              Your vault is empty. Import a ChatGPT or Claude export to get started.
            </div>
          )}

          {!query.trim() ? (
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-sm text-text-muted">
                Page {filters.page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters({ page: filters.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters({ page: filters.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this memory?</DialogTitle>
            <DialogDescription>
              This removes the memory from PostgreSQL and Pinecone. The action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Memory
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default MemoryList;
