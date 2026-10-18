"use client";

import * as React from "react";
import { Toast as RadixToast } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = RadixToast.Provider;
const ToastViewport = RadixToast.Viewport;

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  variant?: "default" | "destructive" | "success";
}

interface ToastContextType {
  toasts: ToastProps[];
  toast: (props: Omit<ToastProps, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined,
);

export function ToastContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback((props: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id }]);
    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      <ToastProvider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            duration={t.duration ?? 5000}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
            className={cn(
              "border-border bg-surface text-foreground animate-in slide-in-from-bottom-full md:slide-in-from-bottom-5 pointer-events-auto relative flex w-full max-w-sm items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 shadow-lg transition-all",
              t.variant === "destructive" &&
                "border-destructive/30 bg-destructive/10 text-destructive",
              t.variant === "success" &&
                "border-income/30 bg-income/10 text-income",
            )}
          >
            <div className="flex-1 space-y-1">
              {t.title && (
                <RadixToast.Title className="text-foreground text-sm font-semibold">
                  {t.title}
                </RadixToast.Title>
              )}
              {t.description && (
                <RadixToast.Description className="text-muted-foreground text-xs">
                  {t.description}
                </RadixToast.Description>
              )}
            </div>

            {t.action && (
              <RadixToast.Action
                altText={t.action.label}
                onClick={t.action.onClick}
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring h-8 shrink-0 rounded-lg px-3 text-xs font-semibold shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {t.action.label}
              </RadixToast.Action>
            )}

            <RadixToast.Close
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
            >
              <X className="h-4 w-4" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <ToastViewport className="fixed right-0 bottom-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-md" />
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastContextProvider");
  }
  return context;
}
