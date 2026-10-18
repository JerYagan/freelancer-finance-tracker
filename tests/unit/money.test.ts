import { describe, it, expect } from "vitest";
import {
  parseMoneyInput,
  formatMoney,
  formatMinorToDecimal,
  sumMinor,
  calculateTaxSetAside,
  parseCsvMoney,
} from "@/lib/money";

describe("parseMoneyInput", () => {
  it("parses valid amounts into integer minor units for 2-decimal currencies", () => {
    expect(parseMoneyInput("1250.50", "PHP")).toBe(125050);
    expect(parseMoneyInput("1,250.50", "PHP")).toBe(125050);
    expect(parseMoneyInput("1250.5", "PHP")).toBe(125050);
    expect(parseMoneyInput("1250", "PHP")).toBe(125000);
    expect(parseMoneyInput("0.05", "PHP")).toBe(5);
    expect(parseMoneyInput("0.5", "PHP")).toBe(50);
    expect(parseMoneyInput("0", "PHP")).toBe(0);
    expect(parseMoneyInput("1000000", "USD")).toBe(100000000);
  });

  it("handles IEEE 754 precision trap amounts exactly without float drift", () => {
    // 19.99 * 100 in JavaScript floats is 1998.9999999999998!
    expect(parseMoneyInput("19.99", "PHP")).toBe(1999);
    // 29.99 * 100 in JavaScript floats is 2998.9999999999995!
    expect(parseMoneyInput("29.99", "PHP")).toBe(2999);
    // 0.07 * 100 is 7.000000000000001
    expect(parseMoneyInput("0.07", "PHP")).toBe(7);
  });

  it("handles zero-decimal currencies like JPY and KRW", () => {
    expect(parseMoneyInput("1500", "JPY")).toBe(1500);
    expect(parseMoneyInput("1,500", "JPY")).toBe(1500);
    expect(parseMoneyInput("0", "JPY")).toBe(0);
  });

  it("rejects zero-decimal currencies when decimal places are provided", () => {
    expect(() => parseMoneyInput("1500.5", "JPY")).toThrow(
      /Too many decimal places for JPY/,
    );
  });

  it("rejects amounts with more decimal places than allowed", () => {
    expect(() => parseMoneyInput("10.999", "PHP")).toThrow(
      /Too many decimal places for PHP/,
    );
    expect(() => parseMoneyInput("10.1234", "USD")).toThrow(
      /Too many decimal places for USD/,
    );
  });

  it("rejects invalid, negative, or non-numeric strings", () => {
    expect(() => parseMoneyInput("", "PHP")).toThrow(/cannot be empty/);
    expect(() => parseMoneyInput("   ", "PHP")).toThrow(/cannot be empty/);
    expect(() => parseMoneyInput("-50", "PHP")).toThrow(/Invalid money input/);
    expect(() => parseMoneyInput("abc", "PHP")).toThrow(/Invalid money input/);
    expect(() => parseMoneyInput("$50", "PHP")).toThrow(/Invalid money input/);
    expect(() => parseMoneyInput("10.5.5", "PHP")).toThrow(
      /Invalid money input/,
    );
    expect(() => parseMoneyInput("1e5", "PHP")).toThrow(/Invalid money input/);
  });

  it("rejects unsupported currency codes", () => {
    expect(() => parseMoneyInput("100", "INVALID")).toThrow(
      /Unsupported currency code: "INVALID"/,
    );
  });
});

describe("formatMoney", () => {
  it("formats 2-decimal currencies using standard locale and symbol", () => {
    const formattedPhp = formatMoney(125050, "PHP");
    expect(formattedPhp).toContain("1,250.50");
    // PHP formatted with en-PH has ₱
    expect(formattedPhp).toMatch(/₱|PHP/);

    const formattedUsd = formatMoney(100000, "USD");
    expect(formattedUsd).toContain("$1,000.00");
  });

  it("formats zero-decimal currencies without fractional decimals", () => {
    const formattedJpy = formatMoney(1500, "JPY");
    expect(formattedJpy).toMatch(/¥|JPY/);
    expect(formattedJpy).toContain("1,500");
    expect(formattedJpy).not.toContain(".00");
  });

  it("throws when passed non-safe integers", () => {
    expect(() => formatMoney(NaN, "PHP")).toThrow(/safe integer/);
    expect(() => formatMoney(12.34, "PHP")).toThrow(/safe integer/);
  });
});

