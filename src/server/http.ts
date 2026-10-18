import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, type User } from "@/server/auth";
import { captureException } from "@/server/monitoring";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RULE_VIOLATION"
  | "RATE_LIMITED"
  | "INTERNAL";

function getStatusForCode(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHENTICATED":
      return 401;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "RULE_VIOLATION":
      return 422;
    case "RATE_LIMITED":
      return 429;
    case "INTERNAL":
    default:
      return 500;
  }
}

export function formatZodError(error: z.ZodError): {
  message: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!fields[path]) {
      fields[path] = issue.message;
    }
  }
  const firstIssue = error.issues[0];
  const message = firstIssue ? firstIssue.message : "Validation failed";
  return { message, fields };
}

/**
 * Standard Application Error carrying API error code, HTTP status, and optional field errors.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { fields?: Record<string, string>; status?: number },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fields = options?.fields;
    this.status = options?.status ?? getStatusForCode(code);
  }

  static validation(
    message: string,
    fields?: Record<string, string>,
  ): AppError {
    return new AppError("VALIDATION_ERROR", message, { fields, status: 400 });
  }

  static fromZodError(error: z.ZodError): AppError {
    const { message, fields } = formatZodError(error);
    return new AppError("VALIDATION_ERROR", message, { fields, status: 400 });
  }

  static unauthenticated(message = "Authentication required"): AppError {
    return new AppError("UNAUTHENTICATED", message, { status: 401 });
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError("NOT_FOUND", message, { status: 404 });
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", message, { status: 409 });
  }

  static ruleViolation(message: string): AppError {
    return new AppError("RULE_VIOLATION", message, { status: 422 });
  }

  static rateLimited(
    message = "Too many requests. Please try again later.",
  ): AppError {
    return new AppError("RATE_LIMITED", message, { status: 429 });
  }

  static internal(message = "An unexpected error occurred"): AppError {
    return new AppError("INTERNAL", message, { status: 500 });
  }
}

/**
 * Single item success envelope: { "data": { ... } }
 */
export function successResponse<T>(
  data: T,
  status = 200,
  headers?: HeadersInit,
): Response {
  return NextResponse.json({ data }, { status, headers });
}

/**
 * List success envelope: { "data": [ ... ], "meta": { "nextCursor": "...", "limit": 50 } }
 */
export function listResponse<T>(
  data: T[],
  meta?: { nextCursor?: string | null; limit?: number },
  status = 200,
  headers?: HeadersInit,
): Response {
  return NextResponse.json(
    {
      data,
      meta: {
        nextCursor: meta?.nextCursor ?? null,
        limit: meta?.limit ?? 50,
      },
    },
    { status, headers },
  );
}

/**
 * No content 204 response
 */
export function noContentResponse(headers?: HeadersInit): Response {
  return new Response(null, { status: 204, headers });
}

/**
 * Error envelope generator matching API_SPEC.md
 */
export function errorResponse(
  error: unknown,
  context?: {
    requestId?: string;
    userId?: string;
    route?: string;
    method?: string;
  },
): Response {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields && Object.keys(error.fields).length > 0
            ? { fields: error.fields }
            : {}),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof z.ZodError) {
    const { message, fields } = formatZodError(error);
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message,
          fields,
        },
      },
      { status: 400 },
    );
  }

  // Unexpected internal server error: log with unique ID, do not leak internal stack or sensitive data
  const requestId = context?.requestId || crypto.randomUUID();
  console.error(
    `[Internal Server Error] [requestId: ${requestId}]`,
    error instanceof Error ? error.stack : error,
  );

  // Capture in monitoring subsystem
  void captureException(error, {
    requestId,
    userId: context?.userId,
    route: context?.route,
    method: context?.method,
  });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL",
        message: "An unexpected error occurred. Please try again later.",
      },
    },
    { status: 500 },
  );
}

export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid JSON body in request", {
      status: 400,
    });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw AppError.fromZodError(result.error);
  }
  return result.data;
}

export function parseRequestQuery<T>(
  request: Request,
  schema: z.ZodType<T>,
): T {
  const url = new URL(request.url);
  const rawParams: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams.entries()) {
    const existing = rawParams[key];
    if (existing === undefined) {
      rawParams[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      rawParams[key] = [existing, value];
    }
  }

  const result = schema.safeParse(rawParams);
  if (!result.success) {
    throw AppError.fromZodError(result.error);
  }
  return result.data;
}

export async function parseRequestParams<T>(
  params: Promise<Record<string, string | string[] | undefined>> | undefined,
  schema: z.ZodType<T>,
): Promise<T> {
  const resolvedParams = params ? await params : {};
  const result = schema.safeParse(resolvedParams);
  if (!result.success) {
    throw AppError.fromZodError(result.error);
  }
  return result.data;
}

export interface ApiHandlerContext {
  request: Request;
  user: User;
  userId: string;
  params: Promise<Record<string, string | string[] | undefined>>;
  parseBody: <T>(schema: z.ZodType<T>) => Promise<T>;
  parseQuery: <T>(schema: z.ZodType<T>) => T;
  parseParams: <T>(schema: z.ZodType<T>) => Promise<T>;
}

export interface RouteContext {
  params?: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Higher-order wrapper for Next.js App Router route handlers.
 * Enforces session authentication, provides validation helpers, and converts AppError to envelopes.
 */
export function apiHandler(
  handler: (context: ApiHandlerContext) => Promise<Response>,
) {
  return async (
    request: Request,
    routeContext?: RouteContext,
  ): Promise<Response> => {
    let currentUser: User | null = null;
    try {
      currentUser = await getSessionUser();
      if (!currentUser) {
        throw AppError.unauthenticated();
      }

      const paramsPromise = routeContext?.params ?? Promise.resolve({});

      const context: ApiHandlerContext = {
        request,
        user: currentUser,
        userId: currentUser.id,
        params: paramsPromise,
        parseBody: (schema) => parseRequestBody(request, schema),
        parseQuery: (schema) => parseRequestQuery(request, schema),
        parseParams: (schema) => parseRequestParams(paramsPromise, schema),
      };

      return await handler(context);
    } catch (error) {
      let route: string | undefined;
      try {
        route = new URL(request.url).pathname;
      } catch {
        // ignore malformed url
      }
      return errorResponse(error, {
        userId: currentUser?.id,
        route,
        method: request.method,
      });
    }
  };
}
