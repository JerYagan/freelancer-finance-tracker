import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import { categories, clients, transactions } from "@/server/db/schema";
import { AppError } from "@/server/http";
import {
  getLastNMonths,
  getMonthRange,
  getQuarter,
  getQuarterRange,
  getTodayDateString,
} from "@/lib/dates";
import { calculateTaxSetAside } from "@/lib/money";
import type {
  ReportSummaryTopClientDto,
  ReportSummaryTopExpenseCategoryDto,
  ReportsSummaryDto,
  ReportsSummaryQueryInput,
  ReportsTaxSummaryDto,
  ReportsTaxSummaryQueryInput,
  ReportsTrendQueryInput,
  TaxSummaryMonthDto,
  TrendItemDto,
} from "@/lib/schemas/reports";
import { getSettings } from "./settings";

/**
 * Generates the monthly summary report including total income, total expense,
 * net balance, tax set-aside amount, top clients, and top expense categories.
 */
export async function getMonthSummary(
  userId: string,
  input: ReportsSummaryQueryInput = {},
  client = db,
): Promise<ReportsSummaryDto> {
  const month = input.month ?? getTodayDateString().slice(0, 7);
  const { startDate, endDate } = getMonthRange(month);
  const settings = await getSettings(userId, client);

  // Check currencies used in transactions within this month
  const distinctCurrenciesResult = await client
    .selectDistinct({ currency: transactions.currency })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        gte(transactions.occurredOn, startDate),
        lte(transactions.occurredOn, endDate),
      ),
    );

  // Check all currencies used by user across active transactions for selector options
  const allUserCurrenciesResult = await client
    .selectDistinct({ currency: transactions.currency })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), isNull(transactions.deletedAt)),
    );

  const availableCurrencies = Array.from(
    new Set([
      settings.defaultCurrency,
      ...allUserCurrenciesResult.map((c) => c.currency),
    ]),
  );

  let targetCurrency: string;
  if (input.currency) {
    targetCurrency = input.currency.toUpperCase();
  } else {
    if (distinctCurrenciesResult.length > 1) {
      throw AppError.validation(
        "Multiple currencies found for this month. The currency query parameter is required.",
        { currency: "Required" },
      );
    } else if (
      distinctCurrenciesResult.length === 1 &&
      distinctCurrenciesResult[0]
    ) {
      targetCurrency = distinctCurrenciesResult[0].currency;
    } else {
      targetCurrency = settings.defaultCurrency;
    }
  }

  // Fetch all active transactions for this user, month, and currency
  const rows = await client
    .select({
      id: transactions.id,
      type: transactions.type,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      clientId: transactions.clientId,
      clientName: clients.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        eq(transactions.currency, targetCurrency),
        gte(transactions.occurredOn, startDate),
        lte(transactions.occurredOn, endDate),
      ),
    );

  let incomeMinor = 0;
  let expenseMinor = 0;
  const clientTotals = new Map<string, { name: string; incomeMinor: number }>();
  const categoryTotals = new Map<
    string,
    { name: string; expenseMinor: number }
  >();

  for (const row of rows) {
    const amount = Number(row.amountMinor);

    if (row.type === "income") {
      incomeMinor += amount;

      if (row.clientId) {
        const existing = clientTotals.get(row.clientId);
        if (existing) {
          existing.incomeMinor += amount;
        } else {
          clientTotals.set(row.clientId, {
            name: row.clientName ?? "Unknown Client",
            incomeMinor: amount,
          });
        }
      }
    } else {
      expenseMinor += amount;

      const catId = row.categoryId ?? "uncategorized";
      const catName = row.categoryName ?? "Uncategorized";
      const existing = categoryTotals.get(catId);
      if (existing) {
        existing.expenseMinor += amount;
      } else {
        categoryTotals.set(catId, {
          name: catName,
          expenseMinor: amount,
        });
      }
    }
  }

  const netMinor = incomeMinor - expenseMinor;
  const taxSetAsideMinor = calculateTaxSetAside(
    netMinor,
    settings.taxSetAsideBps,
  );

  const topClients: ReportSummaryTopClientDto[] = Array.from(
    clientTotals.entries(),
  )
    .map(([clientId, val]) => ({
      clientId,
      name: val.name,
      incomeMinor: val.incomeMinor,
    }))
    .sort((a, b) => b.incomeMinor - a.incomeMinor)
    .slice(0, 5);

  const topExpenseCategories: ReportSummaryTopExpenseCategoryDto[] = Array.from(
    categoryTotals.entries(),
  )
    .map(([categoryId, val]) => ({
      categoryId,
      name: val.name,
      expenseMinor: val.expenseMinor,
    }))
    .sort((a, b) => b.expenseMinor - a.expenseMinor)
    .slice(0, 5);

  return {
    month,
    currency: targetCurrency,
    incomeMinor,
    expenseMinor,
    netMinor,
    taxSetAsideMinor,
    topClients,
    topExpenseCategories,
    availableCurrencies,
  };
}

