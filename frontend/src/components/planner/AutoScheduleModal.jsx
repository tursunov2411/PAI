import toast from "react-hot-toast";
import usePlannerStore from "@/store/usePlannerStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate, formatTimeLabel } from "@/lib/utils";

function AutoScheduleModal({ open, onOpenChange, weekStart }) {
  const isAutoScheduling = usePlannerStore((state) => state.isAutoScheduling);
  const pendingBlocks = usePlannerStore((state) => state.pendingBlocks);
  const autoSchedule = usePlannerStore((state) => state.autoSchedule);
  const confirmSchedule = usePlannerStore((state) => state.confirmSchedule);
  const setPendingBlocks = usePlannerStore((state) => state.setPendingBlocks);

  const handleRegenerate = async () => {
    try {
      await autoSchedule(weekStart);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not generate a schedule.");
    }
  };

  const handleConfirm = async () => {
    try {
      await confirmSchedule();
      toast.success("Auto-scheduled blocks added to your planner.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not confirm the schedule.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Auto-Schedule Week</DialogTitle>
          <DialogDescription>
            AI is analyzing your goals and available time. Review the blocks before saving them.
          </DialogDescription>
        </DialogHeader>

        {isAutoScheduling ? (
          <div className="rounded-3xl border border-white/8 bg-black/20 px-6 py-16 text-center">
            <p className="text-lg font-medium text-text-primary">
              AI is analyzing your goals and calendar...
            </p>
            <p className="mt-2 text-sm text-text-muted">
              This usually takes a few seconds while the weekly plan is composed.
            </p>
          </div>
        ) : pendingBlocks.length ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="accent">{pendingBlocks.length} preview blocks</Badge>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleRegenerate}>
                  Regenerate
                </Button>
                <Button onClick={handleConfirm}>Confirm Schedule</Button>
              </div>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {pendingBlocks.map((block, index) => (
                <div
                  key={`${block.date}-${block.startTime}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{block.title}</p>
                    <p className="mt-1 text-sm text-text-muted">
                      {formatDisplayDate(block.date, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {formatTimeLabel(block.startTime)} - {formatTimeLabel(block.endTime)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {block.goalTitle || block.goalId ? <Badge>{block.goalTitle || "Linked goal"}</Badge> : null}
                    <Badge>{block.subject}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPendingBlocks(
                          pendingBlocks.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-6 py-14 text-center text-sm text-text-muted">
            No preview blocks yet. Generate the week to see a proposed schedule.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AutoScheduleModal;
