import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ComponentType<{ className?: string }>;
  title?: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title || "Empty state"}
      className={cn(
        "border-border bg-surface flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-10 text-center transition-colors sm:p-12",
        className,
      )}
      {...props}
    >
      <div className="bg-[#A7C8A3]/30 text-[#5E8C61] dark:bg-[#5E8C61]/20 dark:text-[#A7C8A3] flex h-14 w-14 items-center justify-center rounded-2xl shadow-xs">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        {title && (
          <h3 className="text-foreground text-base font-semibold">{title}</h3>
        )}
        <p className="text-muted-foreground max-w-sm text-xs sm:text-sm">
          {description}
        </p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