/**
 * Generates historical trend report across consecutive months, zero-filled for months without transactions.
 */
export async function getTrend(
  userId: string,
  input: ReportsTrendQueryInput = { months: 6 },
  client = db,
): Promise<TrendItemDto[]> {
  const monthsCount = input.months ?? 6;
  const monthKeys = getLastNMonths(monthsCount);

  if (monthKeys.length === 0) {
    return [];
  }

  const oldestMonth = monthKeys[0]!;
  const newestMonth = monthKeys[monthKeys.length - 1]!;
  const startDate = `${oldestMonth}-01`;
  const { endDate } = getMonthRange(newestMonth);
  const settings = await getSettings(userId, client);

  // Check currencies used across the trend span
  const distinctCurrenciesResult = await client
    .selectDistinct({ currency: transactions.currency })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        gte(transactions.occurredOn, startDate),
        lte(transactions.occurredOn, endDate),
      ),
    );

  let targetCurrency: string;
  if (input.currency) {
    targetCurrency = input.currency.toUpperCase();
  } else {
    if (distinctCurrenciesResult.length > 1) {
      throw AppError.validation(
        "Multiple currencies found for this period. The currency query parameter is required.",
        { currency: "Required" },
      );
    } else if (
      distinctCurrenciesResult.length === 1 &&
      distinctCurrenciesResult[0]
    ) {
      targetCurrency = distinctCurrenciesResult[0].currency;
    } else {
      targetCurrency = settings.defaultCurrency;
    }
  }

  // Fetch active transactions across the span
  const rows = await client
    .select({
      occurredOn: transactions.occurredOn,
      type: transactions.type,
      amountMinor: transactions.amountMinor,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        eq(transactions.currency, targetCurrency),
        gte(transactions.occurredOn, startDate),
        lte(transactions.occurredOn, endDate),
      ),
    );

  // Initialize zero-filled map for all monthKeys
  const monthMap = new Map<
    string,
    { incomeMinor: number; expenseMinor: number }
  >();
  for (const m of monthKeys) {
    monthMap.set(m, { incomeMinor: 0, expenseMinor: 0 });
  }

  for (const row of rows) {
    const m = row.occurredOn.slice(0, 7);
    const item = monthMap.get(m);
    if (item) {
      const amount = Number(row.amountMinor);
      if (row.type === "income") {
        item.incomeMinor += amount;
      } else {
        item.expenseMinor += amount;
      }
    }
  }

  return monthKeys.map((m) => {
    const item = monthMap.get(m) ?? { incomeMinor: 0, expenseMinor: 0 };
    return {
      month: m,
      incomeMinor: item.incomeMinor,
      expenseMinor: item.expenseMinor,
      netMinor: item.incomeMinor - item.expenseMinor,
    };
  });
}

