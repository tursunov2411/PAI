import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import WeekGrid from "@/components/planner/WeekGrid";
import BlockForm from "@/components/planner/BlockForm";
import BlockDetail from "@/components/planner/BlockDetail";
import WeekStats from "@/components/planner/WeekStats";
import AutoScheduleModal from "@/components/planner/AutoScheduleModal";
import useGoalStore from "@/store/useGoalStore";
import usePlannerStore from "@/store/usePlannerStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addDays, formatWeekRange, getWeekStart, minutesToTime, timeToMinutes } from "@/lib/utils";

function Planner() {
  const goals = useGoalStore((state) => state.goals);
  const fetchGoals = useGoalStore((state) => state.fetchGoals);
  const weekStart = usePlannerStore((state) => state.weekStart);
  const blocks = usePlannerStore((state) => state.blocks);
  const stats = usePlannerStore((state) => state.stats);
  const fetchWeek = usePlannerStore((state) => state.fetchWeek);
  const fetchStats = usePlannerStore((state) => state.fetchStats);
  const autoSchedule = usePlannerStore((state) => state.autoSchedule);
  const updateBlock = usePlannerStore((state) => state.updateBlock);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [autoModalOpen, setAutoModalOpen] = useState(false);

  const statsRange = useMemo(() => {
    const start = getWeekStart(weekStart);
    const end = addDays(start, 6);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [weekStart]);

  useEffect(() => {
    fetchGoals({
      status: "",
      category: "",
      priority: "",
    }).catch(() => {
      // Goals page owns detailed empty/error states.
    });
  }, [fetchGoals]);

  useEffect(() => {
    fetchWeek(weekStart).catch((error) => {
      toast.error(error?.response?.data?.message || "Could not load the planner.");
    });
    fetchStats(statsRange).catch(() => {
      // Keep page usable even if stats fail.
    });
  }, [fetchStats, fetchWeek, statsRange, weekStart]);

  const openQuickAdd = ({ date, startTime }) => {
    const endTime = minutesToTime(timeToMinutes(startTime) + 60);
    setEditingBlock({
      title: "",
      subject: "",
      date,
      startTime,
      endTime,
      goalId: "",
      notes: "",
      color: "#7c6af7",
    });
  };

  const moveBlock = async (block, nextSlot) => {
    try {
      await updateBlock(block.id, {
        date: nextSlot.date,
        startTime: nextSlot.startTime,
        endTime: nextSlot.endTime,
      });
      toast.success("Study block moved.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not move study block.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Badge variant="accent">Week 3 Live</Badge>
            <h1 className="mt-4 text-3xl font-semibold text-text-primary">Study Planner</h1>
            <p className="mt-2 text-sm text-text-muted">
              Drag blocks across the week, mark sessions done, and let AI suggest a full schedule.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => fetchWeek(addDays(getWeekStart(weekStart), -7))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev week
            </Button>
            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-text-primary">
              {formatWeekRange(weekStart)}
            </div>
            <Button
              variant="secondary"
              onClick={() => fetchWeek(addDays(getWeekStart(weekStart), 7))}
            >
              Next week
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={async () => {
                setAutoModalOpen(true);
                try {
                  await autoSchedule(weekStart);
                } catch (error) {
                  toast.error(error?.response?.data?.message || "Could not auto-schedule the week.");
                }
              }}
            >
              <Sparkles className="h-4 w-4" />
              Auto-Schedule Week
            </Button>
          </div>
        </div>
      </section>

      <WeekStats stats={stats} />

      <WeekGrid
        weekStart={weekStart}
        blocks={blocks}
        onCreateSlot={openQuickAdd}
        onOpenBlock={setSelectedBlock}
        onMoveBlock={moveBlock}
      />

      <BlockForm
        open={Boolean(editingBlock)}
        block={editingBlock}
        goals={goals}
        onClose={() => setEditingBlock(null)}
      />

      <BlockDetail
        block={selectedBlock}
        open={Boolean(selectedBlock)}
        onOpenChange={(open) => !open && setSelectedBlock(null)}
        onEdit={setEditingBlock}
      />

      <AutoScheduleModal
        open={autoModalOpen}
        onOpenChange={setAutoModalOpen}
        weekStart={weekStart}
      />
    </div>
  );
}

export default Planner;