describe("formatMinorToDecimal", () => {
  it("formats minor units to exact plain decimal strings", () => {
    expect(formatMinorToDecimal(125050, "PHP")).toBe("1250.50");
    expect(formatMinorToDecimal(5, "PHP")).toBe("0.05");
    expect(formatMinorToDecimal(50, "PHP")).toBe("0.50");
    expect(formatMinorToDecimal(0, "PHP")).toBe("0.00");
    expect(formatMinorToDecimal(100000, "USD")).toBe("1000.00");
  });

  it("formats zero-decimal currencies without decimal points", () => {
    expect(formatMinorToDecimal(1500, "JPY")).toBe("1500");
    expect(formatMinorToDecimal(0, "JPY")).toBe("0");
  });

  it("handles negative minor units", () => {
    expect(formatMinorToDecimal(-125050, "PHP")).toBe("-1250.50");
    expect(formatMinorToDecimal(-5, "PHP")).toBe("-0.05");
  });
});

describe("sumMinor", () => {
  it("sums integer arrays accurately", () => {
    expect(sumMinor([10000, 25050, 5000])).toBe(40050);
    expect(sumMinor([])).toBe(0);
    expect(sumMinor([0])).toBe(0);
    expect(sumMinor([1999, 2999])).toBe(4998);
  });

  it("throws on non-integer values", () => {
    expect(() => sumMinor([100, 50.5])).toThrow(/Invalid minor unit value/);
  });
});

describe("calculateTaxSetAside", () => {
  it("computes tax set aside based on basis points (1500 bps = 15%)", () => {
    // ₱1,000.00 (100000 minor) * 15% = ₱150.00 (15000 minor)
    expect(calculateTaxSetAside(100000, 1500)).toBe(15000);
    // ₱10,000.00 (1000000 minor) * 20% = ₱2,000.00 (200000 minor)
    expect(calculateTaxSetAside(1000000, 2000)).toBe(200000);
  });

  it("floors fractional minor units according to specification", () => {
    // 10005 * 1500 / 10000 = 1500.75 -> floor to 1500
    expect(calculateTaxSetAside(10005, 1500)).toBe(1500);
  });

  it("returns 0 for negative or zero net income or 0 bps", () => {
    expect(calculateTaxSetAside(0, 1500)).toBe(0);
    expect(calculateTaxSetAside(-50000, 1500)).toBe(0);
    expect(calculateTaxSetAside(100000, 0)).toBe(0);
    expect(calculateTaxSetAside(100000, -100)).toBe(0);
  });
});

describe("parseCsvMoney", () => {
  it("parses positive numbers without currency symbols", () => {
    expect(parseCsvMoney("1250.50", "PHP")).toEqual({
      amountMinor: 125050,
      isNegative: false,
    });
    expect(parseCsvMoney("+500.00", "USD")).toEqual({
      amountMinor: 50000,
      isNegative: false,
    });
  });

  it("parses negative numbers with minus signs and parentheses", () => {
    expect(parseCsvMoney("-450.75", "PHP")).toEqual({
      amountMinor: 45075,
      isNegative: true,
    });
    expect(parseCsvMoney("(120.50)", "PHP")).toEqual({
      amountMinor: 12050,
      isNegative: true,
    });
    expect(parseCsvMoney(" ( 300.00 ) ", "USD")).toEqual({
      amountMinor: 30000,
      isNegative: true,
    });
  });

  it("strips currency symbols and thousands separators safely", () => {
    expect(parseCsvMoney("₱ 1,250.50", "PHP")).toEqual({
      amountMinor: 125050,
      isNegative: false,
    });
    expect(parseCsvMoney("-$1,500.00", "USD")).toEqual({
      amountMinor: 150000,
      isNegative: true,
    });
    expect(parseCsvMoney("€(2,000.50)", "EUR")).toEqual({
      amountMinor: 200050,
      isNegative: true,
    });
  });
});
