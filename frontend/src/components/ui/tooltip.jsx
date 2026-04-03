import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = ({ className, sideOffset = 8, ...props }) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-lg border border-white/10 bg-background px-3 py-2 text-xs text-text-primary shadow-xl",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
);
