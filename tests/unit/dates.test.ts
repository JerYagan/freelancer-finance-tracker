import { describe, it, expect } from "vitest";
import {
  isValidDateString,
  isValidMonthKey,
  getTodayDateString,
  getMonthKey,
  formatDate,
  formatMonth,
  getMonthRange,
  getLastNMonths,
  getFiscalYear,
  getQuarter,
  getQuarterRange,
  advanceRecurrenceDate,
  parseCustomDate,
} from "@/lib/dates";

describe("isValidDateString", () => {
  it("validates proper YYYY-MM-DD dates", () => {
    expect(isValidDateString("2026-10-18")).toBe(true);
    expect(isValidDateString("2026-01-01")).toBe(true);
    expect(isValidDateString("2026-12-31")).toBe(true);
    // 2024 is a leap year
    expect(isValidDateString("2024-02-29")).toBe(true);
  });

  it("rejects invalid calendar dates and formats", () => {
    // 2026 is not a leap year
    expect(isValidDateString("2026-02-29")).toBe(false);
    // April has 30 days
    expect(isValidDateString("2026-04-31")).toBe(false);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-00-10")).toBe(false);
    expect(isValidDateString("2026/10/18")).toBe(false);
    expect(isValidDateString("18-10-2026")).toBe(false);
    expect(isValidDateString("random-string")).toBe(false);
  });
});

describe("isValidMonthKey", () => {
  it("validates YYYY-MM month keys", () => {
    expect(isValidMonthKey("2026-10")).toBe(true);
    expect(isValidMonthKey("2026-01")).toBe(true);
    expect(isValidMonthKey("2026-12")).toBe(true);
  });

  it("rejects invalid month keys", () => {
    expect(isValidMonthKey("2026-00")).toBe(false);
    expect(isValidMonthKey("2026-13")).toBe(false);
    expect(isValidMonthKey("2026-1")).toBe(false);
    expect(isValidMonthKey("202610")).toBe(false);
  });
});

describe("getTodayDateString", () => {
  it("returns a valid YYYY-MM-DD date string", () => {
    const today = getTodayDateString();
    expect(isValidDateString(today)).toBe(true);
  });
});

describe("getMonthKey", () => {
  it("extracts the YYYY-MM month key from valid dates", () => {
    expect(getMonthKey("2026-10-18")).toBe("2026-10");
    expect(getMonthKey("2026-01-05")).toBe("2026-01");
  });

  it("throws on invalid dates", () => {
    expect(() => getMonthKey("invalid-date")).toThrow(/Invalid date string/);
  });
});

describe("formatDate and formatMonth", () => {
  it("formats dates without UTC day shifts", () => {
    expect(formatDate("2026-10-18")).toBe("Oct 18, 2026");
    expect(formatDate("2026-10-18", "yyyy-MM-dd")).toBe("2026-10-18");
    expect(formatDate("2026-01-01", "MMMM d, yyyy")).toBe("January 1, 2026");
  });

  it("formats month keys cleanly", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
    expect(formatMonth("2026-10", "MMM yyyy")).toBe("Oct 2026");
  });
});

describe("getMonthRange", () => {
  it("calculates exact start and end dates of months", () => {
    expect(getMonthRange("2026-02")).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
    // Leap year Feb
    expect(getMonthRange("2024-02")).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
    // 30-day month
    expect(getMonthRange("2026-04")).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });
    // 31-day month
    expect(getMonthRange("2026-10")).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
  });
});

