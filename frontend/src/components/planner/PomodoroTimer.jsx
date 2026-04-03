import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import usePlannerStore from "@/store/usePlannerStore";
import { Button } from "@/components/ui/button";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function PomodoroTimer({ block }) {
  const updateStatus = usePlannerStore((state) => state.updateStatus);
  const [mode, setMode] = useState("work");
  const [secondsLeft, setSecondsLeft] = useState(WORK_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft > 0) {
      return;
    }

    const nextMode = mode === "work" ? "break" : "work";
    const nextSeconds = nextMode === "work" ? WORK_SECONDS : BREAK_SECONDS;

    if (mode === "work") {
      const nextCount = completedPomodoros + 1;
      setCompletedPomodoros(nextCount);
      toast.success(`Pomodoro ${nextCount} completed.`);

      if (nextCount >= 2 && block?.status !== "done") {
        updateStatus(block.id, "done").catch(() => {
          // Block detail handles surfaced API errors.
        });
      }
    }

    try {
      window.dispatchEvent(new Event("sunnatilla-pomodoro-complete"));
    } catch (_error) {
      // Ignore browser environments that block synthetic events.
    }

    setMode(nextMode);
    setSecondsLeft(nextSeconds);
  }, [block?.id, block?.status, completedPomodoros, mode, secondsLeft, updateStatus]);

  const totalSeconds = mode === "work" ? WORK_SECONDS : BREAK_SECONDS;
  const progress = useMemo(
    () => ((totalSeconds - secondsLeft) / totalSeconds) * 100,
    [secondsLeft, totalSeconds],
  );

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(secondsLeft % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Pomodoro Timer</p>
          <p className="mt-2 text-sm text-text-primary">
            {mode === "work" ? "Focus session" : "Break"} · Pomodoro {completedPomodoros + 1}/4
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setMode("work");
              setSecondsLeft(WORK_SECONDS);
              setCompletedPomodoros(0);
              setIsRunning(false);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" onClick={() => setIsRunning((current) => !current)}>
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isRunning ? "Pause" : "Start"}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-5">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/8 bg-surface">
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="url(#pomodoroGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={301.6}
              strokeDashoffset={301.6 - (301.6 * progress) / 100}
              fill="none"
            />
            <defs>
              <linearGradient id="pomodoroGradient" x1="0%" x2="100%">
                <stop offset="0%" stopColor="#7c6af7" />
                <stop offset="100%" stopColor="#10a37f" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-center">
            <p className="text-2xl font-semibold text-text-primary">
              {minutes}:{seconds}
            </p>
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">{mode}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-text-muted">
          <p>Complete two focus sessions to auto-mark the block as done.</p>
          <p>Work 25 minutes, then recover with a 5 minute break.</p>
        </div>
      </div>
    </div>
  );
}

export default PomodoroTimer;
