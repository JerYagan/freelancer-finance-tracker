/**
 * Characters that spreadsheet programs (Excel, LibreOffice, Google Sheets)
 * may interpret as formula prefixes when opening CSV files.
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapes a single CSV cell according to RFC 4180 and OWASP CSV Injection guidelines.
 *
 * Rules:
 * 1. If value is null or undefined, returns empty string.
 * 2. If value starts with a formula trigger character (=, +, -, @, \t, \r),
 *    prepends a single quote (') to prevent spreadsheet formula execution.
 *    (Exception: simple negative numbers like -10.5 are not formulas, but in our schema
 *     amounts are unsigned decimals and types are "income" | "expense").
 * 3. If value contains double quotes, commas, or newlines, escapes internal double quotes
 *    by doubling them ("") and wraps the cell in quotes ("...").
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Check for formula injection if string starts with dangerous characters
  if (str.length > 0) {
    const firstChar = str.charAt(0);
    // Allow pure signed numbers (e.g. -12.5) if all subsequent characters are digits or dots
    const isPureNumber = /^[-+]?\d+(\.\d+)?$/.test(str);
    if (!isPureNumber && FORMULA_PREFIXES.includes(firstChar)) {
      str = `'${str}`;
    }
  }

  // RFC 4180 escaping
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export interface CsvTransactionRecord {
  date: string;
  type: string;
  amount: string;
  currency: string;
  category: string;
  client: string;
  project: string;
  description: string;
  payment_method: string;
}

export const CSV_HEADER_ROW = [
  "date",
  "type",
  "amount",
  "currency",
  "category",
  "client",
  "project",
  "description",
  "payment_method",
].join(",");

/**
 * Converts a list of transaction records into a standard RFC 4180 CSV document.
 */
export function formatTransactionsToCsv(
  records: CsvTransactionRecord[],
): string {
  const rows = records.map((rec) =>
    [
      escapeCsvCell(rec.date),
      escapeCsvCell(rec.type),
      escapeCsvCell(rec.amount),
      escapeCsvCell(rec.currency),
      escapeCsvCell(rec.category),
      escapeCsvCell(rec.client),
      escapeCsvCell(rec.project),
      escapeCsvCell(rec.description),
      escapeCsvCell(rec.payment_method),
    ].join(","),
  );

  return [CSV_HEADER_ROW, ...rows].join("\r\n");
}

/**
 * Parses RFC 4180 CSV text into a 2D array of strings.
 * Handles quoted fields, commas inside quotes, escaped quotes (""), and CRLF/LF newlines.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (i + 1 < text.length && text[i + 1] === "\n") {
          i++;
        }
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push last field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out any empty trailing row caused by trailing newline
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last && last.length === 1 && last[0]?.trim() === "") {
      rows.pop();
    }
  }

  return rows;
}
