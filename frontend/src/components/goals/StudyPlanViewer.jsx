import { useState } from "react";
import { ChevronDown, Download, Milestone, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StudyPlanViewer({ goal, onRegenerate, isGenerating }) {
  const [expandedWeeks, setExpandedWeeks] = useState(
    () => new Set([goal.studyPlan?.weeklyPlan?.[0]?.week || 1]),
  );

  const toggleWeek = (weekNumber) => {
    setExpandedWeeks((current) => {
      const next = new Set(current);

      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }

      return next;
    });
  };

  if (!goal.studyPlan) {
    return null;
  }

  return (
    <Card className="mt-4 border-accent/10 bg-black/10">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-xl">Study Plan Timeline</CardTitle>
          <p className="mt-1 text-sm text-text-muted">
            Structured weekly progression for {goal.title}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onRegenerate} disabled={isGenerating}>
            <RotateCcw className="h-4 w-4" />
            {isGenerating ? "Regenerating..." : "Regenerate Plan"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.alert("PDF export is queued for a later week.")}
          >
            <Download className="h-4 w-4" />
            Export as PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {goal.studyPlan.weeklyPlan?.map((week) => {
            const isExpanded = expandedWeeks.has(week.week);

            return (
              <div
                key={week.week}
                className="rounded-2xl border border-white/8 bg-surface/80 p-4"
              >
                <button
                  type="button"
                  onClick={() => toggleWeek(week.week)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-accent">
                      Week {week.week}
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-text-primary">
                      {week.theme}
                    </h4>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-text-muted transition ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {isExpanded ? (
                  <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                    {week.dailyTasks?.map((task, index) => (
                      <div
                        key={`${task.day}-${index}`}
                        className="rounded-2xl border border-white/6 bg-black/20 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{task.day}</Badge>
                          <Badge>{task.duration}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-text-primary">{task.task}</p>
                        {task.resources?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {task.resources.map((resource, resourceIndex) =>
                              typeof resource === "string" ? (
                                <Badge key={`${resource}-${resourceIndex}`}>{resource}</Badge>
                              ) : null,
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {goal.studyPlan.milestones?.length ? (
          <div className="rounded-2xl border border-white/8 bg-surface/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Milestone className="h-4 w-4 text-accent" />
              <h4 className="text-base font-semibold text-text-primary">Milestones</h4>
            </div>
            <div className="space-y-2">
              {goal.studyPlan.milestones.map((milestone, index) => (
                <div
                  key={`${milestone.week}-${index}`}
                  className="flex items-start gap-3 rounded-2xl border border-white/6 bg-black/20 p-3"
                >
                  <Badge>Week {milestone.week}</Badge>
                  <p className="text-sm text-text-primary">{milestone.milestone}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {goal.studyPlan.recommendedResources?.length ? (
          <div className="rounded-2xl border border-white/8 bg-surface/80 p-4">
            <h4 className="text-base font-semibold text-text-primary">Recommended Resources</h4>
            <div className="mt-3 space-y-3">
              {goal.studyPlan.recommendedResources.map((resource, index) => (
                <div
                  key={`${resource.title}-${index}`}
                  className="rounded-2xl border border-white/6 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-text-primary">{resource.title}</p>
                    <Badge>{resource.type}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">{resource.why}</p>
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm text-accent underline underline-offset-4"
                    >
                      Open resource
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default StudyPlanViewer;
