"use client";

import * as React from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = RadixDialog.Root;
const DialogTrigger = RadixDialog.Trigger;
const DialogPortal = RadixDialog.Portal;
const DialogClose = RadixDialog.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Overlay>) {
  return (
    <RadixDialog.Overlay
      className={cn(
        "animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200",
        className,
      )}
      {...props}
    />
  );
}

interface DialogContentProps extends React.ComponentProps<
  typeof RadixDialog.Content
> {
  sheetOnMobile?: boolean;
}

function DialogContent({
  className,
  children,
  sheetOnMobile = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cn(
          "bg-surface text-foreground border-border fixed z-50 overflow-y-auto border p-6 shadow-2xl duration-200 focus:outline-none",
          sheetOnMobile
            ? "animate-in slide-in-from-bottom-full data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 data-[state=closed]:md:zoom-out-95 inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
            : "animate-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 top-1/2 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl",
          className,
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-4 right-4 rounded-md p-1.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="h-4 w-4" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mb-5 flex flex-col space-y-1.5 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-border mt-6 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end sm:gap-3",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Title>) {
  return (
    <RadixDialog.Title
      className={cn(
        "text-foreground text-lg font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof RadixDialog.Description>) {
  return (
    <RadixDialog.Description
      className={cn("text-muted-foreground text-xs leading-normal", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
