import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/5 text-text-primary",
        accent: "border-accent/40 bg-accent/10 text-accent",
        success: "border-success/40 bg-success/10 text-success",
        warning: "border-warning/40 bg-warning/10 text-warning",
        error: "border-error/40 bg-error/10 text-error",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const Badge = ({ className, variant, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

