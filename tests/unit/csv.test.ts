import { describe, it, expect } from "vitest";
import {
  escapeCsvCell,
  formatTransactionsToCsv,
  parseCsv,
  CSV_HEADER_ROW,
  type CsvTransactionRecord,
} from "@/lib/csv";

describe("CSV Formatting & Formula Injection Escaping", () => {
  describe("escapeCsvCell", () => {
    it("returns empty string for null and undefined", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });

    it("leaves safe text unchanged", () => {
      expect(escapeCsvCell("Website redesign milestone 1")).toBe(
        "Website redesign milestone 1",
      );
      expect(escapeCsvCell("PHP")).toBe("PHP");
      expect(escapeCsvCell("income")).toBe("income");
      expect(escapeCsvCell("15000.00")).toBe("15000.00");
    });

    it("leaves pure signed numbers unquoted from formula prefix", () => {
      expect(escapeCsvCell("1250.50")).toBe("1250.50");
      expect(escapeCsvCell("-499.00")).toBe("-499.00");
      expect(escapeCsvCell("+100")).toBe("+100");
    });

    it("neutralizes formula injection characters (=, +, -, @, \\t, \\r)", () => {
      // Formula starting with =
      expect(escapeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(escapeCsvCell("=1+1")).toBe("'=1+1");

      // Formula / DDE command starting with +
      expect(escapeCsvCell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");

      // Text starting with minus that is not a pure number
      expect(escapeCsvCell("-50% discount")).toBe("'-50% discount");

      // Text starting with @
      expect(escapeCsvCell("@mention")).toBe("'@mention");

      // Tab or carriage return prefix
      expect(escapeCsvCell("\tsneaky")).toBe("'\tsneaky");
      expect(escapeCsvCell("\rsneaky")).toBe('"\'\rsneaky"');
    });

    it("escapes cells containing commas per RFC 4180", () => {
      expect(escapeCsvCell("Acme, Inc.")).toBe('"Acme, Inc."');
    });

    it("escapes cells containing double quotes by doubling them per RFC 4180", () => {
      expect(escapeCsvCell('Software "Pro" License')).toBe(
        '"Software ""Pro"" License"',
      );
    });

    it("escapes cells containing newlines per RFC 4180", () => {
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it("neutralizes formula injection while properly escaping internal quotes and commas", () => {
      const maliciousFormula =
        '=HYPERLINK("http://malicious.site", "Click me")';
      const escaped = escapeCsvCell(maliciousFormula);

      // Must start with quote to neutralize formula and be enclosed in outer quotes because of commas/quotes
      expect(escaped).toBe(
        '"\'=HYPERLINK(""http://malicious.site"", ""Click me"")"',
      );
    });
  });

  describe("formatTransactionsToCsv", () => {
    it("generates CSV with exact header row and data rows", () => {
      const records: CsvTransactionRecord[] = [
        {
          date: "2026-10-18",
          type: "income",
          amount: "15000.00",
          currency: "PHP",
          category: "Client work",
          client: "Acme, Inc.",
          project: "Website Redesign",
          description: "=2+2 malicious formula",
          payment_method: "bank_transfer",
        },
      ];

      const csv = formatTransactionsToCsv(records);
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe(CSV_HEADER_ROW);
      expect(lines[0]).toBe(
        "date,type,amount,currency,category,client,project,description,payment_method",
      );

      // Row 1: client has comma ("Acme, Inc."), description has = ('=2+2 malicious formula)
      expect(lines[1]).toBe(
        '2026-10-18,income,15000.00,PHP,Client work,"Acme, Inc.",Website Redesign,\'=2+2 malicious formula,bank_transfer',
      );
    });
  });

  describe("parseCsv", () => {
    it("parses simple comma-separated rows", () => {
      const csv =
        "Date,Amount,Type\n2026-10-01,1500,income\n2026-10-02,200,expense";
      const rows = parseCsv(csv);
      expect(rows).toEqual([
        ["Date", "Amount", "Type"],
        ["2026-10-01", "1500", "income"],
        ["2026-10-02", "200", "expense"],
      ]);
    });

    it("parses quoted fields with commas and escaped quotes", () => {
      const csv = 'Name,Notes\n"Acme, Inc.","He said ""Hello"""';
      const rows = parseCsv(csv);
      expect(rows).toEqual([
        ["Name", "Notes"],
        ["Acme, Inc.", 'He said "Hello"'],
      ]);
    });

    it("parses multiline quoted fields and CRLF line breaks", () => {
      const csv =
        'Description,Amount\r\n"Line 1\r\nLine 2",500\r\n"Single line",250\r\n';
      const rows = parseCsv(csv);
      expect(rows).toEqual([
        ["Description", "Amount"],
        ["Line 1\r\nLine 2", "500"],
        ["Single line", "250"],
      ]);
    });
  });
});
