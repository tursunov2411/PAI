import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[120px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent/70 focus:ring-2 focus:ring-accent/30",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Textarea };

