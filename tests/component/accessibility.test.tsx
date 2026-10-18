import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardView } from "@/components/features/dashboard-view";
import { SettingsManager } from "@/components/features/settings-manager";
import { CategoriesManager } from "@/components/features/categories-manager";
import { ToastContextProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";

// Mock fetch
const globalFetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  }),
);
vi.stubGlobal("fetch", globalFetch);

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Accessibility Pass — Component ARIA & Semantics", () => {
  it("verifies DashboardView provides an accessible screen-reader table and progressbars", () => {
    const mockSummary = {
      month: "2026-10",
      currency: "PHP",
      incomeMinor: 5000000,
      expenseMinor: 1000000,
      netMinor: 4000000,
      taxSetAsideMinor: 600000,
      topClients: [
        { clientId: "c1", name: "Alpha Corp", incomeMinor: 3500000 },
      ],
      topExpenseCategories: [
        { categoryId: "cat1", name: "Software", expenseMinor: 800000 },
      ],
    };

    const mockTrend = [
      {
        month: "2026-10",
        incomeMinor: 5000000,
        expenseMinor: 1000000,
        netMinor: 4000000,
      },
    ];

    render(
      <DashboardView initialSummary={mockSummary} initialTrend={mockTrend} />,
    );

    // Screen reader table for chart alternative
    const tableHeading = screen.getByRole("heading", {
      name: /monthly financial trend data table/i,
    });
    expect(tableHeading).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();

    // Progressbar semantics for client revenue & category expense
    const clientProgress = screen.getByRole("progressbar", {
      name: /alpha corp revenue share/i,
    });
    expect(clientProgress).toHaveAttribute("aria-valuenow", "70");

    const categoryProgress = screen.getByRole("progressbar", {
      name: /software expense share/i,
    });
    expect(categoryProgress).toHaveAttribute("aria-valuenow", "80");
  });

  it("verifies SettingsManager provides toggle buttons for theme selection and label associations", () => {
    const mockSettings = {
      id: "s-1",
      userId: "u-1",
      displayName: "Jane Developer",
      defaultCurrency: "PHP",
      taxSetAsideBps: 1500,
      fiscalYearStartMonth: 1,
      createdAt: "2026-10-18T10:00:00Z",
      updatedAt: "2026-10-18T10:00:00Z",
    };

    render(
      <ThemeProvider>
        <ToastContextProvider>
          <SettingsManager
            initialSettings={mockSettings}
            userEmail="jane@example.com"
          />
        </ToastContextProvider>
      </ThemeProvider>,
    );

    // Theme buttons with accessible aria-pressed state
    const systemBtn = screen.getByRole("button", { name: /system/i });
    const lightBtn = screen.getByRole("button", { name: /light/i });
    const darkBtn = screen.getByRole("button", { name: /dark/i });

    expect(systemBtn).toBeInTheDocument();
    expect(lightBtn).toBeInTheDocument();
    expect(darkBtn).toBeInTheDocument();
    expect(systemBtn).toHaveAttribute("aria-pressed", "true");

    // Label associations
    const emailInput = screen.getByLabelText(/account email/i);
    expect(emailInput).toHaveAttribute("id", "settings-email");

    const nameInput = screen.getByLabelText(/display \/ business name/i);
    expect(nameInput).toHaveAttribute("id", "settings-display-name");

    const currencySelect = screen.getByLabelText(/default currency/i);
    expect(currencySelect).toHaveAttribute("id", "settings-currency");
  });

  it("verifies CategoriesManager provides accessible toggle buttons for type filtering", () => {
    render(
      <ToastContextProvider>
        <CategoriesManager />
      </ToastContextProvider>,
    );

    const allBtn = screen.getByRole("button", { name: /^all$/i });
    const incomeBtn = screen.getByRole("button", { name: /^income$/i });
    const expenseBtn = screen.getByRole("button", { name: /^expense$/i });

    expect(allBtn).toHaveAttribute("aria-pressed", "true");
    expect(incomeBtn).toHaveAttribute("aria-pressed", "false");
    expect(expenseBtn).toHaveAttribute("aria-pressed", "false");
  });
});
