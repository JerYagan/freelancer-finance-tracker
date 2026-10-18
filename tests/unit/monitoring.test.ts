import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sanitizeMessage,
  sanitizeObject,
  normalizeError,
  captureException,
} from "@/server/monitoring";

describe("Error Monitoring Service", () => {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    vi.restoreAllMocks();
  });

  describe("sanitizeMessage", () => {
    it("redacts postgres connection string credentials", () => {
      const raw =
        "Failed to connect: postgresql://admin:superSecret123@db.supabase.co:5432/postgres?ssl=true";
      const cleaned = sanitizeMessage(raw);
      expect(cleaned).not.toContain("superSecret123");
      expect(cleaned).toContain("[REDACTED_CREDENTIALS]");
    });

    it("redacts Authorization bearer tokens", () => {
      const raw = "Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret";
      const cleaned = sanitizeMessage(raw);
      expect(cleaned).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(cleaned).toContain("Bearer [REDACTED]");
    });

    it("redacts inline password and token parameters", () => {
      const raw =
        "Request failed with password='MyPassword!' and token=abc123xyz";
      const cleaned = sanitizeMessage(raw);
      expect(cleaned).not.toContain("MyPassword!");
      expect(cleaned).not.toContain("abc123xyz");
      expect(cleaned).toContain("password=[REDACTED]");
      expect(cleaned).toContain("token=[REDACTED]");
    });

    it("returns empty string on empty input", () => {
      expect(sanitizeMessage("")).toBe("");
    });
  });

  describe("sanitizeObject", () => {
    it("recursively redacts sensitive keys", () => {
      const input = {
        password: "secretPassword",
        token: "sessionToken",
        secret: "superSecret",
        user: {
          name: "John",
          password: "anotherPassword",
          nested: {
            apiKey: "key123",
          },
        },
        metadata: {
          note: "User failed login with password=123",
        },
      };

      const sanitized = sanitizeObject(input);

      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.token).toBe("[REDACTED]");
      expect(sanitized.secret).toBe("[REDACTED]");
      expect((sanitized.user as Record<string, unknown>).password).toBe(
        "[REDACTED]",
      );
      expect(
        (
          (sanitized.user as Record<string, unknown>).nested as Record<
            string,
            unknown
          >
        ).apiKey,
      ).toBe("[REDACTED]");
      expect(
        (sanitized.metadata as Record<string, unknown>).note as string,
      ).toContain("password=[REDACTED]");
    });
  });

  describe("normalizeError", () => {
    it("normalizes standard Error instance", () => {
      const err = new Error("Something broke");
      const normalized = normalizeError(err, {
        userId: "user-123",
        route: "/api/v1/transactions",
        method: "POST",
      });

      expect(normalized.eventId).toBeDefined();
      expect(normalized.name).toBe("Error");
      expect(normalized.message).toBe("Something broke");
      expect(normalized.context.userId).toBe("user-123");
      expect(normalized.context.route).toBe("/api/v1/transactions");
      expect(normalized.context.method).toBe("POST");
    });

    it("normalizes string error and redacts secrets in message", () => {
      const err =
        "Critical failure connecting to postgres://user:mypass@db.host:5432/db";
      const normalized = normalizeError(err);

      expect(normalized.message).not.toContain("mypass");
      expect(normalized.message).toContain("[REDACTED_CREDENTIALS]");
    });

    it("normalizes plain object error", () => {
      const err = { code: 500, detail: "DB crashed" };
      const normalized = normalizeError(err);

      expect(normalized.message).toContain("DB crashed");
    });
  });

  describe("captureException", () => {
    it("logs structured error to console.error", async () => {
      const error = new Error("Test capture failure");
      const eventId = await captureException(error, {
        userId: "user-456",
        route: "/api/v1/reports",
      });

      expect(eventId).toBeDefined();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `[Monitoring] [Event: ${eventId}] [Error] Test capture failure`,
        ),
        expect.stringContaining(eventId),
      );
    });
  });
});
