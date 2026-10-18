import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading clients and projects"
      className="space-y-6"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-5 w-40" />
      </div>

      {/* Clients Cards Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
            <div className="border-border space-y-2 border-t pt-2">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-32 rounded-lg" />
                <Skeleton className="h-7 w-28 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
