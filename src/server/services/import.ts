import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { categories, clients, userSettings } from "../db/schema";
import { AppError } from "../http";
import {
  type CsvImportInput,
  type CsvPreviewInput,
} from "@/lib/schemas/import";
import { parseCsv } from "@/lib/csv";
import { parseCustomDate } from "@/lib/dates";
import { parseCsvMoney } from "@/lib/money";
import { createTransaction } from "./transactions";
import {
  TransactionCreateInput,
  TransactionDto,
} from "@/lib/schemas/transactions";

export interface RowPreview {
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  parsed: TransactionCreateInput | null;
  raw: Record<string, string>;
}

export interface CsvPreviewResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  headers: string[];
  preview: RowPreview[];
}

export interface CsvImportResult {
  importedCount: number;
  skippedCount: number;
  transactions: TransactionDto[];
}

function resolveColumnIndex(
  columnIdentifier: string | null | undefined,
  headers: string[],
): number {
  if (!columnIdentifier) return -1;

  // 1. Direct header match
  const exactIndex = headers.indexOf(columnIdentifier);
  if (exactIndex !== -1) return exactIndex;

  // 2. Case-insensitive header match
  const lowerIdentifier = columnIdentifier.trim().toLowerCase();
  const lowerIndex = headers.findIndex(
    (h) => h.trim().toLowerCase() === lowerIdentifier,
  );
  if (lowerIndex !== -1) return lowerIndex;

  // 3. 0-based column index string e.g. "0", "1"
  if (/^\d+$/.test(columnIdentifier)) {
    const num = Number(columnIdentifier);
    return num >= 0 && num < headers.length ? num : -1;
  }

  return -1;
}

/**
 * Parses and validates CSV data with column mapping without persisting to DB.
 */
