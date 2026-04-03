import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import usePlannerStore from "@/store/usePlannerStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDisplayDate, getDurationLabel, timeToMinutes } from "@/lib/utils";

const colors = ["#7c6af7", "#10a37f", "#4285f4", "#f59e0b", "#ef4444", "#ec4899"];

function BlockForm({ open, block, goals = [], onClose }) {
  const createBlock = usePlannerStore((state) => state.createBlock);
  const updateBlock = usePlannerStore((state) => state.updateBlock);
  const deleteBlock = usePlannerStore((state) => state.deleteBlock);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [goalId, setGoalId] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState(colors[0]);

  useEffect(() => {
    if (!block) {
      return;
    }

    setTitle(block.title || "");
    setSubject(block.subject || "");
    setDate(block.date ? new Date(block.date).toISOString().slice(0, 10) : "");
    setStartTime(block.startTime || "09:00");
    setEndTime(block.endTime || "10:00");
    setGoalId(block.goalId || block.goal?.id || "");
    setNotes(block.notes || "");
    setColor(block.color || colors[0]);
  }, [block]);

  const durationLabel = useMemo(() => {
    const minutes = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
    return getDurationLabel(minutes);
  }, [endTime, startTime]);

  if (!open || !block) {
    return null;
  }

  const handleSubmit = async () => {
    const payload = {
      title,
      subject,
      date,
      startTime,
      endTime,
      goalId: goalId || null,
      notes,
      color,
    };

    try {
      if (block.id) {
        await updateBlock(block.id, payload);
        toast.success("Study block updated.");
      } else {
        await createBlock(payload);
        toast.success("Study block created.");
      }

      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save block.");
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-surface p-5 shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
                {block.id ? "Edit Block" : "Quick Add"}
              </p>
              <p className="mt-2 text-lg font-semibold text-text-primary">
                {block.id ? block.title : "New study block"}
              </p>
              {date ? (
                <p className="mt-1 text-sm text-text-muted">{formatDisplayDate(date)}</p>
              ) : null}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto py-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Title</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Subject</label>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Date</label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Goal</label>
                <Select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
                  <SelectItem value="">No goal</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-text-muted">
                  Start Time
                </label>
                <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-text-muted">End Time</label>
                <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-text-primary">
              Duration: <span className="font-medium">{durationLabel}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Color</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    className={`h-9 w-9 rounded-full border-2 ${
                      color === swatch ? "border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-text-muted">Notes</label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex flex-wrap justify-between gap-2">
              {block.id ? (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!window.confirm("Delete this study block?")) {
                      return;
                    }

                    try {
                      await deleteBlock(block.id);
                      toast.success("Study block deleted.");
                      onClose();
                    } catch (error) {
                      toast.error(error?.response?.data?.message || "Could not delete block.");
                    }
                  }}
                >
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlockForm;
