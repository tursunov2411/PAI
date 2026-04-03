import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export const Avatar = ({ className, ...props }) => (
  <AvatarPrimitive.Root
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10",
      className,
    )}
    {...props}
  />
);

export const AvatarImage = AvatarPrimitive.Image;

export const AvatarFallback = ({ className, ...props }) => (
  <AvatarPrimitive.Fallback
    className={cn(
      "flex h-full w-full items-center justify-center bg-accent/15 text-sm font-semibold text-accent",
      className,
    )}
    {...props}
  />
);

