import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardView } from "@/components/features/dashboard-view";
import type {
  ReportsSummaryDto,
  ReportsTaxSummaryDto,
  TrendItemDto,
} from "@/lib/schemas/reports";

// Mock Recharts to avoid jsdom SVG measurement issues
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="chart-bar" />,
  XAxis: () => <div data-testid="chart-xaxis" />,
  YAxis: () => <div data-testid="chart-yaxis" />,
  CartesianGrid: () => <div data-testid="chart-grid" />,
  Tooltip: () => <div data-testid="chart-tooltip" />,
  Legend: () => <div data-testid="chart-legend" />,
}));

const mockSummary: ReportsSummaryDto = {
  month: "2026-10",
  currency: "PHP",
  incomeMinor: 9500000, // ₱95,000.00
  expenseMinor: 2600000, // ₱26,000.00
  netMinor: 6900000, // ₱69,000.00
  taxSetAsideMinor: 1035000, // ₱10,350.00
  topClients: [
    {
      clientId: "client-1",
      name: "Acme Corp",
      incomeMinor: 6000000,
    },
    {
      clientId: "client-2",
      name: "Beta LLC",
      incomeMinor: 3500000,
    },
  ],
  topExpenseCategories: [
    {
      categoryId: "cat-1",
      name: "Software & SaaS",
      expenseMinor: 2100000,
    },
    {
      categoryId: "cat-2",
      name: "Office Supplies",
      expenseMinor: 500000,
    },
  ],
};

const mockTrend: TrendItemDto[] = [
  { month: "2026-05", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
  { month: "2026-06", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
  { month: "2026-07", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
  {
    month: "2026-08",
    incomeMinor: 3000000,
    expenseMinor: 500000,
    netMinor: 2500000,
  },
  { month: "2026-09", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
  {
    month: "2026-10",
    incomeMinor: 9500000,
    expenseMinor: 2600000,
    netMinor: 6900000,
  },
];

const mockTaxSummary: ReportsTaxSummaryDto = {
  year: 2026,
  quarter: 4,
  label: "Q4 2026",
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  currency: "PHP",
  incomeMinor: 15000000,
  expenseMinor: 3000000,
  netMinor: 12000000,
  taxSetAsideBps: 1500,
  taxSetAsidePercent: 15,
  taxSetAsideMinor: 1800000,
  months: [
    {
      month: "2026-10",
      incomeMinor: 5000000,
      expenseMinor: 1000000,
      netMinor: 4000000,
      taxSetAsideMinor: 600000,
    },
    {
      month: "2026-11",
      incomeMinor: 5000000,
      expenseMinor: 1000000,
      netMinor: 4000000,
      taxSetAsideMinor: 600000,
    },
    {
      month: "2026-12",
      incomeMinor: 5000000,
      expenseMinor: 1000000,
      netMinor: 4000000,
      taxSetAsideMinor: 600000,
    },
  ],
};

describe("DashboardView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/reports/summary")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockSummary }),
        });
      }
      if (url.includes("/api/v1/reports/trend")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockTrend }),
        });
      }
      if (url.includes("/api/v1/reports/tax-summary")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockTaxSummary }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it("renders stat cards with correctly formatted amounts", async () => {
    render(
      <DashboardView initialSummary={mockSummary} initialTrend={mockTrend} />,
    );

    expect(screen.getByText("Financial Dashboard")).toBeInTheDocument();

    // Net balance card
    const netEl = screen.getByTestId("stat-net");
    expect(netEl.textContent).toMatch(/₱69,000\.00/);

    // Total income card
    const incomeEl = screen.getByTestId("stat-income");
    expect(incomeEl.textContent).toMatch(/₱95,000\.00/);

    // Total expense card
    const expenseEl = screen.getByTestId("stat-expense");
    expect(expenseEl.textContent).toMatch(/₱26,000\.00/);

    // Tax set aside card
    const taxEl = screen.getByTestId("stat-tax");
    expect(taxEl.textContent).toMatch(/₱10,350\.00/);
  });

  it("renders top clients and top expense categories lists", async () => {
    render(
      <DashboardView initialSummary={mockSummary} initialTrend={mockTrend} />,
    );

    // Top clients
    expect(screen.getByText("Top Revenue Clients")).toBeInTheDocument();
    expect(screen.getByText(/1\.\s+Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText(/2\.\s+Beta LLC/)).toBeInTheDocument();

    // Top expense categories
    expect(screen.getByText("Top Expense Categories")).toBeInTheDocument();
    expect(screen.getByText(/1\.\s+Software & SaaS/)).toBeInTheDocument();
    expect(screen.getByText(/2\.\s+Office Supplies/)).toBeInTheDocument();
  });

  it("supports navigating to previous and next months", async () => {
    render(
      <DashboardView initialSummary={mockSummary} initialTrend={mockTrend} />,
    );

    const prevBtn = screen.getByRole("button", { name: /previous month/i });
    await act(async () => {
      fireEvent.click(prevBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("month=2026-09"),
    );
  });

  it("renders accessible screen-reader table alternative for trend chart", async () => {
    render(
      <DashboardView initialSummary={mockSummary} initialTrend={mockTrend} />,
    );

    expect(
      screen.getByText("Monthly Financial Trend Data Table"),
    ).toBeInTheDocument();
    expect(screen.getByText("6-Month Financial Trend")).toBeInTheDocument();
  });

  it("renders quarterly tax set-aside summary and supports quarter navigation", async () => {
    render(
      <DashboardView
        initialSummary={mockSummary}
        initialTrend={mockTrend}
        initialTaxSummary={mockTaxSummary}
      />,
    );

    expect(
      screen.getByText("Quarterly Tax Set-Aside Summary"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("quarterly-tax-amount").textContent).toMatch(
      /₱18,000\.00/,
    );
    expect(screen.getByTestId("quarterly-net-profit").textContent).toMatch(
      /₱120,000\.00/,
    );
    expect(screen.getByText("Monthly Tax Breakdown")).toBeInTheDocument();

    const prevQuarterBtn = screen.getByRole("button", {
      name: /previous fiscal quarter/i,
    });
    await act(async () => {
      fireEvent.click(prevQuarterBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("quarter=3"),
    );
  });

  it("renders currency selector and switches currency dynamically", async () => {
    const multiCurrencySummary: ReportsSummaryDto = {
      ...mockSummary,
      availableCurrencies: ["PHP", "USD", "EUR"],
    };

    render(
      <DashboardView
        initialSummary={multiCurrencySummary}
        initialTrend={mockTrend}
      />,
    );

    const select = screen.getByTestId("currency-selector");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "PHP" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "USD" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "EUR" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(select, { target: { value: "USD" } });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("currency=USD"),
    );
  });
});
