import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  addDays,
  cn,
  formatTimeLabel,
  getDurationLabel,
  minutesToTime,
  timeToMinutes,
  toDateKey,
} from "@/lib/utils";

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 42;
const DAY_START = 8 * 60;
const DAY_END = 22 * 60;

function DaySlot({ dateKey, time, onClick }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot|${dateKey}|${time}`,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onClick({ date: dateKey, startTime: time })}
      className={cn(
        "w-full border-b border-white/5 text-left transition",
        isOver ? "bg-accent/10" : "hover:bg-white/5",
      )}
      style={{ height: SLOT_HEIGHT }}
    />
  );
}

function StudyBlockCard({ block, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: {
      block,
    },
  });

  const top = ((timeToMinutes(block.startTime) - DAY_START) / SLOT_MINUTES) * SLOT_HEIGHT;
  const height = Math.max(
    SLOT_HEIGHT,
    Math.round((Math.max(block.duration, SLOT_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT),
  );

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(block);
      }}
      className="absolute left-2 right-2 rounded-2xl border border-white/10 px-3 py-2 text-left shadow-lg"
      style={{
        top,
        height,
        backgroundColor: block.color || "#7c6af7",
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.85 : 1,
      }}
      {...listeners}
      {...attributes}
    >
      <p className="truncate text-sm font-semibold text-white">{block.subject}</p>
      <p className="mt-1 truncate text-xs text-white/80">{getDurationLabel(block.duration)}</p>
      {block.goalTitle ? (
        <Badge className="mt-2 border border-white/20 bg-white/15 text-[10px] text-white">
          {block.goalTitle}
        </Badge>
      ) : null}
    </button>
  );
}

function WeekGrid({ weekStart, blocks = [], onCreateSlot, onOpenBlock, onMoveBlock }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(new Date(weekStart), index)),
    [weekStart],
  );
  const timeSlots = useMemo(
    () =>
      Array.from({ length: (DAY_END - DAY_START) / SLOT_MINUTES }, (_, index) =>
        minutesToTime(DAY_START + index * SLOT_MINUTES),
      ),
    [],
  );

  const blocksByDay = useMemo(
    () =>
      blocks.reduce((accumulator, block) => {
        const key = toDateKey(block.date);
        accumulator[key] = accumulator[key] || [];
        accumulator[key].push(block);
        return accumulator;
      }, {}),
    [blocks],
  );

  const todayKey = toDateKey(new Date());

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        const block = event.active.data.current?.block;
        const overId = event.over?.id;

        if (!block || typeof overId !== "string" || !overId.startsWith("slot|")) {
          return;
        }

        const [, date, startTime] = overId.split("|");
        const endTime = minutesToTime(timeToMinutes(startTime) + block.duration);
        onMoveBlock(block, {
          date,
          startTime,
          endTime,
        });
      }}
    >
      <div className="glass-panel overflow-hidden">
        <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-white/5 bg-surface/70">
          <div className="border-r border-white/5 px-3 py-4 text-xs uppercase tracking-[0.24em] text-text-muted">
            Time
          </div>
          {weekDates.map((date) => {
            const key = toDateKey(date);
            return (
              <div
                key={key}
                className={cn(
                  "border-r border-white/5 px-3 py-4 last:border-r-0",
                  key === todayKey ? "bg-accent/10" : "",
                )}
              >
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">
                  {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(date)}
                </p>
                {key === todayKey ? (
                  <Badge variant="accent" className="mt-2">
                    Today
                  </Badge>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
          <div className="border-r border-white/5 bg-black/10">
            {timeSlots.map((time, index) => (
              <div
                key={time}
                className="border-b border-white/5 px-2 text-right text-xs text-text-muted"
                style={{ height: SLOT_HEIGHT }}
              >
                <span className={cn(index % 2 === 0 ? "translate-y-[-10px] inline-block" : "opacity-0")}>
                  {formatTimeLabel(time)}
                </span>
              </div>
            ))}
          </div>

          {weekDates.map((date) => {
            const key = toDateKey(date);
            const dayBlocks = [...(blocksByDay[key] || [])].sort(
              (left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime),
            );

            return (
              <div key={key} className="relative border-r border-white/5 last:border-r-0">
                <div className="relative" style={{ height: timeSlots.length * SLOT_HEIGHT }}>
                  {timeSlots.map((time) => (
                    <DaySlot key={`${key}-${time}`} dateKey={key} time={time} onClick={onCreateSlot} />
                  ))}

                  {dayBlocks.map((block) => (
                    <StudyBlockCard key={block.id} block={block} onOpen={onOpenBlock} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}

export default WeekGrid;
