import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = ({ className, ...props }) => (
  <DialogPrimitive.Overlay
    className={cn("fixed inset-0 z-50 bg-black/70 backdrop-blur-sm", className)}
    {...props}
  />
);

export const DialogContent = ({ className, children, ...props }) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-text-muted transition hover:bg-white/5 hover:text-text-primary">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
);

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn("space-y-2", className)} {...props} />
);

export const DialogTitle = ({ className, ...props }) => (
  <DialogPrimitive.Title
    className={cn("text-lg font-semibold text-text-primary", className)}
    {...props}
  />
);

export const DialogDescription = ({ className, ...props }) => (
  <DialogPrimitive.Description
    className={cn("text-sm text-text-muted", className)}
    {...props}
  />
);

