import { getCurrencyDecimals, isSupportedCurrency } from "./currencies";

/**
 * Parses a user input string representing a monetary amount into integer minor units.
 * Never uses floating-point multiplication (avoids IEEE 754 precision issues).
 *
 * @param input String input such as "1,250.50", "1250.5", "100"
 * @param currency ISO 4217 currency code (e.g. "PHP", "USD", "JPY")
 * @returns Integer minor units (e.g. 125050 for 1,250.50 PHP)
 * @throws Error if input is non-numeric, negative, exceeds decimals, or exceeds MAX_SAFE_INTEGER
 */
export function parseMoneyInput(input: string, currency: string): number {
  if (!isSupportedCurrency(currency)) {
    throw new Error(`Unsupported currency code: "${currency}"`);
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Money input cannot be empty");
  }

  // Remove valid commas used as thousand separators (e.g. 1,000,000.00)
  // Check for invalid comma usage (e.g. ",," or trailing comma)
  const normalized = trimmed.replace(/,/g, "");

  // Must match integer or decimal with optional sign (reject letters, spaces, exponents)
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid money input: "${input}"`);
  }

  const decimals = getCurrencyDecimals(currency);
  const parts = normalized.split(".");
  const intPartStr = parts[0] ?? "0";
  const fracPartStr = parts[1] ?? "";

  if (fracPartStr.length > decimals) {
    throw new Error(
      `Too many decimal places for ${currency}. Allowed: ${decimals}, received: ${fracPartStr.length}`,
    );
  }

  // Pad fractional part to full decimal length with trailing zeros
  const paddedFrac = fracPartStr.padEnd(decimals, "0");
  const minorStr = decimals > 0 ? `${intPartStr}${paddedFrac}` : intPartStr;

  // Strip leading zeros unless it's just "0"
  const cleanedMinorStr = minorStr.replace(/^0+(?=\d)/, "");
  const minorUnits = Number(cleanedMinorStr);

  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error("Money amount exceeds maximum safe integer");
  }

  return minorUnits;
}

/**
 * Formats integer minor units into a human-readable currency string using Intl.NumberFormat.
 *
 * @param minor Minor units (e.g. 125050 for ₱1,250.50)
 * @param currency ISO 4217 currency code (e.g. "PHP", "USD")
 * @param locale Optional BCP 47 language tag (defaults to "en-PH" for PHP, "en-US" for others)
 */
export function formatMoney(
  minor: number,
  currency: string,
  locale?: string,
): string {
  if (!Number.isSafeInteger(minor)) {
    throw new Error("Invalid minor units: must be a safe integer");
  }

  const decimals = getCurrencyDecimals(currency);
  const major = minor / Math.pow(10, decimals);
  const defaultLocale =
    locale ?? (currency.toUpperCase() === "PHP" ? "en-PH" : "en-US");

  return new Intl.NumberFormat(defaultLocale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

/**
 * Formats integer minor units into an exact decimal string without currency symbols or thousands commas.
 * Useful for CSV exports, raw numbers, and input fields.
 *
 * @param minor Minor units (e.g. 125050 for PHP)
 * @param currency ISO 4217 currency code
 * @returns Decimal string (e.g. "1250.50")
 */
export function formatMinorToDecimal(minor: number, currency: string): string {
  if (!Number.isSafeInteger(minor)) {
    throw new Error("Invalid minor units: must be a safe integer");
  }

  const decimals = getCurrencyDecimals(currency);
  const isNegative = minor < 0;
  const absMinor = Math.abs(minor);

  if (decimals === 0) {
    return `${isNegative ? "-" : ""}${absMinor}`;
  }

  const minorStr = absMinor.toString().padStart(decimals + 1, "0");
  const intPart = minorStr.slice(0, -decimals);
  const fracPart = minorStr.slice(-decimals);

  return `${isNegative ? "-" : ""}${intPart}.${fracPart}`;
}

/**
 * Safely sums an array of minor units without float errors.
 *
 * @param values Array of minor unit amounts
 * @returns Total minor units
 */
export function sumMinor(values: number[]): number {
  let total = 0;
  for (const val of values) {
    if (!Number.isSafeInteger(val)) {
      throw new Error(`Invalid minor unit value: ${val}`);
    }
    total += Math.trunc(val);
    if (!Number.isSafeInteger(total)) {
      throw new Error("Sum exceeded maximum safe integer");
    }
  }
  return total;
}

/**
 * Calculates quarterly/monthly tax set-aside amount using integer basis points math.
 * Formula: Math.floor(Math.max(netMinor, 0) * bps / 10000)
 *
 * @param netMinor Net income in minor units
 * @param taxSetAsideBps Basis points (0 to 10000, where 1500 = 15%)
 */
export function calculateTaxSetAside(
  netMinor: number,
  taxSetAsideBps: number,
): number {
  if (netMinor <= 0 || taxSetAsideBps <= 0) {
    return 0;
  }
  return Math.floor((netMinor * taxSetAsideBps) / 10000);
}

/**
 * Parses monetary strings commonly encountered in CSV exports and bank statements.
 * Supports negative numbers (e.g. "-150.50" or "(150.50)") and removes currency symbols.
 */
export function parseCsvMoney(
  rawInput: string,
  currency: string,
): { amountMinor: number; isNegative: boolean } {
  let cleaned = rawInput.trim();
  let isNegative = false;

  // Check for accounting parentheses e.g. (120.50), €(120.50), or (€120.50)
  if (cleaned.includes("(") && cleaned.includes(")")) {
    isNegative = true;
  } else if (cleaned.includes("-")) {
    isNegative = true;
  }

  // Strip currency symbols (₱, $, €, £, ¥, etc.), parentheses, plus/minus, and spaces
  cleaned = cleaned.replace(/[^0-9.,]/g, "").trim();

  const amountMinor = parseMoneyInput(cleaned, currency);
  return { amountMinor, isNegative };
}
