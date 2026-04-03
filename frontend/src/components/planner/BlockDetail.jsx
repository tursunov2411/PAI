import toast from "react-hot-toast";
import usePlannerStore from "@/store/usePlannerStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PomodoroTimer from "@/components/planner/PomodoroTimer";
import { formatDisplayDate, formatTimeLabel, getDurationLabel } from "@/lib/utils";

function BlockDetail({ block, open, onOpenChange, onEdit }) {
  const updateStatus = usePlannerStore((state) => state.updateStatus);

  if (!block) {
    return null;
  }

  const handleStatusUpdate = async (status) => {
    try {
      const response = await updateStatus(block.id, status);
      toast.success(response.progressSuggestion?.message || "Study block updated.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not update block status.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{block.title}</DialogTitle>
          <DialogDescription>
            {formatDisplayDate(block.date, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}{" "}
            · {formatTimeLabel(block.startTime)} - {formatTimeLabel(block.endTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge>{block.subject}</Badge>
            {block.goalTitle ? <Badge variant="accent">{block.goalTitle}</Badge> : null}
            <Badge>{getDurationLabel(block.duration)}</Badge>
            <Badge>{block.status}</Badge>
          </div>

          {block.notes ? (
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-text-muted">
              {block.notes}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => handleStatusUpdate("done")}>
              Mark as Done
            </Button>
            <Button variant="secondary" onClick={() => handleStatusUpdate("skipped")}>
              Mark as Skipped
            </Button>
            <Button variant="secondary" onClick={() => handleStatusUpdate("scheduled")}>
              Reset Status
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit(block);
              }}
            >
              Edit Block
            </Button>
          </div>

          {block.goalTitle ? (
            <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-text-primary">
              If this block is done, consider updating progress on <span className="font-medium">{block.goalTitle}</span>.
            </div>
          ) : null}

          <PomodoroTimer block={block} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BlockDetail;
