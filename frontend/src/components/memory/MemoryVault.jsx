import { useEffect, useState } from "react";
import useMemoryStore from "@/store/useMemoryStore";
import { useDebounce } from "@/hooks/useDebounce";
import ImportPanel from "@/components/memory/ImportPanel";
import MemoryList from "@/components/memory/MemoryList";
import MemorySearch from "@/components/memory/MemorySearch";
import MemoryStats from "@/components/memory/MemoryStats";

function MemoryVault() {
  const stats = useMemoryStore((state) => state.stats);
  const filters = useMemoryStore((state) => state.filters);
  const fetchMemories = useMemoryStore((state) => state.fetchMemories);
  const fetchStats = useMemoryStore((state) => state.fetchStats);
  const searchMemories = useMemoryStore((state) => state.searchMemories);
  const clearSearchResults = useMemoryStore((state) => state.clearSearchResults);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchMemories();
  }, [
    fetchMemories,
    filters.category,
    filters.dateFrom,
    filters.dateTo,
    filters.limit,
    filters.page,
    filters.source,
  ]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchMemories(debouncedQuery);
      return;
    }

    clearSearchResults();
  }, [clearSearchResults, debouncedQuery, searchMemories]);

  return (
    <div className="space-y-8">
      <MemoryStats stats={stats} />
      <MemorySearch query={query} onQueryChange={setQuery} />
      <ImportPanel />
      <MemoryList query={query} onQueryChange={setQuery} />
    </div>
  );
}

export default MemoryVault;

