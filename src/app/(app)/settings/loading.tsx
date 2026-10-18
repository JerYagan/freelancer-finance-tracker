import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading settings"
      className="max-w-4xl space-y-6"
    >
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* 3 Form Sections Skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="border-border bg-surface space-y-4 rounded-xl border p-5 shadow-xs sm:p-6"
        >
          <div className="border-border flex items-center gap-2.5 border-b pb-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-60" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 w-full rounded-lg sm:max-w-md" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
