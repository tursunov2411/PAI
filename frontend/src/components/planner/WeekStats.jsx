import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDurationLabel } from "@/lib/utils";

function WeekStats({ stats }) {
  const plannedMinutes = Math.round((stats?.totalHoursScheduled || 0) * 60);
  const doneMinutes = Math.round((stats?.totalHoursCompleted || 0) * 60);
  const completionRate = stats?.completionRate || 0;
  const topGoal = stats?.hoursPerGoal?.[0];

  return (
    <section className="glass-panel p-5">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1.2fr_1fr_1fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Hours Planned</p>
          <p className="mt-3 text-2xl font-semibold text-text-primary">
            {getDurationLabel(plannedMinutes)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Hours Done</p>
          <p className="mt-3 text-2xl font-semibold text-text-primary">
            {getDurationLabel(doneMinutes)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Completion</p>
          <p className="mt-3 text-2xl font-semibold text-text-primary">{completionRate}%</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Status</p>
          <div className="mt-3">
            <Badge variant={completionRate >= 60 ? "accent" : "warning"}>
              {completionRate >= 60 ? "On track" : "Behind"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Progress value={completionRate} />
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
          <span>
            Most studied subject:{" "}
            <span className="font-medium text-text-primary">{topGoal?.title || "Not enough data yet"}</span>
          </span>
          <span>
            Best day:{" "}
            <span className="font-medium text-text-primary">
              {stats?.bestStudyDay?.date || "No completed blocks yet"}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

export default WeekStats;
