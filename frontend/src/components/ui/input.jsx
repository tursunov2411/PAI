import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent/70 focus:ring-2 focus:ring-accent/30",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";

export { Input };

