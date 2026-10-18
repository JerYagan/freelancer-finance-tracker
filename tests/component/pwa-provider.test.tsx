import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PwaProvider, usePwa } from "@/components/pwa-provider";
import { ToastContextProvider } from "@/components/ui/toast";
import { enqueueOfflineTransaction } from "@/lib/offline-queue";

function TestConsumer() {
  const { isOnline, pendingCount, canInstall, installApp, syncNow } = usePwa();
  return (
    <div>
      <span data-testid="online-status">{isOnline ? "online" : "offline"}</span>
      <span data-testid="pending-count">{pendingCount}</span>
      <span data-testid="can-install">{canInstall ? "yes" : "no"}</span>
      <button data-testid="install-btn" onClick={installApp}>
        Install
      </button>
      <button data-testid="sync-btn" onClick={() => syncNow()}>
        Sync
      </button>
    </div>
  );
}

describe("PwaProvider Component Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders children and provides online status by default", () => {
    render(
      <ToastContextProvider>
        <PwaProvider>
          <TestConsumer />
        </PwaProvider>
      </ToastContextProvider>,
    );

    expect(screen.getByTestId("online-status")).toHaveTextContent("online");
    expect(screen.getByTestId("pending-count")).toHaveTextContent("0");
    expect(screen.getByTestId("can-install")).toHaveTextContent("no");
  });

  it("displays offline warning banner when offline event fires", () => {
    render(
      <ToastContextProvider>
        <PwaProvider>
          <TestConsumer />
        </PwaProvider>
      </ToastContextProvider>,
    );

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByTestId("online-status")).toHaveTextContent("offline");
    expect(screen.getAllByText(/Offline Mode/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("displays pending count badge when transactions are queued offline", () => {
    render(
      <ToastContextProvider>
        <PwaProvider>
          <TestConsumer />
        </PwaProvider>
      </ToastContextProvider>,
    );

    act(() => {
      enqueueOfflineTransaction({
        type: "expense",
        amountMinor: 15000,
        currency: "PHP",
        occurredOn: "2026-10-18",
        categoryId: "cat-1",
      });
    });

    expect(screen.getByTestId("pending-count")).toHaveTextContent("1");
    expect(
      screen.getByText(/1 offline transaction waiting to sync/i),
    ).toBeInTheDocument();
  });

  it("captures beforeinstallprompt and enables canInstall", async () => {
    render(
      <ToastContextProvider>
        <PwaProvider>
          <TestConsumer />
        </PwaProvider>
      </ToastContextProvider>,
    );

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockChoice = Promise.resolve({
      outcome: "accepted",
      platform: "web",
    });

    const installEvent = Object.assign(new Event("beforeinstallprompt"), {
      prompt: mockPrompt,
      userChoice: mockChoice,
    });

    act(() => {
      window.dispatchEvent(installEvent);
    });

    expect(screen.getByTestId("can-install")).toHaveTextContent("yes");

    const installBtn = screen.getByTestId("install-btn");
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(mockPrompt).toHaveBeenCalled();
  });
});
