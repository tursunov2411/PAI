import { ChevronDown, DatabaseZap } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDisplayDate } from "@/lib/utils";

function MemoryIndicator({ memories = [] }) {
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    if (!memories.length) {
      return "No memory context used yet.";
    }

    const bySource = memories.reduce((accumulator, memory) => {
      accumulator[memory.source] = (accumulator[memory.source] || 0) + 1;
      return accumulator;
    }, {});

    const firstSource = Object.keys(bySource)[0];
    const latestDate = memories[0]?.date;

    return `${memories.length} memories used from ${firstSource} (${formatDisplayDate(latestDate, {
      month: "short",
      year: "numeric",
    })})`;
  }, [memories]);

  return (
    <Card className="border-white/8 bg-black/20">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <DatabaseZap className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">Memory retrieval</p>
              <p className="text-xs text-text-muted">{summary}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((current) => !current)}>
            <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {expanded && memories.length ? (
          <div className="space-y-3">
            {memories.map((memory) => (
              <div
                key={memory.id || `${memory.source}-${memory.date}`}
                className="rounded-2xl border border-white/8 bg-surface/80 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge>{memory.source}</Badge>
                  <Badge>{memory.category}</Badge>
                  <Badge>{formatDisplayDate(memory.date)}</Badge>
                </div>
                <p className="text-sm text-text-primary">{memory.text}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default MemoryIndicator;

