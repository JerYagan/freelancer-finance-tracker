"use client";

import * as React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Coins,
  ShieldCheck,
  TrendingUp,
  Users,
  PieChart as PieChartIcon,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { formatDate, formatMonth, getTodayDateString } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import type {
  ReportsSummaryDto,
  ReportsTaxSummaryDto,
  TrendItemDto,
} from "@/lib/schemas/reports";
import { cn } from "@/lib/utils";

interface DashboardViewProps {
  initialSummary?: ReportsSummaryDto;
  initialTrend?: TrendItemDto[];
  initialTaxSummary?: ReportsTaxSummaryDto;
}

export function DashboardView({
  initialSummary,
  initialTrend,
  initialTaxSummary,
}: DashboardViewProps) {
  const currentMonthKey = React.useMemo(
    () => getTodayDateString().slice(0, 7),
    [],
  );
  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    initialSummary?.month ?? currentMonthKey,
  );
  const [summary, setSummary] = React.useState<ReportsSummaryDto | null>(
    initialSummary ?? null,
  );
  const [trend, setTrend] = React.useState<TrendItemDto[] | null>(
    initialTrend ?? null,
  );
  const [taxSummary, setTaxSummary] =
    React.useState<ReportsTaxSummaryDto | null>(initialTaxSummary ?? null);
  const [selectedQuarter, setSelectedQuarter] = React.useState<{
    year?: number;
    quarter?: number;
  }>({
    year: initialTaxSummary?.year,
    quarter: initialTaxSummary?.quarter,
  });
  const [selectedCurrency, setSelectedCurrency] = React.useState<string>(
    initialSummary?.currency ?? "PHP",
  );
  const [loading, setLoading] = React.useState(!initialSummary);
  const [error, setError] = React.useState<string | null>(null);
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const queryCurrency = selectedCurrency
          ? `&currency=${encodeURIComponent(selectedCurrency)}`
          : "";
        const taxBaseUrl =
          selectedQuarter.year && selectedQuarter.quarter
            ? `/api/v1/reports/tax-summary?year=${selectedQuarter.year}&quarter=${selectedQuarter.quarter}`
            : `/api/v1/reports/tax-summary`;
        const taxUrl = taxBaseUrl.includes("?")
          ? `${taxBaseUrl}${queryCurrency}`
          : `${taxBaseUrl}?${queryCurrency.slice(1)}`;

        const [summaryRes, trendRes, taxRes] = await Promise.all([
          fetch(
            `/api/v1/reports/summary?month=${selectedMonth}${queryCurrency}`,
          ).then((r) => r.json()),
          fetch(`/api/v1/reports/trend?months=6${queryCurrency}`).then((r) =>
            r.json(),
          ),
          fetch(taxUrl).then((r) => r.json()),
        ]);

        if (!ignore) {
          if (!summaryRes.ok && summaryRes.error) {
            setError(summaryRes.error.message || "Failed to load summary");
          } else {
            setSummary(summaryRes.data);
            setError(null);
          }

          if (trendRes.data) {
            setTrend(trendRes.data);
          }

          if (taxRes.data) {
            setTaxSummary(taxRes.data);
          }

          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load dashboard data",
          );
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [selectedMonth, selectedQuarter, selectedCurrency, refreshKey]);

  const triggerRefresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handlePrevQuarter = () => {
    if (!taxSummary) return;
    let newYear = taxSummary.year;
    let newQuarter = taxSummary.quarter - 1;
    if (newQuarter < 1) {
      newQuarter = 4;
      newYear -= 1;
    }
    setSelectedQuarter({ year: newYear, quarter: newQuarter });
  };

  const handleNextQuarter = () => {
    if (!taxSummary) return;
    let newYear = taxSummary.year;
    let newQuarter = taxSummary.quarter + 1;
    if (newQuarter > 4) {
      newQuarter = 1;
      newYear += 1;
    }
    setSelectedQuarter({ year: newYear, quarter: newQuarter });
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year ?? 0, (month ?? 1) - 2, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    setLoading(true);
    setSelectedMonth(`${y}-${m}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const d = new Date(year ?? 0, month ?? 1, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    setLoading(true);
    setSelectedMonth(`${y}-${m}`);
  };

  const handleCurrentMonth = () => {
    if (selectedMonth !== currentMonthKey) {
      setLoading(true);
      setSelectedMonth(currentMonthKey);
    }
  };

  const currency = summary?.currency || "PHP";
  const netMinor = summary?.netMinor ?? 0;
  const isNetPositive = netMinor > 0;
  const isNetNegative = netMinor < 0;

  const availableCurrenciesList = React.useMemo(() => {
    const list =
      summary?.availableCurrencies ??
      (summary?.currency ? [summary.currency] : ["PHP"]);
    return Array.from(new Set(list));
  }, [summary]);

  // Prepare chart data with formatted major unit numbers for tooltip and axes
  const chartData = React.useMemo(() => {
    if (!trend) return [];
    return trend.map((item) => ({
      month: item.month,
      monthLabel: formatMonth(item.month, "MMM yy"),
      income: Math.round(item.incomeMinor / 100),
      expense: Math.round(item.expenseMinor / 100),
      net: Math.round(item.netMinor / 100),
    }));
  }, [trend]);

  return (
    <div className="space-y-6">
      {/* Month Navigator Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-pastel-mint/30 dark:bg-pastel-mint/15 px-2.5 py-0.5 text-xs font-semibold text-primary dark:text-pastel-mint mb-1.5">
            <span>Good Numbers, Brighter Days</span>
          </div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Financial Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Overview for {formatMonth(selectedMonth, "MMMM yyyy")}
          </p>
        </div>

        {/* Navigation & Currency Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Month controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrentMonth}
              aria-label={`Current month: ${formatMonth(selectedMonth, "MMM yyyy")}`}
              className={cn(
                "h-9 gap-1.5 px-3 text-xs font-medium",
                selectedMonth === currentMonthKey &&
                  "bg-primary/10 text-primary border-primary/20",
              )}
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formatMonth(selectedMonth, "MMM yyyy")}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Currency Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="dashboard-currency-select" className="sr-only">
              Select Currency
            </label>
            <select
              id="dashboard-currency-select"
              data-testid="currency-selector"
              value={currency}
              onChange={(e) => {
                setLoading(true);
                setSelectedCurrency(e.target.value);
              }}
              className="border-input bg-surface text-foreground focus-visible:ring-ring h-9 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-2xs focus-visible:ring-2 focus-visible:outline-none"
            >
              {availableCurrenciesList.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading dashboard" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="border-border bg-surface h-32 animate-pulse rounded-xl border p-5"
              />
            ))}
          </div>
          <div className="border-border bg-surface h-80 animate-pulse rounded-xl border p-6" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
        >
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={triggerRefresh}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Net Income */}
            <div className="border-border bg-surface relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Net Balance
                </span>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isNetPositive
                      ? "bg-income/10 text-income"
                      : isNetNegative
                        ? "bg-expense/10 text-expense"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <Coins className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3">
                <div
                  data-testid="stat-net"
                  className={cn(
                    "text-2xl font-bold tracking-tight tabular-nums sm:text-3xl",
                    isNetPositive && "text-income",
                    isNetNegative && "text-expense",
                    !isNetPositive && !isNetNegative && "text-foreground",
                  )}
                >
                  {isNetPositive ? "+" : ""}
                  {formatMoney(netMinor, currency)}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Income minus expenses this month
                </p>
              </div>
            </div>

            {/* Total Income */}
            <div className="border-border bg-surface flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Total Income
                </span>
                <div className="bg-income/10 text-income flex h-8 w-8 items-center justify-center rounded-lg">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3">
                <div
                  data-testid="stat-income"
                  className="text-income text-2xl font-bold tracking-tight tabular-nums sm:text-3xl"
                >
                  +{formatMoney(summary?.incomeMinor ?? 0, currency)}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Total cash received
                </p>
              </div>
            </div>

            {/* Total Expense */}
            <div className="border-border bg-surface flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Total Expenses
                </span>
                <div className="bg-expense/10 text-expense flex h-8 w-8 items-center justify-center rounded-lg">
                  <ArrowDownRight className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3">
                <div
                  data-testid="stat-expense"
                  className="text-expense text-2xl font-bold tracking-tight tabular-nums sm:text-3xl"
                >
                  −{formatMoney(summary?.expenseMinor ?? 0, currency)}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Total business spending
                </p>
              </div>
            </div>

            {/* Tax Set-Aside */}
            <div className="border-border bg-surface flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Tax Set-Aside
                </span>
                <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3">
                <div
                  data-testid="stat-tax"
                  className="text-foreground text-2xl font-bold tracking-tight tabular-nums sm:text-3xl"
                >
                  {formatMoney(summary?.taxSetAsideMinor ?? 0, currency)}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Estimated reserve from positive net
                </p>
              </div>
            </div>
          </div>

          {/* 6-Month Trend Chart */}
          <div className="border-border bg-surface rounded-xl border p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-foreground text-base font-semibold">
                    6-Month Financial Trend
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Comparison of monthly income and expenses ({currency})
                  </p>
                </div>
              </div>
            </div>

            {/* Screen reader table alternative for accessibility */}
            <div className="sr-only">
              <h3>Monthly Financial Trend Data Table</h3>
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Income</th>
                    <th>Expenses</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {trend?.map((item) => (
                    <tr key={item.month}>
                      <td>{item.month}</td>
                      <td>{formatMoney(item.incomeMinor, currency)}</td>
                      <td>{formatMoney(item.expenseMinor, currency)}</td>
                      <td>{formatMoney(item.netMinor, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recharts chart */}
            <div className="h-72 w-full pt-2">
              {isClient && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="var(--text-muted)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                      tickFormatter={(value) => `${value.toLocaleString()}`}
                    />
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => {
                        const valNum =
                          typeof value === "number" ? value : Number(value);
                        const nameStr = String(name ?? "");
                        return [
                          `${currency} ${valNum.toLocaleString()}`,
                          nameStr === "income"
                            ? "Income"
                            : nameStr === "expense"
                              ? "Expenses"
                              : "Net Profit",
                        ];
                      }}
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--border)",
                        borderRadius: "0.75rem",
                        fontSize: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                    />
                    <Bar
                      name="Income"
                      dataKey="income"
                      fill="var(--income)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name="Expenses"
                      dataKey="expense"
                      fill="var(--expense)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                  No historical trend data available.
                </div>
              )}
            </div>
          </div>

          {/* Lower section: Top Clients and Top Expense Categories */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Clients */}
            <div className="border-border bg-surface flex flex-col justify-between rounded-xl border p-5 shadow-xs">
              <div>
                <div className="border-border flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-income/10 text-income flex h-7 w-7 items-center justify-center rounded-lg">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold">
                        Top Revenue Clients
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        Top paying accounts this month
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {!summary?.topClients || summary.topClients.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground text-xs">
                        No client revenue logged in{" "}
                        {formatMonth(selectedMonth, "MMMM")}.
                      </p>
                    </div>
                  ) : (
                    summary.topClients.map((client, idx) => {
                      const totalIncome = summary.incomeMinor || 1;
                      const percentage = Math.min(
                        100,
                        Math.round((client.incomeMinor / totalIncome) * 100),
                      );

                      return (
                        <div key={client.clientId} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-foreground max-w-[60%] truncate">
                              {idx + 1}. {client.name}
                            </span>
                            <span className="text-income font-semibold tabular-nums">
                              +{formatMoney(client.incomeMinor, currency)}
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${client.name} revenue share ${percentage}%`}
                            className="bg-muted h-2 w-full overflow-hidden rounded-full"
                          >
                            <div
                              className="bg-income h-full rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Top Expense Categories */}
            <div className="border-border bg-surface flex flex-col justify-between rounded-xl border p-5 shadow-xs">
              <div>
                <div className="border-border flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-expense/10 text-expense flex h-7 w-7 items-center justify-center rounded-lg">
                      <PieChartIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold">
                        Top Expense Categories
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        Where your money went this month
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {!summary?.topExpenseCategories ||
                  summary.topExpenseCategories.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground text-xs">
                        No expenses logged in{" "}
                        {formatMonth(selectedMonth, "MMMM")}.
                      </p>
                    </div>
                  ) : (
                    summary.topExpenseCategories.map((cat, idx) => {
                      const totalExpense = summary.expenseMinor || 1;
                      const percentage = Math.min(
                        100,
                        Math.round((cat.expenseMinor / totalExpense) * 100),
                      );

                      return (
                        <div key={cat.categoryId} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-foreground max-w-[60%] truncate">
                              {idx + 1}. {cat.name}
                            </span>
                            <span className="text-expense font-semibold tabular-nums">
                              −{formatMoney(cat.expenseMinor, currency)}
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${cat.name} expense share ${percentage}%`}
                            className="bg-muted h-2 w-full overflow-hidden rounded-full"
                          >
                            <div
                              className="bg-expense h-full rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quarterly Tax Set-Aside Section */}
          <div className="border-border bg-surface rounded-xl border p-5 shadow-xs">
            <div className="border-border flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-foreground text-base font-semibold">
                      Quarterly Tax Set-Aside Summary
                    </h2>
                    {taxSummary && (
                      <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        {taxSummary.label}
                      </span>
                    )}
                  </div>
                  {taxSummary && (
                    <p className="text-muted-foreground text-xs">
                      {formatDate(taxSummary.startDate, "MMM d, yyyy")} –{" "}
                      {formatDate(taxSummary.endDate, "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>

              {/* Quarter Navigator */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevQuarter}
                  aria-label="Previous fiscal quarter"
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="text-foreground min-w-[70px] text-center text-xs font-medium">
                  {taxSummary?.label ?? "Quarter"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextQuarter}
                  aria-label="Next fiscal quarter"
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {taxSummary && (
              <div className="mt-5 space-y-6">
                {/* Quarter Highlights Card */}
                <div className="bg-muted/40 grid grid-cols-1 gap-4 rounded-lg p-4 sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Estimated Tax Reserve
                    </span>
                    <div
                      data-testid="quarterly-tax-amount"
                      className="text-foreground mt-1 text-2xl font-bold tabular-nums"
                    >
                      {formatMoney(
                        taxSummary.taxSetAsideMinor,
                        taxSummary.currency,
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {taxSummary.taxSetAsidePercent}% set-aside rate
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Quarter Net Profit
                    </span>
                    <div
                      data-testid="quarterly-net-profit"
                      className={cn(
                        "mt-1 text-2xl font-bold tabular-nums",
                        taxSummary.netMinor > 0
                          ? "text-income"
                          : taxSummary.netMinor < 0
                            ? "text-expense"
                            : "text-foreground",
                      )}
                    >
                      {taxSummary.netMinor > 0 ? "+" : ""}
                      {formatMoney(taxSummary.netMinor, taxSummary.currency)}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Income minus expenses
                    </p>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Total Quarterly Flow
                    </span>
                    <div className="mt-1 flex items-center gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">In:</span>{" "}
                        <span className="text-income font-medium tabular-nums">
                          +
                          {formatMoney(
                            taxSummary.incomeMinor,
                            taxSummary.currency,
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Out:</span>{" "}
                        <span className="text-expense font-medium tabular-nums">
                          −
                          {formatMoney(
                            taxSummary.expenseMinor,
                            taxSummary.currency,
                          )}
                        </span>
                      </div>
                    </div>
                    {taxSummary.netMinor <= 0 && (
                      <p className="text-muted-foreground mt-1.5 text-xs italic">
                        No tax set-aside required when net balance is zero or
                        negative.
                      </p>
                    )}
                  </div>
                </div>

                {/* 3-Month Breakdown Grid */}
                <div>
                  <h3 className="text-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                    Monthly Tax Breakdown
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {taxSummary.months.map((m) => (
                      <div
                        key={m.month}
                        className="border-border bg-background flex flex-col justify-between rounded-lg border p-3.5 shadow-2xs"
                      >
                        <div className="border-border/50 flex items-center justify-between border-b pb-2">
                          <span className="text-foreground text-xs font-semibold">
                            {formatMonth(m.month)}
                          </span>
                          <span className="text-muted-foreground text-xs font-medium tabular-nums">
                            Tax:{" "}
                            {formatMoney(
                              m.taxSetAsideMinor,
                              taxSummary.currency,
                            )}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Income:
                            </span>
                            <span className="text-income tabular-nums">
                              +{formatMoney(m.incomeMinor, taxSummary.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Expense:
                            </span>
                            <span className="text-expense tabular-nums">
                              −
                              {formatMoney(m.expenseMinor, taxSummary.currency)}
                            </span>
                          </div>
                          <div className="border-border/30 flex justify-between border-t pt-1 font-medium">
                            <span className="text-foreground">Net:</span>
                            <span
                              className={cn(
                                "tabular-nums",
                                m.netMinor > 0
                                  ? "text-income"
                                  : m.netMinor < 0
                                    ? "text-expense"
                                    : "text-muted-foreground",
                              )}
                            >
                              {m.netMinor > 0 ? "+" : ""}
                              {formatMoney(m.netMinor, taxSummary.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
