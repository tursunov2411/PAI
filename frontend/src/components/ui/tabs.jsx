import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn("inline-flex h-11 items-center rounded-xl bg-white/5 p-1", className)}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm text-text-muted transition data-[state=active]:bg-accent data-[state=active]:text-white",
      className,
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }) => (
  <TabsPrimitive.Content className={cn("mt-4", className)} {...props} />
);

