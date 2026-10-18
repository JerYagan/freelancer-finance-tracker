import { format as dateFnsFormat } from "date-fns";

/**
 * Validates whether a string is a strict YYYY-MM-DD calendar date.
 * Rejects non-existent dates like February 30 or April 31.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Validates whether a string is a valid YYYY-MM month key.
 */
export function isValidMonthKey(monthStr: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) {
    return false;
  }
  return true;
}

/**
 * Creates a local Date object from a YYYY-MM-DD string without timezone offset distortion.
 */
function parseLocalDate(dateStr: string): Date {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string: "${dateStr}"`);
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the local runtime environment.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Extracts the YYYY-MM month key from a YYYY-MM-DD date string.
 */
export function getMonthKey(dateStr: string): string {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string: "${dateStr}"`);
  }
  return dateStr.slice(0, 7);
}

/**
 * Formats a YYYY-MM-DD date string for display (default: "MMM d, yyyy").
 * Guaranteed never to shift days due to UTC timezone offsets.
 */
export function formatDate(
  dateStr: string,
  formatPattern: string = "MMM d, yyyy",
): string {
  const localDate = parseLocalDate(dateStr);
  return dateFnsFormat(localDate, formatPattern);
}

/**
 * Formats a YYYY-MM month key for display (default: "MMMM yyyy").
 */
export function formatMonth(
  monthKey: string,
  formatPattern: string = "MMMM yyyy",
): string {
  if (!isValidMonthKey(monthKey)) {
    throw new Error(`Invalid month key: "${monthKey}"`);
  }
  const [year, month] = monthKey.split("-").map(Number);
  const localDate = new Date(year ?? 0, (month ?? 1) - 1, 1);
  return dateFnsFormat(localDate, formatPattern);
}

/**
 * Returns the start and end dates of a month for a given YYYY-MM key.
 */
export function getMonthRange(monthKey: string): {
  startDate: string;
  endDate: string;
} {
  if (!isValidMonthKey(monthKey)) {
    throw new Error(`Invalid month key: "${monthKey}"`);
  }

  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year ?? 0, month ?? 1, 0).getDate();

  return {
    startDate: `${monthKey}-01`,
    endDate: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Generates an array of consecutive month keys (YYYY-MM) in chronological order ending at fromMonthKey.
 * Useful for trend charts (e.g. 6-month trend).
 */
export function getLastNMonths(count: number, fromMonthKey?: string): string[] {
  if (count <= 0) {
    return [];
  }

  const referenceKey = fromMonthKey ?? getTodayDateString().slice(0, 7);
  if (!isValidMonthKey(referenceKey)) {
    throw new Error(`Invalid reference month key: "${referenceKey}"`);
  }

  const [refYear, refMonth] = referenceKey.split("-").map(Number);
  const result: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(refYear ?? 0, (refMonth ?? 1) - 1 - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    result.push(`${y}-${m}`);
  }

  return result;
}

/**
 * Calculates the fiscal year for a given date string and fiscal year starting month (1-12).
 * Default start month is 1 (January, calendar year).
 */
export function getFiscalYear(
  dateStr: string,
  fiscalYearStartMonth: number = 1,
): number {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string: "${dateStr}"`);
  }

  const [year, month] = dateStr.split("-").map(Number);
  const startMonth = Math.min(Math.max(fiscalYearStartMonth, 1), 12);

  // If fiscal year starts in Jan, calendar year is fiscal year
  if (startMonth === 1) {
    return year ?? 0;
  }

  // If date month is on or after the start month, it belongs to the fiscal year starting this calendar year
  if ((month ?? 1) >= startMonth) {
    return year ?? 0;
  }

  return (year ?? 0) - 1;
}

/**
 * Returns the fiscal quarter (1, 2, 3, or 4) for a given date and fiscal year starting month.
 */
export function getQuarter(
  dateStr: string,
  fiscalYearStartMonth: number = 1,
): {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  label: string;
} {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string: "${dateStr}"`);
  }

  const [, month] = dateStr.split("-").map(Number);
  const fiscalYear = getFiscalYear(dateStr, fiscalYearStartMonth);
  const startMonth = Math.min(Math.max(fiscalYearStartMonth, 1), 12);

  // Calculate month offset from the start of the fiscal year (0 to 11)
  const offset = ((month ?? 1) - startMonth + 12) % 12;
  const quarter = (Math.floor(offset / 3) + 1) as 1 | 2 | 3 | 4;

  return {
    year: fiscalYear,
    quarter,
    label: `Q${quarter} ${fiscalYear}`,
  };
}

