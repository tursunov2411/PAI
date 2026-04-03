import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }) => (
  <div className={cn("glass-panel", className)} {...props} />
);

export const CardHeader = ({ className, ...props }) => (
  <div className={cn("space-y-2 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-lg font-semibold text-text-primary", className)} {...props} />
);

export const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-text-muted", className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }) => (
  <div
    className={cn("flex items-center gap-3 border-t border-white/5 p-6 pt-4", className)}
    {...props}
  />
);

