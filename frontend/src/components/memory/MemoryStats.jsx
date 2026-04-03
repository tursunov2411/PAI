import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayDate, formatMonthLabel } from "@/lib/utils";

const sourceStyles = {
  chatgpt: "bg-chatgpt/12 text-chatgpt border-chatgpt/30",
  claude: "bg-claude/12 text-claude border-claude/30",
  gemini: "bg-gemini/12 text-gemini border-gemini/30",
  manual: "bg-manual/12 text-manual border-manual/30",
};

function MemoryStats({ stats }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Memory Vault Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
                Total memories
              </p>
              <p className="mt-3 text-4xl font-semibold text-text-primary">
                {stats?.totalMemories || 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
                Date range
              </p>
              <p className="mt-3 text-sm font-medium text-text-primary">
                {stats?.dateRange?.oldest
                  ? `${formatDisplayDate(stats.dateRange.oldest, {
                      month: "short",
                      year: "numeric",
                    })} – ${formatDisplayDate(stats.dateRange.newest, {
                      month: "short",
                      year: "numeric",
                    })}`
                  : "No memories yet"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
                Token estimate
              </p>
              <p className="mt-3 text-sm font-medium text-text-primary">
                {stats?.totalTokenEstimate?.toLocaleString() || 0} tokens
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(stats?.bySource || {}).map(([source, count]) => (
              <Badge key={source} className={`border ${sourceStyles[source] || ""}`}>
                {source.toUpperCase()} · {count}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(stats?.byCategory || {}).map(([category, count]) => (
              <Badge key={category}>{category} · {count}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Memories per month</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {stats?.monthlyCounts?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyCounts}>
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthLabel}
                  tick={{ fill: "#8888aa", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "#13131a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px",
                    color: "#f0f0ff",
                  }}
                  labelFormatter={formatMonthLabel}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#7c6af7" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-sm text-text-muted">
              Import some memories to populate the chart.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default MemoryStats;

