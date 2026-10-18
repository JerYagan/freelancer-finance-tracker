"use client";

import * as React from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log fatal root layout error
    console.error("[Global Root Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-6 font-sans antialiased">
        <main
          id="main-content"
          className="border-border bg-surface flex max-w-md flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center shadow-sm"
        >
          <div className="bg-destructive/10 text-destructive flex h-14 w-14 items-center justify-center rounded-full">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-foreground text-xl font-bold tracking-tight">
              Application Error
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              An unexpected system error occurred. We have logged this event for
              investigation.
            </p>
            {error.digest && (
              <p className="bg-muted text-muted-foreground inline-block rounded-md px-2.5 py-1 font-mono text-xs">
                Error Reference: {error.digest}
              </p>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => reset()} className="gap-2 shadow-xs">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Try Again</span>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <a href="/dashboard">
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>Return to Dashboard</span>
              </a>
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