/**
 * Generates the quarterly tax set-aside summary for the specified or current fiscal quarter.
 */
export async function getQuarterlyTaxSummary(
  userId: string,
  input: ReportsTaxSummaryQueryInput = {},
  client = db,
): Promise<ReportsTaxSummaryDto> {
  const settings = await getSettings(userId, client);
  const today = getTodayDateString();
  const currentQuarterInfo = getQuarter(today, settings.fiscalYearStartMonth);

  const fiscalYear = input.year ?? currentQuarterInfo.year;
  const quarter = (input.quarter ?? currentQuarterInfo.quarter) as
    1 | 2 | 3 | 4;

  const { startDate, endDate, label, months } = getQuarterRange(
    fiscalYear,
    quarter,
    settings.fiscalYearStartMonth,
  );

  // Check currencies used in transactions within this quarter
  const distinctCurrenciesResult = await client
    .selectDistinct({ currency: transactions.currency })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        gte(transactions.occurredOn, startDate),
        lte(transactions.occurredOn, endDate),
      ),
    );

  let targetCurrency: string;
  if (input.currency) {
    targetCurrency = input.currency.toUpperCase();
  } else {
    if (distinctCurrenciesResult.length > 1) {
      throw AppError.validation(
        "Multiple currencies found for this quarter. The currency query parameter is required.",
        { currency: "Required" },
      );
    } else if (
      distinctCurrenciesResult.length === 1 &&
      distinctCurrenciesResult[0]
    ) {
      targetCurrency = distinctCurrenciesResult[0].currency;
    } else {
      targetCurrency = settings.defaultCurrency;
    }
  }

  // Fetch all active transactions for this user, quarter date range, and currency
  const rows = await client
    .select({
      id: transactions.id,
      type: transactions.type,
      amountMinor: transactions.amountMinor,
      occurredOn: transactions.occurredOn,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        eq(transactions.currency, targetCurrency),
        gte(transactions.occurredOn, startDate),
        lte(transactions.occurredOn, endDate),
      ),
    );

  const monthMap = new Map<
    string,
    { incomeMinor: number; expenseMinor: number }
  >();
  for (const m of months) {
    monthMap.set(m, { incomeMinor: 0, expenseMinor: 0 });
  }

  let totalIncomeMinor = 0;
  let totalExpenseMinor = 0;

  for (const row of rows) {
    const m = row.occurredOn.slice(0, 7);
    const item = monthMap.get(m);
    const amount = Number(row.amountMinor);
    if (row.type === "income") {
      totalIncomeMinor += amount;
      if (item) item.incomeMinor += amount;
    } else {
      totalExpenseMinor += amount;
      if (item) item.expenseMinor += amount;
    }
  }

  const netMinor = totalIncomeMinor - totalExpenseMinor;
  const taxSetAsideBps = settings.taxSetAsideBps;
  const taxSetAsidePercent = taxSetAsideBps / 100;
  const taxSetAsideMinor = calculateTaxSetAside(netMinor, taxSetAsideBps);

  const monthsDto: TaxSummaryMonthDto[] = months.map((m) => {
    const item = monthMap.get(m) ?? { incomeMinor: 0, expenseMinor: 0 };
    const monthNet = item.incomeMinor - item.expenseMinor;
    const monthTax = calculateTaxSetAside(monthNet, taxSetAsideBps);
    return {
      month: m,
      incomeMinor: item.incomeMinor,
      expenseMinor: item.expenseMinor,
      netMinor: monthNet,
      taxSetAsideMinor: monthTax,
    };
  });

  return {
    year: fiscalYear,
    quarter,
    label,
    startDate,
    endDate,
    currency: targetCurrency,
    incomeMinor: totalIncomeMinor,
    expenseMinor: totalExpenseMinor,
    netMinor,
    taxSetAsideBps,
    taxSetAsidePercent,
    taxSetAsideMinor,
    months: monthsDto,
  };
}
