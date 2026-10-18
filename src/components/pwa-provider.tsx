"use client";

import * as React from "react";
import { WifiOff, CloudUpload } from "lucide-react";
import {
  getOfflineQueue,
  syncOfflineQueue,
  type SyncResult,
} from "@/lib/offline-queue";
import { useToast } from "@/components/ui/toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaContextValue {
  isOnline: boolean;
  pendingCount: number;
  canInstall: boolean;
  installApp: () => Promise<void>;
  syncNow: () => Promise<SyncResult>;
}

const PwaContext = React.createContext<PwaContextValue>({
  isOnline: true,
  pendingCount: 0,
  canInstall: false,
  installApp: async () => {},
  syncNow: async () => ({ syncedCount: 0, errors: [] }),
});

export function usePwa() {
  return React.useContext(PwaContext);
}

interface PwaProviderProps {
  children: React.ReactNode;
}

const emptySubscribe = () => () => {};

export function PwaProvider({ children }: PwaProviderProps) {
  const { toast } = useToast();

  // useSyncExternalStore guarantees safe SSR matching without triggering hydration mismatch
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [isOnline, setIsOnline] = React.useState(true);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  // Perform sync
  const performSync = React.useCallback(async () => {
    if (syncing) return { syncedCount: 0, errors: [] };
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      setPendingCount(getOfflineQueue().length);

      if (result.syncedCount > 0) {
        toast({
          title: "Offline Sync Complete",
          description: `Synced ${result.syncedCount} offline ${
            result.syncedCount === 1 ? "transaction" : "transactions"
          } to your account.`,
          variant: "success",
        });
      }

      if (result.errors.length > 0) {
        toast({
          title: "Sync Issue",
          description: `${result.errors.length} item(s) could not be synchronized.`,
          variant: "destructive",
        });
      }

      return result;
    } finally {
      setSyncing(false);
    }
  }, [syncing, toast]);

  React.useEffect(() => {
    // Register Service Worker in production
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // SW registered
        })
        .catch(() => {
          // SW registration failed
        });
    }

    // Online / Offline handlers
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "You are back online. Synchronizing data...",
        variant: "default",
      });
      performSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode Active",
        description:
          "Changes and quick adds will be saved locally until you reconnect.",
        variant: "default",
      });
    };

    const handleQueueChange = () => {
      setPendingCount(getOfflineQueue().length);
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("fft-offline-queue-change", handleQueueChange);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("fft-offline-queue-change", handleQueueChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [performSync, toast]);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        pendingCount,
        canInstall: Boolean(deferredPrompt),
        installApp,
        syncNow: performSync,
      }}
    >
      {/* Offline Status Top Bar (when offline or sync pending) */}
      {mounted && !isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-50 flex items-center justify-between bg-amber-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              <strong>Offline Mode</strong> — You can still add transactions.
              They will automatically sync when you reconnect.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-800/80 px-2.5 py-0.5 text-[11px] font-semibold">
              {pendingCount} {pendingCount === 1 ? "pending" : "pending"}
            </span>
          )}
        </div>
      )}

      {mounted && isOnline && pendingCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="bg-primary text-primary-foreground sticky top-0 z-50 flex items-center justify-between px-4 py-2 text-xs font-medium shadow-sm"
        >
          <div className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4 shrink-0" />
            <span>
              {pendingCount} offline{" "}
              {pendingCount === 1 ? "transaction" : "transactions"} waiting to
              sync.
            </span>
          </div>
          <button
            type="button"
            onClick={performSync}
            disabled={syncing}
            className="rounded bg-white/20 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/30"
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      )}

      {children}
    </PwaContext.Provider>
  );
}
