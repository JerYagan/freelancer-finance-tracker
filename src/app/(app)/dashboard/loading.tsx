import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      {/* Month Navigator Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Financial Dashboard
          </h1>
          <Skeleton className="mt-1 h-4 w-36" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-surface flex h-32 flex-col justify-between rounded-xl border p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>

      {/* Financial Trend Bar Chart Card */}
      <div className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs">
        <div className="border-border flex items-center justify-between border-b pb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border-border bg-surface space-y-3 rounded-xl border p-5 shadow-xs">
          <div className="border-border flex items-center justify-between border-b pb-4">
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>

        <div className="border-border bg-surface space-y-3 rounded-xl border p-5 shadow-xs">
          <div className="border-border flex items-center justify-between border-b pb-4">
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