export async function previewCsvTransactions(
  userId: string,
  input: CsvPreviewInput,
  client = db,
): Promise<CsvPreviewResult> {
  const allRows = parseCsv(input.csvText);
  if (allRows.length === 0) {
    throw AppError.validation("CSV contains no data");
  }

  const { mapping } = input;
  const headers = mapping.hasHeader
    ? (allRows[0] ?? []).map((h) => h.trim())
    : [];
  const dataRows = mapping.hasHeader ? allRows.slice(1) : allRows;

  if (dataRows.length === 0) {
    throw AppError.validation("CSV contains headers but no transaction rows");
  }

  // Resolve user currency
  let defaultCurrency = mapping.currency;
  if (!defaultCurrency) {
    const [settings] = await client
      .select({ defaultCurrency: userSettings.defaultCurrency })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    defaultCurrency = settings?.defaultCurrency ?? "PHP";
  }

  // Fetch active categories and clients for matching
  const activeCategories = await client
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
    })
    .from(categories)
    .where(and(eq(categories.userId, userId), isNull(categories.archivedAt)));

  const activeClients = await client
    .select({
      id: clients.id,
      name: clients.name,
    })
    .from(clients)
    .where(and(eq(clients.userId, userId), isNull(clients.archivedAt)));

  // Lookup maps: key = lower(name)
  const categoryMap = new Map<
    string,
    { id: string; name: string; type: "income" | "expense" }[]
  >();
  for (const cat of activeCategories) {
    const key = cat.name.trim().toLowerCase();
    const existing = categoryMap.get(key) ?? [];
    existing.push(cat);
    categoryMap.set(key, existing);
  }

  const clientMap = new Map<string, string>();
  for (const cl of activeClients) {
    clientMap.set(cl.name.trim().toLowerCase(), cl.id);
  }

  // Find column indices
  const effectiveHeaders = mapping.hasHeader
    ? headers
    : (allRows[0] ?? []).map((_, idx) => `Column ${idx + 1}`);

  const dateIdx = resolveColumnIndex(
    mapping.dateColumn,
    headers.length ? headers : effectiveHeaders,
  );
  const amountIdx = resolveColumnIndex(
    mapping.amountColumn,
    headers.length ? headers : effectiveHeaders,
  );
  const typeIdx = resolveColumnIndex(
    mapping.typeColumn,
    headers.length ? headers : effectiveHeaders,
  );
  const descIdx = resolveColumnIndex(
    mapping.descriptionColumn,
    headers.length ? headers : effectiveHeaders,
  );
  const catIdx = resolveColumnIndex(
    mapping.categoryColumn,
    headers.length ? headers : effectiveHeaders,
  );
  const clientIdx = resolveColumnIndex(
    mapping.clientColumn,
    headers.length ? headers : effectiveHeaders,
  );
  const paymentMethodIdx = resolveColumnIndex(
    mapping.paymentMethodColumn,
    headers.length ? headers : effectiveHeaders,
  );

  if (dateIdx === -1) {
    throw AppError.validation(
      `Date column "${mapping.dateColumn}" not found in CSV headers`,
    );
  }
  if (amountIdx === -1) {
    throw AppError.validation(
      `Amount column "${mapping.amountColumn}" not found in CSV headers`,
    );
  }

  const preview: RowPreview[] = [];
  let validCount = 0;
  let errorCount = 0;

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex] ?? [];
    const errors: string[] = [];

    // Construct raw record map for UI inspection
    const rawRecord: Record<string, string> = {};
    for (let c = 0; c < effectiveHeaders.length; c++) {
      const headerName = effectiveHeaders[c] ?? `Col${c}`;
      rawRecord[headerName] = row[c] ?? "";
    }

    // 1. Date
    const rawDate = (row[dateIdx] ?? "").trim();
    const parsedDate = parseCustomDate(rawDate, mapping.dateFormat);
    if (!parsedDate) {
      errors.push(`Invalid date "${rawDate}" for format ${mapping.dateFormat}`);
    }

    // 2. Amount & Type
    const rawAmount = (row[amountIdx] ?? "").trim();
    let amountMinor = 0;
    let isNegative = false;
    try {
      const parsedMoney = parseCsvMoney(rawAmount, defaultCurrency);
      amountMinor = parsedMoney.amountMinor;
      isNegative = parsedMoney.isNegative;
    } catch {
      errors.push(`Invalid amount value "${rawAmount}"`);
    }

    if (
      amountMinor <= 0 &&
      !errors.some((e) => e.startsWith("Invalid amount"))
    ) {
      errors.push("Amount must be greater than zero");
    }

    // Determine type
    let determinedType: "income" | "expense" = mapping.defaultType ?? "income";
    if (typeIdx !== -1 && row[typeIdx]) {
      const rawType = (row[typeIdx] ?? "").trim().toLowerCase();
      if (
        rawType.includes("exp") ||
        rawType.includes("debit") ||
        rawType === "out"
      ) {
        determinedType = "expense";
      } else if (
        rawType.includes("inc") ||
        rawType.includes("credit") ||
        rawType === "in"
      ) {
        determinedType = "income";
      }
    } else if (isNegative) {
      determinedType = "expense";
    }

    // 3. Category
    let resolvedCategoryId: string | null = null;
    const rawCategory = catIdx !== -1 ? (row[catIdx] ?? "").trim() : "";
    if (rawCategory) {
      const candidates = categoryMap.get(rawCategory.toLowerCase()) ?? [];
      const match = candidates.find((c) => c.type === determinedType);
      if (match) {
        resolvedCategoryId = match.id;
      }
    }

    // Fallback to defaultCategoryId
    if (!resolvedCategoryId && mapping.defaultCategoryId) {
      const defaultCat = activeCategories.find(
        (c) => c.id === mapping.defaultCategoryId && c.type === determinedType,
      );
      if (defaultCat) {
        resolvedCategoryId = defaultCat.id;
      }
    }

    if (!resolvedCategoryId) {
      errors.push(
        rawCategory
          ? `Category "${rawCategory}" not found for type "${determinedType}"`
          : `No category provided and no matching default category for type "${determinedType}"`,
      );
    }

    // 4. Client (optional)
    let resolvedClientId: string | null = null;
    const rawClient = clientIdx !== -1 ? (row[clientIdx] ?? "").trim() : "";
    if (rawClient) {
      const matchClientId = clientMap.get(rawClient.toLowerCase());
      if (matchClientId) {
        resolvedClientId = matchClientId;
      }
    }

    // 5. Description & Payment Method
    const rawDescription = descIdx !== -1 ? (row[descIdx] ?? "").trim() : null;
    const rawPaymentMethod =
      paymentMethodIdx !== -1 ? (row[paymentMethodIdx] ?? "").trim() : null;

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      errorCount++;
    }

    preview.push({
      rowIndex,
      isValid,
      errors,
      parsed: isValid
        ? {
            type: determinedType,
            amountMinor,
            currency: defaultCurrency,
            occurredOn: parsedDate!,
            categoryId: resolvedCategoryId!,
            clientId: resolvedClientId,
            description: rawDescription || null,
            paymentMethod: rawPaymentMethod || null,
          }
        : null,
      raw: rawRecord,
    });
  }

  return {
    totalRows: dataRows.length,
    validCount,
    errorCount,
    headers: effectiveHeaders,
    preview,
  };
}

/**
 * Imports valid transactions from CSV into the database.
 */
export async function importTransactionsFromCsv(
  userId: string,
  input: CsvImportInput,
  client = db,
): Promise<CsvImportResult> {
  const preview = await previewCsvTransactions(
    userId,
    {
      csvText: input.csvText,
      mapping: input.mapping,
    },
    client,
  );

  if (!input.skipInvalid && preview.errorCount > 0) {
    throw AppError.ruleViolation(
      `CSV contains ${preview.errorCount} invalid rows. Correct errors or enable skipInvalid to proceed.`,
    );
  }

  const importedTransactions: TransactionDto[] = [];

  for (const row of preview.preview) {
    if (row.isValid && row.parsed) {
      const tx = await createTransaction(userId, row.parsed, client);
      importedTransactions.push(tx);
    }
  }

  return {
    importedCount: importedTransactions.length,
    skippedCount: preview.errorCount,
    transactions: importedTransactions,
  };
}
