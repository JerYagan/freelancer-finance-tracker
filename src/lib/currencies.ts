export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: readonly CurrencyInfo[] = [
  { code: "PHP", name: "Philippine Peso", symbol: "₱", decimals: 2 },
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", decimals: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimals: 2 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", decimals: 2 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimals: 2 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2 },
  { code: "THB", name: "Thai Baht", symbol: "฿", decimals: 2 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", decimals: 2 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", decimals: 2 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", decimals: 2 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", decimals: 0 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", decimals: 0 },
] as const;

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map(
  (c) => c.code,
) as [string, ...string[]];

export type SupportedCurrencyCode =
  (typeof SUPPORTED_CURRENCIES)[number]["code"];

const CURRENCY_MAP = new Map<string, CurrencyInfo>(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c]),
);

export function isSupportedCurrency(
  code: string,
): code is SupportedCurrencyCode {
  return CURRENCY_MAP.has(code.toUpperCase());
}

export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCY_MAP.get(code.toUpperCase());
}

export function getCurrencyDecimals(code: string): number {
  const info = getCurrencyInfo(code);
  return info ? info.decimals : 2;
}