describe("getLastNMonths", () => {
  it("generates chronological list of months ending at target month", () => {
    const months = getLastNMonths(6, "2026-10");
    expect(months).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("spans across previous calendar years properly", () => {
    const months = getLastNMonths(4, "2026-02");
    expect(months).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("returns empty array when count is 0 or negative", () => {
    expect(getLastNMonths(0)).toEqual([]);
    expect(getLastNMonths(-3)).toEqual([]);
  });
});

describe("getFiscalYear and getQuarter", () => {
  it("computes calendar fiscal year when start month is 1", () => {
    expect(getFiscalYear("2026-05-10", 1)).toBe(2026);
    expect(getQuarter("2026-02-15", 1)).toEqual({
      year: 2026,
      quarter: 1,
      label: "Q1 2026",
    });
    expect(getQuarter("2026-05-15", 1)).toEqual({
      year: 2026,
      quarter: 2,
      label: "Q2 2026",
    });
    expect(getQuarter("2026-08-15", 1)).toEqual({
      year: 2026,
      quarter: 3,
      label: "Q3 2026",
    });
    expect(getQuarter("2026-11-15", 1)).toEqual({
      year: 2026,
      quarter: 4,
      label: "Q4 2026",
    });
  });

  it("computes non-calendar fiscal year when start month is not 1", () => {
    // Fiscal year starts in April (4)
    expect(getFiscalYear("2026-05-10", 4)).toBe(2026);
    expect(getFiscalYear("2026-02-10", 4)).toBe(2025);

    // May 2026 is in Q1 of FY 2026 (April, May, June)
    expect(getQuarter("2026-05-10", 4)).toEqual({
      year: 2026,
      quarter: 1,
      label: "Q1 2026",
    });
    // Feb 2026 is in Q4 of FY 2025 (Jan, Feb, March)
    expect(getQuarter("2026-02-10", 4)).toEqual({
      year: 2025,
      quarter: 4,
      label: "Q4 2025",
    });
  });
});

describe("advanceRecurrenceDate", () => {
  it("advances weekly by exactly 7 days across month and year boundaries", () => {
    expect(advanceRecurrenceDate("2026-01-01", "weekly")).toBe("2026-01-08");
    expect(advanceRecurrenceDate("2026-01-28", "weekly")).toBe("2026-02-04");
    expect(advanceRecurrenceDate("2026-12-28", "weekly")).toBe("2027-01-04");
  });

  it("advances monthly and correctly clamps to the end of shorter months", () => {
    // Normal advance
    expect(advanceRecurrenceDate("2026-01-15", "monthly")).toBe("2026-02-15");
    // Clamping on non-leap year (Feb has 28 days)
    expect(advanceRecurrenceDate("2026-01-31", "monthly")).toBe("2026-02-28");
    // Clamping on leap year (Feb 2024 has 29 days)
    expect(advanceRecurrenceDate("2024-01-31", "monthly")).toBe("2024-02-29");
    // Clamping from 31 to 30 days (March to April)
    expect(advanceRecurrenceDate("2026-03-31", "monthly")).toBe("2026-04-30");
    // Year rollover
    expect(advanceRecurrenceDate("2026-12-15", "monthly")).toBe("2027-01-15");
    expect(advanceRecurrenceDate("2026-12-31", "monthly")).toBe("2027-01-31");
  });

  it("advances quarterly (+3 months) with clamping and year rollover", () => {
    expect(advanceRecurrenceDate("2026-01-15", "quarterly")).toBe("2026-04-15");
    expect(advanceRecurrenceDate("2026-01-31", "quarterly")).toBe("2026-04-30");
    expect(advanceRecurrenceDate("2026-11-15", "quarterly")).toBe("2027-02-15");
    expect(advanceRecurrenceDate("2026-11-30", "quarterly")).toBe("2027-02-28");
  });

  it("advances yearly (+1 year) and clamps leap day Feb 29 to Feb 28", () => {
    expect(advanceRecurrenceDate("2026-05-10", "yearly")).toBe("2027-05-10");
    // Leap day in 2024 -> non-leap 2025
    expect(advanceRecurrenceDate("2024-02-29", "yearly")).toBe("2025-02-28");
  });

  it("throws on invalid date input", () => {
    expect(() => advanceRecurrenceDate("invalid", "monthly")).toThrow();
  });
});

describe("parseCustomDate", () => {
  it("parses canonical YYYY-MM-DD dates", () => {
    expect(parseCustomDate("2026-10-18", "YYYY-MM-DD")).toBe("2026-10-18");
    expect(parseCustomDate("2026-02-28", "YYYY-MM-DD")).toBe("2026-02-28");
    expect(parseCustomDate("invalid", "YYYY-MM-DD")).toBeNull();
  });

  it("parses MM/DD/YYYY formatted dates", () => {
    expect(parseCustomDate("10/18/2026", "MM/DD/YYYY")).toBe("2026-10-18");
    expect(parseCustomDate("02/28/2026", "MM/DD/YYYY")).toBe("2026-02-28");
    expect(parseCustomDate("13/01/2026", "MM/DD/YYYY")).toBeNull();
  });

  it("parses DD/MM/YYYY formatted dates", () => {
    expect(parseCustomDate("18/10/2026", "DD/MM/YYYY")).toBe("2026-10-18");
    expect(parseCustomDate("28/02/2026", "DD/MM/YYYY")).toBe("2026-02-28");
    expect(parseCustomDate("31/04/2026", "DD/MM/YYYY")).toBeNull();
  });

  it("returns null for empty or invalid inputs", () => {
    expect(parseCustomDate("")).toBeNull();
    expect(parseCustomDate("   ")).toBeNull();
    expect(parseCustomDate("not-a-date")).toBeNull();
  });
});

describe("getQuarterRange", () => {
  it("computes calendar quarter date ranges accurately", () => {
    const q1 = getQuarterRange(2026, 1, 1);
    expect(q1).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      label: "Q1 2026",
      months: ["2026-01", "2026-02", "2026-03"],
    });

    const q4 = getQuarterRange(2026, 4, 1);
    expect(q4).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      label: "Q4 2026",
      months: ["2026-10", "2026-11", "2026-12"],
    });
  });

  it("computes non-calendar fiscal year quarter date ranges accurately with year rollover", () => {
    // April fiscal start
    const q1 = getQuarterRange(2026, 1, 4);
    expect(q1).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      label: "Q1 2026",
      months: ["2026-04", "2026-05", "2026-06"],
    });

    const q4 = getQuarterRange(2026, 4, 4);
    expect(q4).toEqual({
      startDate: "2027-01-01",
      endDate: "2027-03-31",
      label: "Q4 2026",
      months: ["2027-01", "2027-02", "2027-03"],
    });
  });
});
