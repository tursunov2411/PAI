import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent px-4 py-2.5 text-white shadow-glow hover:bg-accent-hover",
        secondary:
          "border border-white/10 bg-white/5 px-4 py-2.5 text-text-primary hover:bg-white/10",
        ghost: "px-3 py-2 text-text-muted hover:bg-white/5 hover:text-text-primary",
        destructive: "bg-error px-4 py-2.5 text-white hover:bg-error/90",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(buttonVariants({ variant, size }), className)}
    {...props}
  />
));

Button.displayName = "Button";

export { Button, buttonVariants };