/**
 * Calculates the start date, end date, label, and list of YYYY-MM months for a given fiscal year and quarter.
 */
export function getQuarterRange(
  fiscalYear: number,
  quarter: 1 | 2 | 3 | 4,
  fiscalYearStartMonth: number = 1,
): {
  startDate: string;
  endDate: string;
  label: string;
  months: string[];
} {
  const startMonth = Math.min(Math.max(fiscalYearStartMonth, 1), 12);
  const months: string[] = [];

  for (let k = 0; k < 3; k++) {
    const monthOffset = startMonth - 1 + (quarter - 1) * 3 + k;
    const calYear = fiscalYear + Math.floor(monthOffset / 12);
    const calMonth = (monthOffset % 12) + 1;
    months.push(`${calYear}-${String(calMonth).padStart(2, "0")}`);
  }

  const firstMonth = months[0]!;
  const lastMonth = months[2]!;
  const { startDate } = getMonthRange(firstMonth);
  const { endDate } = getMonthRange(lastMonth);

  return {
    startDate,
    endDate,
    label: `Q${quarter} ${fiscalYear}`,
    months,
  };
}

export type RecurrenceInterval = "weekly" | "monthly" | "quarterly" | "yearly";

/**
 * Calculates the next occurrence date for a given date and recurrence interval.
 * - weekly: exactly +7 days
 * - monthly: +1 month with day-of-month clamping (e.g. Jan 31 -> Feb 28/29, Mar 31 -> Apr 30)
 * - quarterly: +3 months with day-of-month clamping
 * - yearly: +1 year with leap year Feb 29 -> Feb 28 clamping
 */
export function advanceRecurrenceDate(
  dateStr: string,
  interval: RecurrenceInterval,
): string {
  if (!isValidDateString(dateStr)) {
    throw new Error(`Invalid date string: "${dateStr}"`);
  }

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  switch (interval) {
    case "weekly": {
      const d = new Date(year, month - 1, day + 7);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dt = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dt}`;
    }
    case "monthly": {
      const totalMonths = year * 12 + (month - 1) + 1;
      const targetYear = Math.floor(totalMonths / 12);
      const targetMonth = (totalMonths % 12) + 1;
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const clampedDay = Math.min(day, maxDays);
      return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
    }
    case "quarterly": {
      const totalMonths = year * 12 + (month - 1) + 3;
      const targetYear = Math.floor(totalMonths / 12);
      const targetMonth = (totalMonths % 12) + 1;
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const clampedDay = Math.min(day, maxDays);
      return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
    }
    case "yearly": {
      const targetYear = year + 1;
      const targetMonth = month;
      const maxDays = new Date(targetYear, targetMonth, 0).getDate();
      const clampedDay = Math.min(day, maxDays);
      return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
    }
  }
}

export type DateFormatOption = "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";

/**
 * Parses a custom date string according to the specified format pattern into a canonical YYYY-MM-DD date.
 * Returns null if invalid or nonexistent calendar date.
 */
export function parseCustomDate(
  rawDateStr: string,
  formatOption: DateFormatOption = "YYYY-MM-DD",
): string | null {
  const trimmed = rawDateStr.trim();
  if (!trimmed) return null;

  if (formatOption === "YYYY-MM-DD") {
    return isValidDateString(trimmed) ? trimmed : null;
  }

  if (formatOption === "MM/DD/YYYY") {
    const parts = trimmed.split(/[/.-]/);
    if (parts.length !== 3) return null;
    const [monthStr, dayStr, yearStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) return null;
    const candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return isValidDateString(candidate) ? candidate : null;
  }

  if (formatOption === "DD/MM/YYYY") {
    const parts = trimmed.split(/[/.-]/);
    if (parts.length !== 3) return null;
    const [dayStr, monthStr, yearStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) return null;
    const candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return isValidDateString(candidate) ? candidate : null;
  }

  return null;
}
