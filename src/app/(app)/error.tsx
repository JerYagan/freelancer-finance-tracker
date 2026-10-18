"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Optionally log error in development
    console.error("App boundary error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="border-border bg-surface flex max-w-md flex-col items-center justify-center gap-4 rounded-2xl border p-8 shadow-sm">
        <div className="bg-destructive/10 text-destructive flex h-14 w-14 items-center justify-center rounded-full">
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            Something went wrong
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
            {error.message ||
              "An unexpected error occurred while loading this section. Please try again."}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()} className="gap-2 shadow-xs">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Try Again</span>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <a href="/dashboard">
              <span>Dashboard</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
