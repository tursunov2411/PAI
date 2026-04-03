import * as React from "react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/30",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = "Select";

const SelectItem = ({ value, children }) => <option value={value}>{children}</option>;

export { Select, SelectItem };

