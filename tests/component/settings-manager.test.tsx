import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SettingsManager } from "@/components/features/settings-manager";
import { ToastContextProvider } from "@/components/ui/toast";
import type { SettingsDto } from "@/lib/schemas/settings";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  signOut: vi.fn().mockResolvedValue(true),
}));

const mockSettings: SettingsDto = {
  userId: "user-1",
  displayName: "Alex Studio",
  defaultCurrency: "PHP",
  taxSetAsideBps: 1500, // 15%
  fiscalYearStartMonth: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("SettingsManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/settings") && init?.method === "PATCH") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: {
                  ...mockSettings,
                  taxSetAsideBps: 2000,
                  defaultCurrency: "USD",
                },
              }),
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });
  });

  it("renders form initialized with user settings", () => {
    render(
      <ToastContextProvider>
        <SettingsManager
          initialSettings={mockSettings}
          userEmail="alex@example.com"
        />
      </ToastContextProvider>,
    );

    expect(
      screen.getByText("Account & Financial Settings"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alex Studio")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alex@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("15")).toBeInTheDocument(); // 1500 bps -> 15%
  });

  it("validates tax percentage cannot exceed 100%", async () => {
    render(
      <ToastContextProvider>
        <SettingsManager initialSettings={mockSettings} />
      </ToastContextProvider>,
    );

    const taxInput = screen.getByLabelText(/estimated tax set-aside rate/i);
    fireEvent.change(taxInput, { target: { value: "120" } });

    const submitBtn = screen.getByRole("button", { name: /save settings/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(
      screen.getByText(
        /tax set-aside percent must be a valid number between 0% and 100%/i,
      ),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits PATCH request converting percent to basis points", async () => {
    render(
      <ToastContextProvider>
        <SettingsManager initialSettings={mockSettings} />
      </ToastContextProvider>,
    );

    const taxInput = screen.getByLabelText(/estimated tax set-aside rate/i);
    fireEvent.change(taxInput, { target: { value: "20" } });

    const currencySelect = screen.getByLabelText(/default currency/i);
    fireEvent.change(currencySelect, { target: { value: "USD" } });

    const submitBtn = screen.getByRole("button", { name: /save settings/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          displayName: "Alex Studio",
          defaultCurrency: "USD",
          taxSetAsideBps: 2000,
          fiscalYearStartMonth: 1,
        }),
      }),
    );

    expect(
      await screen.findByText(/preferences successfully saved/i),
    ).toBeInTheDocument();
  });

  it("allows selecting light, dark, and system themes", () => {
    render(
      <ToastContextProvider>
        <SettingsManager initialSettings={mockSettings} />
      </ToastContextProvider>,
    );

    const darkBtn = screen.getByRole("button", { name: /dark/i });
    expect(darkBtn).toBeInTheDocument();
    fireEvent.click(darkBtn);
  });

  it("handles account export download", async () => {
    const mockBlob = new Blob(['{"data":{}}'], { type: "application/json" });
    const createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;

    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/account/export")) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        } as unknown as Response);
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <ToastContextProvider>
        <SettingsManager initialSettings={mockSettings} />
      </ToastContextProvider>,
    );

    const exportBtn = screen.getByRole("button", { name: /download export/i });
    expect(exportBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(exportBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/v1/account/export");
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
  });

  it("requires typing DELETE to confirm account deletion", async () => {
    vi.mocked(global.fetch).mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/v1/account") && init?.method === "DELETE") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { deleted: true } }),
          } as Response);
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      },
    );

    render(
      <ToastContextProvider>
        <SettingsManager initialSettings={mockSettings} />
      </ToastContextProvider>,
    );

    const openDeleteBtn = screen.getByRole("button", {
      name: /delete account/i,
    });
    fireEvent.click(openDeleteBtn);

    const confirmInput = screen.getByPlaceholderText("DELETE");
    expect(confirmInput).toBeInTheDocument();

    const permDeleteBtn = screen.getByRole("button", {
      name: /permanently delete/i,
    });
    expect(permDeleteBtn).toBeDisabled();

    // Type wrong confirmation phrase
    fireEvent.change(confirmInput, { target: { value: "DEL" } });
    expect(permDeleteBtn).toBeDisabled();

    // Type exact confirmation phrase
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    expect(permDeleteBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(permDeleteBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/account",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ confirmPhrase: "DELETE" }),
      }),
    );
    expect(mockPush).toHaveBeenCalledWith("/sign-in");
  });
});
