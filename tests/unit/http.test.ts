import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  AppError,
  apiHandler,
  errorResponse,
  formatZodError,
  listResponse,
  noContentResponse,
  parseRequestBody,
  parseRequestParams,
  parseRequestQuery,
  successResponse,
} from "@/server/http";

vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

import { getSessionUser } from "@/server/auth";

describe("AppError", () => {
  it("initializes with default status codes per error code", () => {
    expect(AppError.validation("Invalid input").status).toBe(400);
    expect(AppError.unauthenticated().status).toBe(401);
    expect(AppError.notFound().status).toBe(404);
    expect(AppError.conflict("Already exists").status).toBe(409);
    expect(AppError.ruleViolation("Mismatched type").status).toBe(422);
    expect(AppError.rateLimited().status).toBe(429);
    expect(AppError.internal().status).toBe(500);
  });

  it("formats ZodError into fields map and human message", () => {
    const testSchema = z.object({
      name: z.string().min(3, "Name must be at least 3 chars"),
      amount: z.number().positive("Amount must be positive"),
    });

    const parseResult = testSchema.safeParse({ name: "a", amount: -5 });
    expect(parseResult.success).toBe(false);

    if (!parseResult.success) {
      const { message, fields } = formatZodError(parseResult.error);
      expect(message).toBe("Name must be at least 3 chars");
      expect(fields.name).toBe("Name must be at least 3 chars");
      expect(fields.amount).toBe("Amount must be positive");

      const appError = AppError.fromZodError(parseResult.error);
      expect(appError.code).toBe("VALIDATION_ERROR");
      expect(appError.status).toBe(400);
      expect(appError.fields).toEqual(fields);
    }
  });
});

describe("Envelope Helpers", () => {
  it("generates single success response", async () => {
    const res = successResponse({ id: "123", name: "Test" }, 201);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      data: { id: "123", name: "Test" },
    });
  });

  it("generates list success response with default and custom meta", async () => {
    const res = listResponse(["a", "b"], {
      nextCursor: "cursor-xyz",
      limit: 25,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      data: ["a", "b"],
      meta: { nextCursor: "cursor-xyz", limit: 25 },
    });
  });

  it("generates 204 no content response", () => {
    const res = noContentResponse();
    expect(res.status).toBe(204);
  });

  it("generates error response from AppError", async () => {
    const error = new AppError("NOT_FOUND", "Category not found", {
      status: 404,
    });
    const res = errorResponse(error);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Category not found",
      },
    });
  });

  it("generates error response from ZodError with fields", async () => {
    const schema = z.object({ age: z.number().min(18, "Must be adult") });
    const parsed = schema.safeParse({ age: 10 });
    if (!parsed.success) {
      const res = errorResponse(parsed.error);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Must be adult",
          fields: { age: "Must be adult" },
        },
      });
    }
  });

  it("sanitizes unexpected internal errors to 500", async () => {
    const res = errorResponse(new Error("Database connection secret leaked"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "INTERNAL",
        message: "An unexpected error occurred. Please try again later.",
      },
    });
  });
});

describe("Request Parsing Helpers", () => {
  it("parses valid JSON request body", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
    });
    const schema = z.object({ amount: z.number() });
    const data = await parseRequestBody(req, schema);
    expect(data).toEqual({ amount: 100 });
  });

  it("throws VALIDATION_ERROR on malformed JSON body", async () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      body: "invalid-json",
    });
    const schema = z.object({ amount: z.number() });
    await expect(parseRequestBody(req, schema)).rejects.toThrow(
      "Invalid JSON body in request",
    );
  });

  it("parses query parameters with type coercion", () => {
    const req = new Request("http://localhost/api/test?limit=25&active=true");
    const schema = z.object({
      limit: z.coerce.number(),
      active: z.coerce.boolean(),
    });
    const data = parseRequestQuery(req, schema);
    expect(data).toEqual({ limit: 25, active: true });
  });

  it("parses route params promise", async () => {
    const paramsPromise = Promise.resolve({
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    const schema = z.object({ id: z.string().uuid() });
    const data = await parseRequestParams(paramsPromise, schema);
    expect(data.id).toBe("123e4567-e89b-12d3-a456-426614174000");
  });
});

describe("apiHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAUTHENTICATED when user is not logged in", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const handler = apiHandler(async () => {
      return successResponse({ ok: true });
    });

    const req = new Request("http://localhost/api/v1/categories");
    const res = await handler(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      },
    });
  });

  it("executes handler with user context when authenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user-456",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const handler = apiHandler(async ({ userId, user }) => {
      expect(userId).toBe("user-456");
      expect(user.name).toBe("Alice");
      return successResponse({ processed: true });
    });

    const req = new Request("http://localhost/api/v1/categories");
    const res = await handler(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ data: { processed: true } });
  });

  it("catches thrown AppError and returns matching envelope and status", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "user-456",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const handler = apiHandler(async () => {
      throw AppError.conflict("Category name already exists");
    });

    const req = new Request("http://localhost/api/v1/categories");
    const res = await handler(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({
      error: {
        code: "CONFLICT",
        message: "Category name already exists",
      },
    });
  });
});
