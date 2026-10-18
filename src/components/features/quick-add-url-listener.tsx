"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QuickAddSheet } from "@/components/features/quick-add-sheet";

function QuickAddListenerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isQuickAddOpen = searchParams.get("action") === "new";

  const handleOpenChange = (open: boolean) => {
    if (!open && isQuickAddOpen) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      const newQuery = params.toString();
      router.replace(newQuery ? `${pathname}?${newQuery}` : pathname);
    }
  };

  return (
    <QuickAddSheet
      open={isQuickAddOpen}
      onOpenChange={handleOpenChange}
      onSuccess={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("transaction-created"));
        }
        handleOpenChange(false);
        router.refresh();
      }}
    />
  );
}

export function QuickAddUrlListener() {
  return (
    <React.Suspense fallback={null}>
      <QuickAddListenerInner />
    </React.Suspense>
  );
}
