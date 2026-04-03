import { cn } from "@/lib/utils";

export const Progress = ({ className, value = 0 }) => (
  <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/8", className)}>
    <div
      className="h-full rounded-full bg-gradient-to-r from-accent to-chatgpt transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
    />
  </div>
);

